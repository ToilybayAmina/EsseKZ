import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaults, essayTypes, styles, audiences, wordOptions } from '../shared/schema.ts';
import { createCompositionPlan } from '../server/composition.ts';
import { structureGuidance, structureIssues } from '../server/essay-rules.ts';
import { markerIssues } from '../server/markers.ts';
import { generateEssay, qualityErrors } from '../server/gemini.ts';
import { structuredFixture } from './essay-fixture.ts';

test('every offered genre has distinct development; style and audience remain in the prompt', () => {
  const paths = new Set<string>();
  for (const essayType of essayTypes) {
    const plan = createCompositionPlan({ ...defaults, essayType }, 1);
    paths.add(plan.path);
    const prompt = structureGuidance({ ...defaults, essayType }, plan);
    assert.ok(prompt.includes(`Эссе түрі: ${essayType}`));
    assert.ok(prompt.includes(plan.path));
  }
  assert.equal(paths.size, essayTypes.length);
  for (const style of styles)
    for (const audience of audiences) {
      const params = { ...defaults, style, audience };
      const prompt = structureGuidance(params);
      assert.ok(prompt.includes(`Стиль: ${style}`));
      assert.ok(prompt.includes(`Аудитория: ${audience}`));
    }
  const narrative = structureGuidance({ ...defaults, essayType: 'Баяндау', style: 'Көркем' });
  const comparison = structureGuidance({ ...defaults, essayType: 'Салыстырмалы' });
  assert.match(narrative, /оқиға|өзгеріс/);
  assert.match(comparison, /екі нысанды|ортақ өлшем/i);
  assert.notEqual(narrative, comparison);
});

test('one filter combination permits multiple coherent plans without relaxing requested counts', () => {
  const plans = new Set(
    Array.from({ length: 27 }, (_, i) => {
      const { path, opening, ending } = createCompositionPlan(defaults, i);
      return JSON.stringify({ path, opening, ending });
    }),
  );
  assert.equal(plans.size, 27);
  for (const targetWordCount of wordOptions)
    for (const argumentsCount of [1, 3, 5]) {
      for (const includeCounterargument of [false, true]) {
        const plan = createCompositionPlan(
          { ...defaults, targetWordCount, argumentsCount, includeCounterargument },
          1,
        );
        const b = plan.budget;
        assert.equal(b.body.length, argumentsCount);
        assert.equal(
          b.introduction + b.conclusion + b.counterargument + b.body.reduce((a, v) => a + v, 0),
          targetWordCount,
        );
        assert.equal(b.counterargument > 0, includeCounterargument);
      }
    }
});

test('sources and counterargument choices affect guidance without inventing evidence', () => {
  const without = structureGuidance({ ...defaults, includeSources: false });
  const withSources = structureGuidance({
    ...defaults,
    includeSources: true,
    includeCounterargument: true,
  });
  assert.match(without, /Дереккөз опциясы өшірулі/);
  assert.match(withSources, /Дереккөз опциясы қосылған/);
  assert.match(withSources, /бір қарсы пікір/);
  assert.match(withSources, /ойдан/);
});

test('markers are optional, but wrong order, stacked markers and repeated conclusions are rejected', () => {
  const draft = structuredFixture(250);
  assert.deepEqual(structureIssues(draft, defaults, createCompositionPlan(defaults, 1)), []);
  assert.deepEqual(
    markerIssues(['Тіл ойды жеткізеді. Оның әсері күнделікті қарым-қатынастан көрінеді.'], ''),
    [],
  );
  assert.ok(markerIssues(['Біріншіден, дәлел. Оны ашу.'], 'Біріншіден, дәлел.', false).length);
  assert.ok(markerIssues(['Біріншіден, дәлел.', 'Үшіншіден, басқа дәлел.'], '').length);
  assert.ok(
    markerIssues([], 'Біріншіден, сонымен қатар, бұл ойды қарастырайық.').some((x) =>
      x.includes('тізбектемеңіз'),
    ),
  );
  assert.ok(
    markerIssues([], 'Қорыта айтқанда, бір ой. Қорытындылай келе, сол ой.').some((x) =>
      x.includes('қорытынды маркерлерін'),
    ),
  );
  assert.ok(markerIssues([], 'Қорытындылай келе, тіл қымбат.', false, false).length);
  assert.ok(
    markerIssues([], 'Айырмашылығы, кітап пайдалы.').some((x) => x.includes('толық сөйлем')),
  );
  assert.deepEqual(markerIssues([], 'Екі тәсілдің айырмашылығы олардың қолданылуында.'), []);
  assert.deepEqual(
    markerIssues([], 'Себебі тіл ойды жеткізеді. Сондықтан оны орнымен қолдану қажет.'),
    [],
  );
  assert.ok(
    qualityErrors('Қазіргі таңда қазақ тілі туралы ойланамыз.', 150).some((x) =>
      x.includes('клише'),
    ),
  );
  assert.equal(
    createCompositionPlan({ ...defaults, essayType: 'Баяндау', style: 'Көркем' }, 0)
      .allowOrdinalMarkers,
    false,
  );
  assert.equal(createCompositionPlan(defaults, 0).allowOrdinalMarkers, true);
});

test('quality repair retains one composition plan and removes the rejected marker scaffold', async () => {
  const valid = structuredFixture(250);
  const formulaic = {
    ...valid,
    bodyParagraphs: valid.bodyParagraphs.map(
      (p, i) => `${['Біріншіден', 'Екіншіден', 'Үшіншіден'][i]}, ${p}`,
    ),
    conclusion: `Қорытындылай келе, ${valid.conclusion}`,
  };
  let calls = 0;
  let instruction = '';
  const request = (async (_url, options) => {
    const payload = JSON.parse(String(options?.body));
    calls++;
    if (calls === 1) instruction = payload.systemInstruction.parts[0].text;
    else {
      assert.equal(payload.systemInstruction.parts[0].text, instruction);
      assert.match(payload.contents.at(-1).parts[0].text, /реттік маркер|қорытынды маркер/);
      assert.ok(
        payload.contents.at(-1).parts[0].text.includes(createCompositionPlan(defaults, 1).path),
      );
    }
    return Response.json({
      candidates: [
        { content: { parts: [{ text: JSON.stringify(calls === 1 ? formulaic : valid) }] } },
      ],
    });
  }) as typeof fetch;
  const result = await generateEssay(defaults, {
    key: 'test-key',
    compositionVariation: 1,
    request,
    sleep: async () => assert.fail('No pause on quality repair'),
  });
  assert.equal(calls, 2);
  assert.equal(result.wordCount, 250);
  assert.ok(!result.essay.includes('Біріншіден'));
});
