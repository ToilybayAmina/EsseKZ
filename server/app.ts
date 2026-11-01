import express from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { rateLimit, ipKeyGenerator } from 'express-rate-limit';
import { z } from 'zod';
import { randomUUID, randomInt } from 'node:crypto';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { smtpMailer, type Mailer } from './mail.ts';
import PDFDocument from 'pdfkit';
import { Document, Packer, Paragraph, TextRun, AlignmentType } from 'docx';
import type { Database } from './db.ts';
import { hashPassword, verifyPassword, newToken, tokenHash } from './auth.ts';
import { generateEssay, ServiceError } from './gemini.ts';
import { parametersSchema, countWords } from '../shared/schema.ts';
import { splitParagraphs } from '../shared/essay-format.ts';

const passwordSchema = z.string().min(8).max(128);
const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z
    .email()
    .max(254)
    .transform((v) => v.toLowerCase()),
  password: passwordSchema,
});
const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
};
const idSchema = z.uuid();
export function createApp(db: Database, mailer: Mailer = smtpMailer()) {
  const app = express();
  app.disable('x-powered-by');
  if (Number(process.env.TRUST_PROXY_HOPS) > 0)
    app.set('trust proxy', Number(process.env.TRUST_PROXY_HOPS));
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:'],
          fontSrc: ["'self'"],
          connectSrc: ["'self'"],
          upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
        },
      },
    }),
  );
  app.use(express.json({ limit: '100kb' }), cookieParser());
  const origin = process.env.APP_ORIGIN || 'http://localhost:5173';
  app.use('/api', (req, res, next) => {
    // Same-origin frontend, including Vite's proxy. Reject cross-origin mutations.
    if (req.headers.origin && req.headers.origin !== origin)
      return res.status(403).json({ error: 'Бұл сұрау көзіне рұқсат берілмеген.' });
    res.setHeader('Cache-Control', 'no-store');
    next();
  });
  const authLimit = rateLimit({
    windowMs: 60000,
    limit: 10,
    keyGenerator: (req) => `${ipKeyGenerator(req.ip || '127.0.0.1')}:${req.baseUrl}`,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: 'Сұрау саны шектен асты. Бір минуттан кейін қайталаңыз.' },
  });
  const generationLimit = rateLimit({
    windowMs: 60000,
    limit: 10,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: 'Минутына 10 сұрауға дейін. Сәл күтіңіз.' },
  });
  app.use(
    [
      '/api/auth/login',
      '/api/auth/register',
      '/api/auth/forgot-password',
      '/api/auth/reset-password',
      '/api/auth/verify-registration',
    ],
    authLimit,
  );
  app.use('/api', async (req, res, next) => {
    const token = req.cookies.essekz_session;
    if (typeof token === 'string') {
      const { rows } = await db.query(
        'SELECT u.id,u.email,u.name,u.created_at FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>NOW()',
        [tokenHash(token)],
      );
      if (rows[0]) res.locals.user = rows[0];
    }
    next();
  });
  const requireUser: express.RequestHandler = (_req, res, next) =>
    res.locals.user
      ? next()
      : void res.status(401).json({ error: 'Алдымен аккаунтыңызға кіріңіз.' });
  async function session(userId: string, res: express.Response) {
    const token = newToken();
    await db.query(
      "INSERT INTO sessions(token_hash,user_id,expires_at) VALUES($1,$2,NOW()+INTERVAL '7 days')",
      [tokenHash(token), userId],
    );
    res.cookie('essekz_session', token, { ...cookieOptions, maxAge: 7 * 86400000 });
  }
  app.get('/api/health', async (_req, res) => {
    await db.query('SELECT 1');
    res.json({
      status: 'ok',
      database: 'connected',
      aiConfigured: Boolean(process.env.GEMINI_API_KEY),
      passwordResetConfigured: mailer.configured,
      registrationConfigured: mailer.configured,
    });
  });
  app.get('/api/auth/me', (_req, res) => res.json({ user: res.locals.user || null }));
  const verificationSchema = z.object({
    challengeId: z.uuid(),
    code: z.string().regex(/^\d{6}$/),
  });
  async function sendCode(
    email: string,
    purpose: 'register' | 'reset',
    details: { name?: string; passwordHash?: string; userId?: string } = {},
    deliver = true,
  ) {
    if (!mailer.configured)
      throw new ServiceError(503, 'Пошта қызметі әлі бапталмаған. Растау коды жіберілмейді.');
    const id = randomUUID();
    const code = randomInt(0, 1000000).toString().padStart(6, '0');
    await db.query('DELETE FROM email_codes WHERE expires_at<NOW()');
    // One active code per email and purpose; resends are limited across IPs too.
    const { rows } = await db.query(
      `INSERT INTO email_codes(id,email,purpose,code_hash,name,password_hash,user_id)
       VALUES($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT(email,purpose) DO UPDATE SET
         id=EXCLUDED.id,code_hash=EXCLUDED.code_hash,name=EXCLUDED.name,
         password_hash=EXCLUDED.password_hash,user_id=EXCLUDED.user_id,
         attempts=0,consumed_at=NULL,created_at=NOW(),expires_at=EXCLUDED.expires_at
       WHERE email_codes.created_at < NOW()-INTERVAL '1 minute' RETURNING id`,
      [
        id,
        email,
        purpose,
        tokenHash(`${id}:${code}`),
        details.name || null,
        details.passwordHash || null,
        details.userId || null,
      ],
    );
    if (!rows.length) throw new ServiceError(429, 'Жаңа кодты бір минуттан кейін сұраңыз.');
    try {
      if (deliver) await mailer.send({ email, code, purpose });
    } catch {
      await db.query('DELETE FROM email_codes WHERE id=$1', [id]);
      throw new ServiceError(503, 'Пошта қызметі уақытша қолжетімсіз. Кейінірек қайталаңыз.');
    }
    return id;
  }
  async function consumeCode(challengeId: string, code: string, purpose: string) {
    const hash = tokenHash(`${challengeId}:${code}`);
    // Increment attempts and consume a matching code in the same atomic update.
    const { rows } = await db.query(
      `UPDATE email_codes SET attempts=attempts+1,
         consumed_at=CASE WHEN code_hash=$2 THEN NOW() ELSE NULL END
       WHERE id=$1 AND purpose=$3 AND consumed_at IS NULL AND expires_at>NOW() AND attempts<5
       RETURNING *, code_hash=$2 AS valid`,
      [challengeId, hash, purpose],
    );
    if (!rows[0]?.valid)
      throw new ServiceError(
        400,
        'Код қате, мерзімі аяқталған немесе қолданылған. Жаңа код сұраңыз.',
      );
    return rows[0];
  }
  app.post('/api/auth/register', async (req, res) => {
    const data = registerSchema.parse(req.body);
    const existing = await db.query('SELECT id FROM users WHERE email=$1', [data.email]);
    if (existing.rows.length)
      throw new ServiceError(409, 'Бұл email тіркелген. Аккаунтыңызға кіріңіз.');
    const challengeId = await sendCode(data.email, 'register', {
      name: data.name,
      passwordHash: await hashPassword(data.password),
    });
    res
      .status(202)
      .json({ challengeId, message: 'Поштаңызға 6 таңбалы код жіберілді. Код 10 минут жарамды.' });
  });
  app.post('/api/auth/verify-registration', async (req, res) => {
    const { challengeId, code } = verificationSchema.parse(req.body);
    const pending = await consumeCode(challengeId, code, 'register');
    const id = randomUUID();
    try {
      await db.query('INSERT INTO users(id,name,email,password_hash) VALUES($1,$2,$3,$4)', [
        id,
        pending.name,
        pending.email,
        pending.password_hash,
      ]);
    } catch (error) {
      if ((error as { code?: string }).code === '23505')
        throw new ServiceError(409, 'Бұл email тіркелген. Аккаунтыңызға кіріңіз.');
      throw error;
    }
    await db.query('DELETE FROM email_codes WHERE id=$1', [challengeId]);
    await session(id, res);
    const { rows } = await db.query('SELECT id,name,email,created_at FROM users WHERE id=$1', [id]);
    res.status(201).json({ user: rows[0] });
  });
  app.post('/api/auth/login', async (req, res) => {
    const data = registerSchema.pick({ email: true, password: true }).parse(req.body);
    const { rows } = await db.query('SELECT * FROM users WHERE email=$1', [data.email]);
    // Always derive a key to avoid a fast path for unknown addresses.
    const dummy = 'dummysalt:' + '00'.repeat(64);
    const valid = await verifyPassword(data.password, rows[0]?.password_hash || dummy);
    if (!rows[0] || !valid) throw new ServiceError(401, 'Email немесе құпия сөз дұрыс емес.');
    await session(rows[0].id, res);
    const { password_hash, ...user } = rows[0];
    res.json({ user });
  });
  app.post('/api/auth/logout', async (req, res) => {
    if (req.cookies.essekz_session)
      await db.query('DELETE FROM sessions WHERE token_hash=$1', [
        tokenHash(req.cookies.essekz_session),
      ]);
    res.clearCookie('essekz_session', cookieOptions).json({ ok: true });
  });
  app.put('/api/auth/profile', requireUser, async (req, res) => {
    const { name } = registerSchema.pick({ name: true }).parse(req.body);
    const { rows } = await db.query(
      'UPDATE users SET name=$1 WHERE id=$2 RETURNING id,name,email,created_at',
      [name, res.locals.user.id],
    );
    res.json({ user: rows[0] });
  });
  app.post('/api/auth/forgot-password', async (req, res) => {
    const { email } = registerSchema.pick({ email: true }).parse(req.body);
    if (!mailer.configured)
      throw new ServiceError(503, 'Құпия сөзді қалпына келтіру үшін пошта қызметі әлі қосылмаған.');
    const { rows } = await db.query('SELECT id FROM users WHERE email=$1', [email]);
    const challengeId = await sendCode(email, 'reset', { userId: rows[0]?.id }, Boolean(rows[0]));
    res.json({
      challengeId,
      message: 'Осы email тіркелген болса, растау коды жіберілді. Код 10 минут жарамды.',
    });
  });
  app.post('/api/auth/reset-password', async (req, res) => {
    if (req.body?.challengeId !== undefined || req.body?.code !== undefined) {
      const { challengeId, code, password } = verificationSchema
        .extend({ password: passwordSchema })
        .parse(req.body);
      const passwordHash = await hashPassword(password);
      const pending = await consumeCode(challengeId, code, 'reset');
      if (!pending.user_id)
        throw new ServiceError(
          400,
          'Код қате, мерзімі аяқталған немесе қолданылған. Жаңа код сұраңыз.',
        );
      await db.query(
        `WITH changed AS (UPDATE users SET password_hash=$2 WHERE id=$1 RETURNING id),
         old_links AS (DELETE FROM password_resets WHERE user_id IN (SELECT id FROM changed)),
         codes AS (DELETE FROM email_codes WHERE user_id IN (SELECT id FROM changed))
         DELETE FROM sessions WHERE user_id IN (SELECT id FROM changed)`,
        [pending.user_id, passwordHash],
      );
      return res
        .clearCookie('essekz_session', cookieOptions)
        .json({ message: 'Құпия сөз жаңартылды. Қайта кіріңіз.' });
    }
    const { token, password } = z
      .object({ token: z.string().regex(/^[a-f0-9]{64}$/), password: passwordSchema })
      .parse(req.body);
    const passwordHash = await hashPassword(password);
    const { rows } = await db.query(
      `WITH consumed AS (DELETE FROM password_resets WHERE token_hash=$1 AND expires_at>NOW() RETURNING user_id), changed AS (UPDATE users SET password_hash=$2 WHERE id IN (SELECT user_id FROM consumed) RETURNING id), codes AS (DELETE FROM email_codes WHERE user_id IN (SELECT id FROM changed)), other_links AS (DELETE FROM password_resets WHERE user_id IN (SELECT id FROM changed) AND token_hash<>$1), revoked AS (DELETE FROM sessions WHERE user_id IN (SELECT id FROM changed)) SELECT id FROM changed`,
      [tokenHash(token), passwordHash],
    );
    if (!rows.length)
      throw new ServiceError(400, 'Сілтеменің мерзімі аяқталған немесе ол қолданылған.');
    res
      .clearCookie('essekz_session', cookieOptions)
      .json({ message: 'Құпия сөз жаңартылды. Қайта кіріңіз.' });
  });
  app.use('/api/essays', requireUser);
  async function insertEssay(
    data: z.infer<typeof parametersSchema>,
    text: string,
    source: string,
    userId: string,
  ) {
    const { rows } = await db.query(
      `INSERT INTO essays(id,user_id,title,thesis,essay_text,essay_type,style,word_count,target_word_count,audience,arguments_count,include_counterargument,include_sources,source) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
      [
        randomUUID(),
        userId,
        data.title,
        data.thesis,
        text,
        data.essayType,
        data.style,
        countWords(text),
        data.targetWordCount,
        data.audience,
        data.argumentsCount,
        data.includeCounterargument,
        data.includeSources,
        source,
      ],
    );
    return rows[0];
  }
  let activeGenerations = 0;
  app.post('/api/essays/generate', generationLimit, async (req, res) => {
    const params = parametersSchema.parse(req.body);
    if (activeGenerations >= 3)
      throw new ServiceError(429, 'Сервер бос емес. Сәл кейін қайталаңыз.');
    activeGenerations++;
    try {
      const result = await generateEssay(params);
      res.status(201).json({
        essay: await insertEssay(
          { ...params, title: result.title },
          result.essay,
          'gemini',
          res.locals.user.id,
        ),
      });
    } finally {
      activeGenerations--;
    }
  });
  app.post('/api/essays', async (req, res) => {
    const data = parametersSchema
      .extend({ essayText: z.string().trim().min(1).max(30000) })
      .parse(req.body);
    res
      .status(201)
      .json({ essay: await insertEssay(data, data.essayText, 'manual', res.locals.user.id) });
  });
  app.get('/api/essays', async (req, res) => {
    const query = z
      .object({
        search: z.string().max(200).default(''),
        type: z.string().max(80).default(''),
        offset: z.coerce.number().int().min(0).max(100000).default(0),
      })
      .parse(req.query);
    const { rows } = await db.query(
      `SELECT * FROM essays WHERE user_id=$1 AND (strpos(lower(title),lower($2))>0 OR strpos(lower(essay_text),lower($2))>0) AND ($3='' OR essay_type=$3) ORDER BY created_at DESC LIMIT 21 OFFSET $4`,
      [res.locals.user.id, query.search, query.type, query.offset],
    );
    res.json({ essays: rows.slice(0, 20), hasMore: rows.length > 20 });
  });
  app.get('/api/essays/:id', async (req, res) => {
    const id = idSchema.parse(req.params.id);
    const { rows } = await db.query('SELECT * FROM essays WHERE id=$1 AND user_id=$2', [
      id,
      res.locals.user.id,
    ]);
    if (!rows[0]) throw new ServiceError(404, 'Эссе табылмады.');
    res.json({ essay: rows[0] });
  });
  app.put('/api/essays/:id', async (req, res) => {
    const id = idSchema.parse(req.params.id);
    const data = z
      .object({
        title: z.string().trim().min(3).max(200),
        essayText: z.string().trim().min(1).max(30000),
      })
      .parse(req.body);
    const { rows } = await db.query(
      'UPDATE essays SET title=$1,essay_text=$2,word_count=$3,updated_at=NOW() WHERE id=$4 AND user_id=$5 RETURNING *',
      [data.title, data.essayText, countWords(data.essayText), id, res.locals.user.id],
    );
    if (!rows[0]) throw new ServiceError(404, 'Эссе табылмады.');
    res.json({ essay: rows[0] });
  });
  app.delete('/api/essays/:id', async (req, res) => {
    const id = idSchema.parse(req.params.id);
    const { rows } = await db.query('DELETE FROM essays WHERE id=$1 AND user_id=$2 RETURNING id', [
      id,
      res.locals.user.id,
    ]);
    if (!rows[0]) throw new ServiceError(404, 'Эссе табылмады.');
    res.json({ ok: true });
  });
  app.get('/api/essays/:id/export/:format', async (req, res) => {
    const id = idSchema.parse(req.params.id);
    const format = z.enum(['txt', 'pdf', 'docx']).parse(req.params.format);
    const { rows } = await db.query(
      'SELECT title,essay_text FROM essays WHERE id=$1 AND user_id=$2',
      [id, res.locals.user.id],
    );
    if (!rows[0]) throw new ServiceError(404, 'Эссе табылмады.');
    const essay = rows[0];
    res.setHeader('Content-Disposition', `attachment; filename="EsseKZ-${id}.${format}"`);
    if (format === 'txt')
      return res.type('text/plain; charset=utf-8').send(`${essay.title}\n\n${essay.essay_text}`);
    if (format === 'docx') {
      const doc = new Document({
        sections: [
          {
            properties: {
              page: {
                size: { width: 11906, height: 16838 },
                margin: { top: 1134, bottom: 1134, left: 1701, right: 850 },
              },
            },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { after: 280 },
                children: [
                  new TextRun({ text: essay.title, bold: true, font: 'Times New Roman', size: 28 }),
                ],
              }),
              ...splitParagraphs(essay.essay_text).map(
                (text: string) =>
                  new Paragraph({
                    alignment: AlignmentType.JUSTIFIED,
                    indent: { firstLine: 709 },
                    spacing: { after: 140, line: 360 },
                    children: [new TextRun({ text, font: 'Times New Roman', size: 28 })],
                  }),
              ),
            ],
          },
        ],
      });
      return res
        .type('application/vnd.openxmlformats-officedocument.wordprocessingml.document')
        .send(await Packer.toBuffer(doc));
    }
    const font = process.env.PDF_FONT_PATH || path.resolve('assets/fonts/DejaVuSerif.ttf');
    if (!existsSync(font))
      throw new ServiceError(503, 'PDF қарпі табылмады. Сервер баптауын тексеріңіз.');
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 56, bottom: 56, left: 85, right: 42 },
    });
    res.type('application/pdf');
    doc.on('error', () => res.destroy());
    doc.pipe(res);
    doc.font(font).fontSize(14).text(essay.title, { align: 'center' }).moveDown();
    const paragraphs = splitParagraphs(essay.essay_text);
    paragraphs.forEach((paragraph, index) => {
      doc.text(paragraph, { align: 'justify', lineGap: 7, indent: 35.43 });
      if (index < paragraphs.length - 1) doc.moveDown(0.5);
    });
    doc.end();
  });
  app.use('/api', (_req, res) => res.status(404).json({ error: 'API мекенжайы табылмады.' }));
  const dist = path.resolve('dist');
  if (existsSync(dist)) {
    app.use(express.static(dist));
    app.get('/{*path}', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
  }
  app.use(
    (error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      if (res.headersSent) return res.end();
      if (error instanceof z.ZodError)
        return res
          .status(400)
          .json({ error: 'Енгізілген деректерді тексеріңіз. Барлық өрісті дұрыс толтырыңыз.' });
      if (error instanceof ServiceError)
        return res.status(error.status).json({ error: error.message });
      if (error instanceof SyntaxError)
        return res.status(400).json({ error: 'Сұрау форматы дұрыс емес.' });
      console.error('Request failed:', error instanceof Error ? error.name : 'UnknownError');
      res.status(500).json({ error: 'Серверде қате пайда болды. Кейінірек қайталаңыз.' });
    },
  );
  return app;
}
