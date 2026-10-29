import 'dotenv/config';

// Read the local key without printing it. This command only lists models;
// it does not generate text, edit .env, or change the user's Google project.
const key = process.env.GEMINI_API_KEY?.trim();
const model = (process.env.GEMINI_MODEL?.trim() || 'gemini-2.5-flash').replace(/^models\//, '');
if (!key) {
  console.log('KEY_PRESENT: no — GEMINI_API_KEY .env файлына енгізілмеген.');
  process.exitCode = 1;
} else {
  console.log('KEY_PRESENT: yes (мәні жасырылған)');
  console.log(
    `CONFIGURED_MODEL: ${/^[a-zA-Z0-9._-]+$/.test(model) ? model : '[invalid model name]'}`,
  );
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
  } catch {
    console.log(
      'NETWORK_ERROR: Google-ға қосылу немесе жауапты оқу мүмкін болмады. Интернетті және жүйе уақытын тексеріңіз.',
    );
    process.exitCode = 1;
  }
}
