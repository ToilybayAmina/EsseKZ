import 'dotenv/config';

// Read the local key without printing it. By default only list models.
// --generate sends ONE short, real request, without retries or saving an essay.
// Neither mode edits .env or changes the user's Google project.
const key = process.env.GEMINI_API_KEY?.trim();
const model = (process.env.GEMINI_MODEL?.trim() || 'gemini-2.5-flash').replace(/^models\//, '');
function reportFailure(body) {
  const statuses = [
    'INVALID_ARGUMENT',
    'UNAUTHENTICATED',
    'PERMISSION_DENIED',
    'NOT_FOUND',
    'RESOURCE_EXHAUSTED',
    'FAILED_PRECONDITION',
    'INTERNAL',
    'UNAVAILABLE',
  ];
  const reasons = [
    'API_KEY_INVALID',
    'API_KEY_EXPIRED',
    'API_KEY_SERVICE_BLOCKED',
    'API_KEY_HTTP_REFERRER_BLOCKED',
    'API_KEY_IP_ADDRESS_BLOCKED',
    'SERVICE_DISABLED',
    'BILLING_DISABLED',
    'CONSUMER_INVALID',
  ];
  console.log(
    `GOOGLE_STATUS: ${statuses.includes(body.error?.status) ? body.error.status : 'UNKNOWN'}`,
  );
  const safeReasons = Array.isArray(body.error?.details)
    ? body.error.details
        .map((detail) => detail?.reason)
        .filter((reason) => reasons.includes(reason))
    : [];
  if (safeReasons.length) console.log(`GOOGLE_REASON: ${safeReasons.join(', ')}`);
}
function reportTransport(error) {
  const allowed = [
    'ENOTFOUND',
    'EAI_AGAIN',
    'ECONNREFUSED',
    'ECONNRESET',
    'ETIMEDOUT',
    'UND_ERR_CONNECT_TIMEOUT',
    'UND_ERR_HEADERS_TIMEOUT',
    'UND_ERR_SOCKET',
    'CERT_HAS_EXPIRED',
    'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
    'SELF_SIGNED_CERT_IN_CHAIN',
    'DEPTH_ZERO_SELF_SIGNED_CERT',
  ];
  const code = error?.cause?.code || error?.code;
  const timedOut = ['TimeoutError', 'AbortError'].includes(error?.name);
  console.log(
    `NETWORK_ERROR: ${timedOut ? 'GEMINI_TIMEOUT' : allowed.includes(code) ? code : 'FETCH_FAILED'}`,
  );
  // Never print error.message, stack, URL, headers or the raw provider body.
}
if (!key) {
  console.log('KEY_PRESENT: no — GEMINI_API_KEY .env файлына енгізілмеген.');
  process.exitCode = 1;
} else {
  console.log('KEY_PRESENT: yes (мәні жасырылған)');
  console.log(
    `CONFIGURED_MODEL: ${/^[a-zA-Z0-9._-]+$/.test(model) ? model : '[invalid model name]'}`,
  );
  if (process.argv.includes('--generate')) {
    const started = Date.now();
    console.log('GENERATION_PROBE: one short request, 45-second timeout');
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
          signal: AbortSignal.timeout(45000),
          body: JSON.stringify({
            systemInstruction: {
              parts: [
                { text: 'Қазақ тілінде ғана жауап бер. JSON қайтар: title, essay, wordCount.' },
              ],
            },
            contents: [
              { role: 'user', parts: [{ text: 'Қазақ тілі туралы бір ғана қысқа сөйлем жаз.' }] },
            ],
            generationConfig: {
              maxOutputTokens: 1024,
              responseMimeType: 'application/json',
              responseSchema: {
                type: 'OBJECT',
                properties: {
                  title: { type: 'STRING' },
                  essay: { type: 'STRING' },
                  wordCount: { type: 'INTEGER' },
                },
                required: ['title', 'essay', 'wordCount'],
              },
            },
          }),
        },
      );
      console.log(`GENERATION_HTTP: ${response.status}`);
      let body;
      try {
        body = await response.json();
      } catch (error) {
        if (error.name === 'SyntaxError') body = {};
        else throw error;
      }
      if (!response.ok) {
        reportFailure(body);
        process.exitCode = 1;
      } else {
        const text = body.candidates?.[0]?.content?.parts
          ?.filter((part) => !part.thought)
          .map((part) => part.text || '')
          .join('');
        let valid = false;
        try {
          const answer = JSON.parse(text);
          valid =
            typeof answer.title === 'string' &&
            typeof answer.essay === 'string' &&
            answer.essay.trim().length > 0 &&
            Number.isInteger(answer.wordCount);
        } catch {}
        console.log(
          `GENERATION_RESULT: ${valid ? 'valid JSON; text received' : 'empty or invalid JSON response'}`,
        );
        if (!valid) process.exitCode = 1;
      }
    } catch (error) {
      reportTransport(error);
      process.exitCode = 1;
    } finally {
      console.log(`ELAPSED_SECONDS: ${Math.round((Date.now() - started) / 1000)}`);
    }
  } else {
    try {
      const models = [];
      let pageToken = '';
      let pages = 0;
      do {
        const url = new URL('https://generativelanguage.googleapis.com/v1beta/models');
        url.searchParams.set('pageSize', '100');
        if (pageToken) url.searchParams.set('pageToken', pageToken);
        const response = await fetch(url, {
          headers: { 'x-goog-api-key': key },
          signal: AbortSignal.timeout(20000),
        });
        const body = await response.json().catch(() => ({}));
        console.log(`GOOGLE_HTTP: ${response.status}`);
        if (!response.ok) {
          reportFailure(body);
          console.log('Бұл нәтижеде API кілті жоқ. Осы хабарламаны көмекке жіберуге болады.');
          process.exitCode = 1;
          break;
        }
        for (const entry of body.models || []) {
          if (
            entry.supportedGenerationMethods?.includes('generateContent') &&
            /^models\/[a-zA-Z0-9._-]+$/.test(entry.name)
          )
            models.push(entry.name.slice(7));
        }
        pageToken = body.nextPageToken || '';
        pages++;
        if (pages >= 10 && pageToken) throw new Error('PaginationLimit');
      } while (pageToken);
      if (!process.exitCode) {
        console.log(`MODEL_AVAILABLE: ${models.includes(model) ? 'yes' : 'no'}`);
        console.log('AVAILABLE_MODELS:');
        models.forEach((name) => console.log(`  ${name}`));
        if (!models.includes(model))
          console.log('Тізімдегі мәтін жазатын модельді GEMINI_MODEL ретінде таңдаңыз.');
      }
    } catch (error) {
      reportTransport(error);
      process.exitCode = 1;
    }
  }
}
