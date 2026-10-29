import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import { randomUUID } from 'node:crypto';
import { openDatabase, type Database } from '../server/db.ts';
import { createApp } from '../server/app.ts';
import { defaults } from '../shared/schema.ts';
import { tokenHash } from '../server/auth.ts';

let db: Database;
let server: Server;
let base: string;
let cookie = '';
let essayId: string;
let userId: string;
const sample =
  'Қазақ тілінде еркін жазу ойды жүйелеуден басталады. Әр адам өз пікірін нақты дәлелмен жеткізе алады. Ана тілімізді құрметтеу — күнделікті ізденіс пен жауапкершілік.';
async function request(url: string, method = 'GET', body?: unknown, session = cookie) {
  return fetch(base + url, {
    method,
    headers: { 'Content-Type': 'application/json', Cookie: session },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}
before(async () => {
  delete process.env.GEMINI_API_KEY;
  delete process.env.SMTP_HOST;
  db = await openDatabase(process.env.TEST_DATABASE_URL || '', 'memory://');
  server = createApp(db).listen(0, '127.0.0.1');
  await new Promise<void>((r) => server.once('listening', r));
  base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
});
after(async () => {
  server?.closeAllConnections();
  await new Promise<void>((r) => server?.close(() => r()));
  await db?.close();
});
test('health checks a real PostgreSQL engine; private history requires login', async () => {
  const r = await request('/api/health');
  assert.equal(r.status, 200);
  assert.equal((await r.json()).database, 'connected');
  assert.equal((await request('/api/essays')).status, 401);
});
test('register sets HttpOnly session, duplicate registration and wrong password fail', async () => {
  const r = await request('/api/auth/register', 'POST', {
    name: 'Амина',
    email: 'amina@example.test',
    password: 'LongTestPassword123',
  });
  assert.equal(r.status, 201);
  assert.match(r.headers.get('set-cookie')!, /HttpOnly/);
  cookie = r.headers.get('set-cookie')!.split(';')[0];
  const user = (await r.json()).user;
  userId = user.id;
  assert.equal(user.name, 'Амина');
  assert.equal(user.password_hash, undefined);
  assert.equal(
    (
      await request('/api/auth/register', 'POST', {
        name: 'Амина',
        email: 'amina@example.test',
        password: 'LongTestPassword123',
      })
    ).status,
    409,
  );
  assert.equal(
    (
      await request('/api/auth/login', 'POST', {
        email: 'amina@example.test',
        password: 'WrongPassword',
      })
    ).status,
    401,
  );
  const me = await request('/api/auth/me');
  assert.equal((await me.json()).user.email, 'amina@example.test');
});
test('Gemini stays disconnected; no fabricated text is saved', async () => {
  const r = await request('/api/essays/generate', 'POST', {
    ...defaults,
    title: 'Білім — болашақтың кілті',
  });
  assert.equal(r.status, 503);
  assert.match((await r.json()).error, /Gemini/);
  assert.equal((await (await request('/api/essays')).json()).essays.length, 0);
});
test('manual essay persists, search/filter/edit and Unicode word counts work', async () => {
  const r = await request('/api/essays', 'POST', {
    ...defaults,
    title: 'Ана тілім',
    essayText: sample,
  });
  assert.equal(r.status, 201);
  const essay = (await r.json()).essay;
  essayId = essay.id;
  assert.equal(essay.source, 'manual');
  assert.ok(essay.word_count > 10);
  assert.equal(
    (await (await request('/api/essays?search=' + encodeURIComponent('тілім'))).json()).essays
      .length,
    1,
  );
  assert.equal(
    (await (await request('/api/essays?type=' + encodeURIComponent('Тарихи'))).json()).essays
      .length,
    0,
  );
  const update = await request(`/api/essays/${essayId}`, 'PUT', {
    title: 'Тіл — ұлттың жаны',
    essayText: sample + '\n\nҰлттық құндылықтарды сақтайық.',
  });
  assert.equal(update.status, 200);
  assert.match((await update.json()).essay.essay_text, /Ұлттық/);
  const { rows } = await db.query('SELECT source,essay_text FROM essays WHERE id=$1', [essayId]);
  assert.equal(rows[0].source, 'manual');
  assert.match(rows[0].essay_text, /Ұлттық/);
});
test('all export formats contain real documents; plaintext preserves Kazakh', async () => {
  const txt = await request(`/api/essays/${essayId}/export/txt`);
  assert.match(await txt.text(), /Қазақ тілінде/);
  const pdf = await request(`/api/essays/${essayId}/export/pdf`);
  assert.equal(pdf.status, 200);
  const pdfBytes = Buffer.from(await pdf.arrayBuffer());
  assert.equal(pdfBytes.subarray(0, 4).toString(), '%PDF');
  assert.ok(pdfBytes.length > 5000);
  const docx = await request(`/api/essays/${essayId}/export/docx`);
  assert.equal(docx.status, 200);
  const docBytes = Buffer.from(await docx.arrayBuffer());
  assert.equal(docBytes.subarray(0, 2).toString(), 'PK');
  assert.ok(docBytes.length > 3000);
});
test('ownership, input validation, and cross-origin mutations are enforced', async () => {
  const other = await request('/api/auth/register', 'POST', {
    name: 'Екінші',
    email: 'other@example.test',
    password: 'OtherTestPassword123',
  });
  const otherCookie = other.headers.get('set-cookie')!.split(';')[0];
  for (const method of ['GET', 'DELETE'])
    assert.equal(
      (await request(`/api/essays/${essayId}`, method, undefined, otherCookie)).status,
      404,
    );
  assert.equal(
    (
      await request(
        `/api/essays/${essayId}`,
        'PUT',
        { title: 'Өзгерту', essayText: sample },
        otherCookie,
      )
    ).status,
    404,
  );
  assert.equal(
    (await request('/api/essays/' + randomUUID() + '/export/txt', 'GET', undefined, otherCookie))
      .status,
    404,
  );
  assert.equal(
    (await request('/api/essays', 'POST', { ...defaults, title: 'x', essayText: '' })).status,
    400,
  );
  const cross = await fetch(base + '/api/auth/logout', {
    method: 'POST',
    headers: { Origin: 'https://untrusted.example', Cookie: cookie },
  });
  assert.equal(cross.status, 403);
});
test('password reset reports absent mail service and consumes real tokens atomically without sessions', async () => {
  const r = await request('/api/auth/forgot-password', 'POST', { email: 'amina@example.test' });
  assert.equal(r.status, 503);
  await db.query('DELETE FROM sessions WHERE user_id=$1', [userId]);
  const token = 'ab'.repeat(32);
  await db.query(
    "INSERT INTO password_resets(token_hash,user_id,expires_at) VALUES($1,$2,NOW()+INTERVAL '30 minutes')",
    [tokenHash(token), userId],
  );
  const reset = await request('/api/auth/reset-password', 'POST', {
    token,
    password: 'NewLongTestPassword123',
  });
  assert.equal(reset.status, 200);
  assert.equal(
    (
      await request('/api/auth/reset-password', 'POST', {
        token,
        password: 'AgainLongTestPassword123',
      })
    ).status,
    400,
  );
  // Authentication limiter uses a separate app instance to keep the test independent of previous requests.
  const { rows } = await db.query('SELECT password_hash FROM users WHERE id=$1', [userId]);
  const { verifyPassword } = await import('../server/auth.ts');
  assert.ok(await verifyPassword('NewLongTestPassword123', rows[0].password_hash));
});
