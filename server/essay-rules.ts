import { z } from 'zod';
import type { Parameters } from '../shared/schema.ts';
import { normalizeParagraph } from '../shared/essay-format.ts';
import { markerGuidance, markerIssues } from './markers.ts';

export const structuredEssaySchema = z.object({
  title: z.string().trim().min(1).max(200),
  introduction: z.string().trim().min(1).max(10000),
  bodyParagraphs: z.array(z.string().trim().min(1).max(10000)).min(1).max(5),
  counterargument: z.string().trim().max(10000),
  conclusion: z.string().trim().min(1).max(10000),
  wordCount: z.number().int().nonnegative(),
});
export type StructuredEssay = z.infer<typeof structuredEssaySchema>;
export const providerEssaySchema = {
  type: 'OBJECT',
  properties: {
    title: { type: 'STRING' },
    introduction: { type: 'STRING' },
    bodyParagraphs: { type: 'ARRAY', items: { type: 'STRING' } },
    counterargument: { type: 'STRING' },
    conclusion: { type: 'STRING' },
    wordCount: { type: 'INTEGER' },
  },
  required: [
    'title',
    'introduction',
    'bodyParagraphs',
    'counterargument',
    'conclusion',
    'wordCount',
  ],
};
const styleGuidance: Record<Parameters['style'], string> = {
  Академиялық:
    'Ресми әрі бейтарап тіл, айқын тезис, логикалық дәлел. Орынсыз эмоция мен ауызекі сөз қоспа.',
  Ғылыми:
    'Бейтарап, дәл, терминологиялық дұрыс тіл. Негізінен үшінші жақпен баянда. «Мен» есімдігін, бейнелі теңеу мен эмоциялық тіркестерді азайт. Жасалмаған зерттеуге сілтеме жасама.',
  Публицистикалық:
    'Қоғамдық мәселені аш, авторлық ұстанымды айқын көрсет. Орнымен риторикалық сұрақ пен әсерлі тіркес қолдан; эмоция дәлелдің орнын алмастырмасын.',
  'Ресми-іскери':
    'Нақты, жинақы, бірмәнді тіл және қисынды ұсыныстар. Жаргон, орынсыз бейнелеу және эмоциялық әсірелеу қоспа.',
  Бейресми:
    'Түсінікті, табиғи авторлық тіл. Жеке ұстанымға болады, бірақ орынсыз жаргон мен дәлелсіз кесімді пікірден аулақ бол.',
  Көркем:
    'Бейнелі тіл, сезім мен ой-толғауға болады. Авторлық дауысты сақта, бірақ ойдан алынған оқиғаны нақты өмірбаян не тарихи дерек деп ұсынба.',
};
const audienceGuidance: Record<Parameters['audience'], string> = {
  Оқушылар: 'Қарапайым түсіндіру, түсініксіз терминге қысқа анықтама және таныс мысал.',
  Студенттер:
    'Оқу деңгейіне сай академиялық тіл, ұғымдарды түсіндіру және дәлелдердің қисынын ашу.',
  Мұғалімдер:
    'Кәсіби, жартылай ғылыми тіл; тақырыпқа сай болса әдістемелік және практикалық мысал.',
  'Жалпы қауым': 'Әртүрлі білім деңгейіне түсінікті тіл, өмірлік мысал және анық түсіндірме.',
  Мамандар:
    'Терминологиялық дәлдік пен кәсіби түсіндіру; негізсіз статистикасыз нақты аргументация.',
};

