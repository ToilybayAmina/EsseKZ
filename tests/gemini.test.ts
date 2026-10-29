import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateEssay, qualityErrors, geminiHttpError } from '../server/gemini.ts';
import { defaults, countWords } from '../shared/schema.ts';

test('quality guard checks language, count, headings, and banned clichés', () => {
  assert.ok(qualityErrors('', 150).length >= 3);
  assert.ok(qualityErrors('Кіріспе\nҚазақ тілі', 150).some((s) => s.includes('тақырыпша')));
  assert.ok(qualityErrors('Бүгінгі таңда қазақ тілі', 150).some((s) => s.includes('клише')));
  assert.ok(qualityErrors('Only latin words', 150).some((s) => s.includes('әріп')));
  assert.equal(countWords('Қазақ тілі — ана тілім. 2026 жылы.'), 6);
});
test('missing key never invokes the provider', async () => {
  await assert.rejects(
    generateEssay(defaults, {
      key: '',
      request: async () => {
        throw new Error('Must not call provider');
      },
    }),
    /әлі қосылмаған/,
  );
});
test('provider retries 429/503 four total attempts with 5/10/15 second delays', async () => {
  let attempts = 0;
  const delays: number[] = [];
  const request = (async () => {
    attempts++;
    return new Response('{}', { status: attempts % 2 ? 429 : 503 });
  }) as typeof fetch;
  await assert.rejects(
    generateEssay(
      { ...defaults, title: 'Тіл' },
      {
        key: 'test-key',
        request,
        sleep: async (ms) => {
          delays.push(ms);
        },
      },
    ),
  );
  assert.equal(attempts, 4);
  assert.deepEqual(delays, [5000, 10000, 15000]);
});
test('structured provider JSON is validated and word count is computed on server', async () => {
  // Explicit test fixture, never used in the running application.
  const essay = Array(150).fill('Қазақша').join(' ');
  let prompt = '';
  const request = (async (_url, options) => {
    prompt = String(options?.body);
    return Response.json({
      candidates: [
        {
          content: {
            parts: [{ text: JSON.stringify({ title: 'Тіл байлығы', essay, wordCount: 999 }) }],
          },
        },
      ],
    });
  }) as typeof fetch;
  const r = await generateEssay(
    { ...defaults, title: 'Тіл байлығы', targetWordCount: 150 },
    { key: 'test-key', request },
  );
  assert.equal(r.wordCount, 150);
  assert.match(prompt, /Мысалы/);
  assert.match(prompt, /responseMimeType/);
});
test('invalid JSON and rejected quality never return a successful essay', async () => {
  let attempts = 0;
  const request = (async () => {
    attempts++;
    return Response.json({
      candidates: [
        {
          content: {
            parts: [
              {
                text:
                  attempts < 3
                    ? 'invalid JSON'
                    : JSON.stringify({ title: 'x', essay: 'Кіріспе\nShort', wordCount: 2 }),
              },
            ],
          },
        },
      ],
    });
  }) as typeof fetch;
  await assert.rejects(
    generateEssay(defaults, { key: 'test-key', request, sleep: async () => {} }),
  );
  assert.equal(attempts, 4);
});

test('invalid key and missing model fail once with an actionable error and no secret disclosure', async () => {
  for (const status of [400, 403, 404]) {
    const key = 'private-test-key-never-display';
    let attempts = 0;
    const request = (async () => {
      attempts++;
      return Response.json(
        {
          error: {
            message: `Sensitive provider message ${key}`,
            details: [{ reason: status === 400 ? 'API_KEY_INVALID' : 'OTHER' }],
          },
        },
        { status },
      );
    }) as typeof fetch;
    await assert.rejects(
      generateEssay(defaults, {
        key,
        request,
        sleep: async () => {
          throw new Error('Permanent errors must not retry');
        },
      }),
      (error: unknown) => {
        assert.ok(error instanceof Error);
        assert.match(error.message, new RegExp(`Google ${status}`));
        assert.ok(!error.message.includes(key));
        if (status === 404) assert.match(error.message, /GEMINI_MODEL/);
        return true;
      },
    );
    assert.equal(attempts, 1);
  }
});

test('provider precondition errors are distinguished from transient quota errors', () => {
  const error = geminiHttpError(400, { error: { status: 'FAILED_PRECONDITION' } });
  assert.match(error.message, /жоба немесе аймақ/);
  assert.equal(error.retryable, false);
  const quota = geminiHttpError(429, null);
  assert.match(quota.message, /квота/);
  assert.equal(quota.retryable, true);
});

