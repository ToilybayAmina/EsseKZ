import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaults, countWords } from '../shared/schema.ts';
import { splitParagraphs } from '../shared/essay-format.ts';
import { serializeEssay, structureGuidance, structureIssues } from '../server/essay-rules.ts';
import { markerGuidance, markerIssues } from '../server/markers.ts';
import { structuredFixture } from './essay-fixture.ts';
import { generateEssay } from '../server/gemini.ts';

test('three arguments produce five paragraphs without introducing or dropping words', () => {
  const draft = structuredFixture(250);
  draft.introduction = '  ' + draft.introduction.replace(' ', '\r\n') + '  ';
  const essay = serializeEssay(draft);
  assert.equal(countWords(essay), 250);
  assert.equal(splitParagraphs(essay).length, 5);
  assert.equal(essay.split('\n\n').length, 5);
  assert.deepEqual(structureIssues(draft, defaults), []);
});

test('argument counts and counterargument option determine structure', () => {
  const draft = structuredFixture(250);
  assert.ok(
    structureIssues(draft, { ...defaults, argumentsCount: 2 }).some((issue) =>
      issue.includes('дәл 2'),
    ),
  );
  assert.ok(
    structureIssues(draft, { ...defaults, includeCounterargument: true }).some((issue) =>
      issue.includes('Қарсы пікір'),
    ),
  );
  draft.counterargument =
    'Дегенмен, қарсы ұстаным болуы мүмкін. Оның шектеуін дәлелмен негіздеу қажет.';
  assert.deepEqual(structureIssues(draft, { ...defaults, includeCounterargument: true }), []);
  assert.equal(splitParagraphs(serializeEssay(draft)).length, 6);
  assert.ok(structureIssues(draft, defaults).some((issue) => issue.includes('сұралмаған')));
});

test('one-sentence paragraphs, section labels, and numbered lists cannot pass structure checks', () => {
  const draft = structuredFixture(250);
  draft.bodyParagraphs[1] = 'Екіншіден, бұл бір ғана сөйлем.';
  assert.ok(structureIssues(draft, defaults).some((issue) => issue.includes('3-абзацта')));
  draft.introduction = 'Кіріспе: ' + draft.introduction;
  draft.bodyParagraphs[0] = '1. ' + draft.bodyParagraphs[0];
  const issues = structureIssues(draft, defaults);
  assert.ok(issues.some((issue) => issue.includes('тақырыпша')));
  assert.ok(issues.some((issue) => issue.includes('тізім')));
});

test('markers follow their function, sequence and selected writing style', () => {
  const scientific = markerGuidance({ ...defaults, style: 'Ғылыми' });
  assert.match(scientific, /үшінші|бірінші жақ|«мен»/i);
  assert.match(scientific, /тек нақты тексерілген дерек/);
  assert.match(structureGuidance(defaults), /PEEL/);
  assert.match(structureGuidance(defaults), /Барлығы 5 бөлек абзац/);
  assert.match(
    structureGuidance({ ...defaults, includeCounterargument: true }),
    /Барлығы 6 бөлек абзац/,
  );
  assert.match(structureGuidance({ ...defaults, style: 'Көркем' }), /Бейнелі тіл/);
  assert.deepEqual(
    markerIssues(
      ['Біріншіден, дәлел. Ойды ашу.', 'Екіншіден, басқа дәлел. Оны түсіндіру.'],
      'Мысалы, бір ой. Нақты мысал ретінде, басқа ой.',
    ),
    [],
  );
  assert.ok(
    markerIssues(['Екіншіден, орын қате. Тағы сөйлем.'], '').some((issue) =>
      issue.includes('реттік маркер'),
    ),
  );
  assert.ok(
    markerIssues([], 'Мысалы, бір. Мысалы, екі. Мысалы, үш.').some((issue) =>
      issue.includes('қайталанған'),
    ),
  );
});

test('provider drafts with the wrong number of arguments are repaired before returning formatted text', async () => {
  const valid = structuredFixture(250);
  const wrong = { ...valid, bodyParagraphs: valid.bodyParagraphs.slice(0, 2) };
  let attempts = 0;
  const request = (async (_url, options) => {
    const payload = JSON.parse(String(options?.body));
    assert.equal(payload.generationConfig.responseSchema.properties.bodyParagraphs.type, 'ARRAY');
    attempts++;
    if (attempts === 2) assert.match(payload.contents.at(-1).parts[0].text, /дәл 3 керек/);
    return Response.json({
      candidates: [
        { content: { parts: [{ text: JSON.stringify(attempts === 1 ? wrong : valid) }] } },
      ],
    });
  }) as typeof fetch;
  const result = await generateEssay(defaults, {
    key: 'test-key',
    request,
    sleep: async () => assert.fail('No wait for structure repair'),
  });
  assert.equal(attempts, 2);
  assert.equal(splitParagraphs(result.essay).length, 5);
  assert.equal(result.wordCount, 250);
});