export function structureGuidance(params: Parameters): string {
  const count = params.argumentsCount + 2 + Number(params.includeCounterargument);
  return [
    'Эссе құрылымы: кіріспе → негізгі бөлім → қорытынды. Бұл бөлім атаулары соңғы мәтінде жазылмайды.',
    `Барлығы ${count} бөлек абзац: бір кіріспе, ${params.argumentsCount} дәлел абзацы, ${params.includeCounterargument ? 'бір қарсы пікір және оған жауап абзацы, ' : ''}бір қорытынды.`,
    'introduction: тақырып пен мәселені таныстыр, өзектілікті нақты аш, кіріспеде анық әрі дәлелдеуге болатын негізгі тезисті тұжырымда. Негізгі бөлімге табиғи өт.',
    `bodyParagraphs: дәл ${params.argumentsCount} элемент. Әр элемент — бір ғана дәлелді ашатын жеке абзац. Тақырыптық сөйлем → негіздеу/нақты мысал → мысалдың тезиспен байланысын түсіндіру → шағын түйін (PEEL / тезис–дәлел–қорытынды).`,
    params.includeCounterargument
      ? 'counterargument: бір бөлек абзацта қарсы көзқарасты әділ беріп, оған негізді жауап жаз.'
      : 'counterargument: дәл бос жол "" қайтар.',
    'conclusion: негізгі тезисті басқа сөзбен жинақтап, дәлелдерден туған тұжырым не ұсыныспен аяқта. Жаңа дәлел мен жаңа дерек қоспа.',
    'ӘР абзацта кемінде екі толық сөйлем болсын; бір абзац — бір тұтас ой. Әр JSON өрісі не массив элементі тек бір абзацтың мәтінін қамтиды, ішіне жаңа жол, тақырыпша, нөмір немесе bullet қоспа.',
    'title берілген тақырыпты дәл ашсын. Жауап өрістері: title, introduction, bodyParagraphs, counterargument, conclusion, wordCount. Сервер оларды арасына бос жол қойып біріктіреді.',
    `Стиль: ${params.style}. ${styleGuidance[params.style]}`,
    `Аудитория: ${params.audience}. ${audienceGuidance[params.audience]}`,
    'Дерек, статистика, автор, шығарма, дәйексөз және зерттеу ойдан шығарылмайды. Дереккөз таңдалған кезде де тек сенімді білетін еңбекке сүйен; тексерілмегенін ашық көрсет.',
    markerGuidance(params),
  ].join('\n');
}

export function essayParagraphs(draft: StructuredEssay): string[] {
  return [draft.introduction, ...draft.bodyParagraphs, draft.counterargument, draft.conclusion]
    .map(normalizeParagraph)
    .filter(Boolean);
}
export function serializeEssay(draft: StructuredEssay): string {
  return essayParagraphs(draft).join('\n\n');
}

export function structureIssues(draft: StructuredEssay, params: Parameters): string[] {
  const issues: string[] = [];
  if (draft.bodyParagraphs.length !== params.argumentsCount)
    issues.push(
      `Негізгі бөлімде ${draft.bodyParagraphs.length} дәлел абзацы бар; дәл ${params.argumentsCount} керек.`,
    );
  if (params.includeCounterargument && !draft.counterargument.trim())
    issues.push('Қарсы пікір мен оған жауаптың жеке абзацы жоқ.');
  if (!params.includeCounterargument && draft.counterargument.trim())
    issues.push('Қарсы пікір сұралмаған: counterargument бос болуы керек.');
  const paragraphs = essayParagraphs(draft);
  if (
    paragraphs.some((paragraph) =>
      /^(?:#{1,6}\s*)?(?:\*{1,2})?(?:кіріспе|негізгі бөлім|қорытынды)(?:\*{1,2})?\s*[:–—-]/iu.test(
        paragraph,
      ),
    )
  )
    issues.push(
      'Кіріспе, негізгі бөлім, қорытынды деген бөлім тақырыпшаларын мәтіннен алып тастаңыз.',
    );
  if (paragraphs.some((paragraph) => /^(?:[-*•]\s+|\d+[.)]\s+)/u.test(paragraph)))
    issues.push('Эссе нөмірленген не маркерленген тізім емес, тұтас абзацтармен жазылуы керек.');
  const segmenter = new Intl.Segmenter('kk', { granularity: 'sentence' });
  const short = paragraphs.flatMap((paragraph, index) =>
    [...segmenter.segment(paragraph)].filter((part) => /\p{L}/u.test(part.segment)).length < 2
      ? [index + 1]
      : [],
  );
  if (short.length)
    issues.push(
      `${short.join(', ')}-абзацта екі толық сөйлемнен аз; әр абзацты ой–дәлел/мысал–түйін бойынша дамытыңыз.`,
    );
  issues.push(...markerIssues(draft.bodyParagraphs, serializeEssay(draft)));
  return issues;
}
