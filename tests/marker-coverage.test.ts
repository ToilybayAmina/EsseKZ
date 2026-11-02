import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaults } from '../shared/schema.ts';
import { createCompositionPlan } from '../server/composition.ts';
import { markerCoverageIssues, markerRequirements } from '../server/markers.ts';
import { generateEssay } from '../server/gemini.ts';
import { structuredFixture } from './essay-fixture.ts';

test('a marker-free essay cannot pass; evidence, reasoning and conclusion belong in their own sections', () => {
  const empty = {
    bodyParagraphs: ['Қазақ тілі ойды жеткізеді. Оны күнде қолданамыз.'],
    conclusion: 'Тілді сақтау ортақ міндет. Оны қолдану қажет.',
    counterargument: '',
  };
  assert.equal(markerCoverageIssues(empty, defaults, false).length, 4);
  const withMarkers = {
    ...empty,
    bodyParagraphs: [
      'Қазақша сөйлесу жақындастырады, өйткені ортақ сөз түсінікті. Мәселен, танысу сәлемнен басталады.',
    ],
    conclusion: 'Демек, тілдің орны күнделікті әрекеттен көрінеді. Оны қолдану керек.',
  };
  assert.deepEqual(markerCoverageIssues(withMarkers, defaults, false), []);
  assert.equal(
    markerCoverageIssues(
      {
        ...empty,
        conclusion: 'Мысалы, қазақша сөйлеу қажет. Өйткені бұл түсінікті. Демек, ой жеткізіледі.',
      },
      defaults,
      false,
    ).length,
    3,
  );
  assert.equal(
    markerCoverageIssues(
      { ...withMarkers, bodyParagraphs: ['«Мысалының» жалғауы бар. Өйткенінің жалғауы да бар.'] },
      defaults,
      false,
    ).length,
    3,
  );
});

test('marker roles follow genre and counterargument instead of requiring the same sequence', () => {
  const roles = (essayType: typeof defaults.essayType) =>
    markerRequirements({ ...defaults, essayType }, false).map((x) => x.role);
  assert.notDeepEqual(roles('Салыстырмалы'), roles('Баяндау'));
  assert.notDeepEqual(roles('Сипаттама'), roles('Академиялық'));
  const params = { ...defaults, includeCounterargument: true };
  const valid = structuredFixture(250);
  assert.ok(markerCoverageIssues(valid, params, true).some((x) => x.includes('Қарсы пікір')));
  valid.counterargument = 'Дегенмен, басқа ұстаным да бар. Оның шегін нақтылау қажет.';
  assert.deepEqual(markerCoverageIssues(valid, params, true), []);
  assert.ok(!markerRequirements(defaults, true).some((x) => x.choices.includes('Біріншіден')));
});

test('the provider repairs a missing marker without switching the existing composition plan', async () => {
  const valid = structuredFixture(250);
  const missing = { ...valid, conclusion: valid.conclusion.replace('Демек,', 'Қазақша') };
  let calls = 0;
  let instruction = '';
  const request = (async (_url, options) => {
    const payload = JSON.parse(String(options?.body));
    calls++;
    if (calls === 1) instruction = payload.systemInstruction.parts[0].text;
    else {
      assert.equal(instruction, payload.systemInstruction.parts[0].text);
      assert.match(payload.contents.at(-1).parts[0].text, /Қорытындыда.*маркер жоқ/);
      assert.ok(
        payload.contents.at(-1).parts[0].text.includes(createCompositionPlan(defaults, 1).path),
      );
    }
    return Response.json({
      candidates: [
        { content: { parts: [{ text: JSON.stringify(calls === 1 ? missing : valid) }] } },
      ],
    });
  }) as typeof fetch;
  const result = await generateEssay(defaults, {
    compositionVariation: 1,
    key: 'test-key',
    request,
    sleep: async () => assert.fail('No artificial wait on marker repair'),
  });
  assert.equal(calls, 2);
  assert.equal(result.wordCount, 250);
  assert.match(result.essay, /Демек/);
});

test('markers spread across body paragraphs and expanded alternatives count in context', () => {
  const draft = {
    bodyParagraphs: [
      'Мәселен, бір дәлел бар. Өйткені оның себебі түсінікті.',
      'Екінші ой өз алдына тұр. Оның байланысы көрсетілмеген.',
    ],
    conclusion: 'Демек, ой түйінделді.',
    counterargument: '',
  };
  assert.ok(markerCoverageIssues(draft, defaults, false).some((x) => x.includes('2-абзацында')));
  draft.bodyParagraphs[1] =
    'Басқаша айтқанда, екінші ой алдыңғысын түсіндіреді. Оның байланысы анық.';
  assert.deepEqual(markerCoverageIssues(draft, defaults, false), []);
});