test('timeouts and network failures fail once and preserve safe diagnostic categories', async () => {
  for (const [error, expected] of [
    [new DOMException('sensitive timeout text', 'TimeoutError'), 'GEMINI_TIMEOUT'],
    [new TypeError('sensitive request URL', { cause: { code: 'ECONNRESET' } }), 'ECONNRESET'],
    [
      new TypeError('sensitive request URL', {
        cause: { code: 'UNABLE_TO_VERIFY_LEAF_SIGNATURE' },
      }),
      'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
    ],
    [new Error('sensitive internal detail'), 'GEMINI_RESPONSE_ERROR'],
  ] as const) {
    let attempts = 0;
    await assert.rejects(
      generateEssay(defaults, {
        key: 'test-key',
        request: (async () => {
          attempts++;
          throw error;
        }) as typeof fetch,
        sleep: async () => assert.fail('Transport failure must not silently repeat'),
      }),
      (failure: unknown) => {
        assert.ok(failure instanceof Error);
        assert.ok(failure.message.includes(expected));
        assert.ok(!failure.message.includes('sensitive'));
        return true;
      },
    );
    assert.equal(attempts, 1);
  }
});

test('a sequence of invalid replies cannot run past the total request budget', async (t) => {
  let now = 0;
  t.mock.method(Date, 'now', () => now);
  let attempts = 0;
  await assert.rejects(
    generateEssay(defaults, {
      key: 'test-key',
      request: (async () => {
        attempts++;
        now += 45000;
        return Response.json({ candidates: [] });
      }) as typeof fetch,
      sleep: async (ms) => {
        now += ms;
      },
    }),
    /GEMINI_DEADLINE/,
  );
  assert.equal(attempts, 2);
});

test('rejected short draft is sent back with exact bounds and repaired without artificial retry waits', async () => {
  const shortEssay = Array(100).fill('Қазақша').join(' ');
  const validEssay = Array(250).fill('Қазақша').join(' ');
  let attempts = 0;
  const request = (async (_url, options) => {
    const payload = JSON.parse(String(options?.body));
    attempts++;
    assert.match(payload.systemInstruction.parts[0].text, /213–287/);
    assert.match(payload.contents[0].parts[0].text, /Тіл байлығы/);
    if (attempts === 2) {
      assert.equal(payload.contents[1].role, 'model');
      assert.equal(JSON.parse(payload.contents[1].parts[0].text).essay, shortEssay);
      assert.equal(payload.contents[2].role, 'user');
      assert.match(payload.contents[2].parts[0].text, /Сөз саны 100/);
      assert.match(payload.contents[2].parts[0].text, /213–287/);
    }
    return Response.json({
      candidates: [
        {
          content: {
            parts: [
              {
                text: JSON.stringify({
                  title: 'Тіл байлығы',
                  essay: attempts === 1 ? shortEssay : validEssay,
                  wordCount: 250,
                }),
              },
            ],
          },
        },
      ],
    });
  }) as typeof fetch;
  const result = await generateEssay(
    { ...defaults, title: 'Тіл байлығы' },
    {
      key: 'test-key',
      request,
      sleep: async () => assert.fail('Quality repair should start immediately'),
    },
  );
  assert.equal(attempts, 2);
  assert.equal(result.wordCount, 250);
  assert.equal(result.essay, validEssay);
});

test('four rejected drafts reveal the exact quality failure without loosening acceptance checks', async () => {
  let attempts = 0;
  const request = (async () => {
    attempts++;
    return Response.json({
      candidates: [
        {
          content: {
            parts: [{ text: JSON.stringify({ title: 'Тіл', essay: 'Қазақша', wordCount: 250 }) }],
          },
        },
      ],
    });
  }) as typeof fetch;
  await assert.rejects(
    generateEssay(defaults, { key: 'test-key', request, sleep: async () => {} }),
    /Сөз саны 1; талап 250 ±15%/,
  );
  assert.equal(attempts, 4);
});

test('Kazakh word count boundaries are inclusive and prohibited headings still fail', () => {
  for (const count of [213, 250, 287])
    assert.deepEqual(qualityErrors(Array(count).fill('Қазақша').join(' '), 250), []);
  for (const count of [212, 288])
    assert.ok(
      qualityErrors(Array(count).fill('Қазақша').join(' '), 250).some((issue) =>
        issue.includes('Сөз саны'),
      ),
    );
  assert.ok(
    qualityErrors('Кіріспе\n' + Array(249).fill('Қазақша').join(' '), 250).some((issue) =>
      issue.includes('тақырыпша'),
    ),
  );
});
