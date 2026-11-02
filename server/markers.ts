import type { Parameters } from '../shared/schema.ts';

// Adapted from «эссе правила.docx», sections V–VIII. Choices, not filler.
export const markers = {
  thesis: ['Меніңше', 'Менің ойымша', 'Менің пікірімше'],
  order: ['Біріншіден', 'Екіншіден', 'Үшіншіден', 'Төртіншіден', 'Бесіншіден'],
  evidence: [
    'Мысалы',
    'Мәселен',
    'Айталық',
    'Бұған мысал ретінде',
    'Нақты мысал ретінде',
    'Дәлел ретінде',
  ],
  cause: ['Себебі', 'Өйткені'],
  consequence: ['Сондықтан', 'Сол себепті', 'Осының нәтижесінде', 'Осыған байланысты'],
  addition: ['Сонымен қатар', 'Бұған қоса', 'Оған қоса'],
  contrast: ['Алайда', 'Дегенмен', 'Бірақ', 'Соған қарамастан', 'Қарсы көзқарас бойынша'],
  comparison: ['Салыстырсақ', 'Ал', 'Екеуі де', 'Бірімен салыстырғанда'],
  time: ['Алдымен', 'Осы кезде', 'Кейінірек', 'Содан соң', 'Ақырында'],
  conclusion: [
    'Қорыта айтқанда',
    'Қорыта келе',
    'Қорытындылай келе',
    'Осылайша',
    'Демек',
    'Сондықтан',
  ],
};

type MarkerDraft = { bodyParagraphs: string[]; conclusion: string; counterargument: string };
export type MarkerRequirement = {
  role: string;
  scope: 'body' | 'conclusion' | 'counterargument';
  choices: readonly string[];
};

export function markerRequirements(
  params: Parameters,
  allowConclusionFormula: boolean,
): MarkerRequirement[] {
  const requirements: MarkerRequirement[] = [];
  if (params.essayType === 'Салыстырмалы') {
    requirements.push({ role: 'салыстыру', scope: 'body', choices: markers.comparison });
    requirements.push({ role: 'мысал келтіру', scope: 'body', choices: markers.evidence });
  } else if (['Баяндау', 'Тарихи'].includes(params.essayType)) {
    requirements.push({ role: 'оқиғаның уақыт байланысы', scope: 'body', choices: markers.time });
    requirements.push({
      role: 'себеп не нәтиже',
      scope: 'body',
      choices: [...markers.cause, ...markers.consequence],
    });
  } else if (params.essayType === 'Сипаттама') {
    requirements.push({
      role: 'детальды толықтыру не мысал',
      scope: 'body',
      choices: [...markers.evidence, ...markers.addition],
    });
  } else if (params.essayType === 'Философиялық') {
    requirements.push({
      role: 'ойдан туатын себеп не түйін',
      scope: 'body',
      choices: [...markers.cause, ...markers.consequence],
    });
  } else {
    requirements.push({ role: 'мысал келтіру', scope: 'body', choices: markers.evidence });
    requirements.push({
      role: 'себеп не нәтиже',
      scope: 'body',
      choices: [...markers.cause, ...markers.consequence],
    });
  }
  requirements.push({
    role: 'қорытындылау',
    scope: 'conclusion',
    choices: allowConclusionFormula ? markers.conclusion : ['Осылайша', 'Демек', 'Сондықтан'],
  });
  if (params.includeCounterargument)
    requirements.push({
      role: 'қарсы көзқарасты байланыстыру',
      scope: 'counterargument',
      choices: markers.contrast,
    });
  return requirements;
}

function containsMarker(text: string, marker: string) {
  const escaped = marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`, 'iu').test(text);
}

export function markerCoverageIssues(
  draft: MarkerDraft,
  params: Parameters,
  allowConclusionFormula: boolean,
): string[] {
  return markerRequirements(params, allowConclusionFormula).flatMap((requirement) => {
    const text =
      requirement.scope === 'body' ? draft.bodyParagraphs.join('\n\n') : draft[requirement.scope];
    return requirement.choices.some((marker) => containsMarker(text, marker))
      ? []
      : [
          `${requirement.scope === 'body' ? 'Негізгі бөлімде' : requirement.scope === 'conclusion' ? 'Қорытындыда' : 'Қарсы пікір абзацында'} «${requirement.role}» қызметін атқаратын маркер жоқ. ${requirement.choices.join('; ')} нұсқаларының бірін мағынаға сай енгізіңіз.`,
        ];
  });
}

export function markerGuidance(
  params: Parameters,
  allowOrdinalMarkers = false,
  allowConclusionFormula = false,
  variation = 0,
): string {
  const formal = ['Ғылыми', 'Академиялық', 'Ресми-іскери'].includes(params.style);
  return [
    'Маркерлік сөздер мәтінде міндетті түрде, бірақ орнымен қолданылсын. Оларды дайын мәтінге механикалық қоспа: маркері бар сөйлем сол логикалық қатынасты шын ашсын. Маркерді сөйлем басында ғана емес, сөйлем ішінде де қолдануға болады.',
    ...markerRequirements(params, allowConclusionFormula).map((requirement, index) => {
      const shift = (variation + index) % requirement.choices.length;
      const preferred = [
        ...requirement.choices.slice(shift),
        ...requirement.choices.slice(0, shift),
      ].slice(0, 3);
      const location =
        requirement.scope === 'body'
          ? 'негізгі бөлімде'
          : requirement.scope === 'conclusion'
            ? 'қорытындыда'
            : 'қарсы пікір абзацында';
      return `Кемінде бір «${requirement.role}» маркерін ${location} қолдан. Осы нұсқаға ұсынылатын баламалар: ${preferred.join('; ')}. Басқа дұрыс балама да жарайды. Жаңа мазмұндық жоспарды өзгертпе.`;
    }),
    'Маркерді ойдың логикалық қызметіне сай таңда. Бір сөйлемге бірнеше маркерді тізбектеме, әр сөйлемді маркермен бастама.',
    formal
      ? 'Ресми стильде тезисті бейтарап тұжырымда; «Менің ойымша» сияқты бірінші жақ қалыптарын орынсыз қолданба. Ғылыми стильде «мен» есімдігін барынша азайт.'
      : `Авторлық ұстанымға қажет болса бір қалып таңда: ${markers.thesis.join('; ')}.`,
    allowOrdinalMarkers
      ? 'Реттік маркерлер міндетті емес. Дәлелді санамалап беру қисынды болса ғана «Біріншіден», «Екіншіден» сияқты реттілікті толық және дұрыс сақта. Нөмірленген тізім жасама.'
      : 'Бұл нұсқада абзацтарды «Біріншіден», «Екіншіден», «Үшіншіден» деп санамалама. Ойды алдыңғы абзацтың нақты мазмұны арқылы жалға: оқиға, себеп, салыстыру не жаңа қыр табиғи өтуді қамтамасыз етсін.',
    `Мысал келтіру: ${markers.evidence.join('; ')}. Мысалдан кейін оның тезисті қалай негіздейтінін түсіндір.`,
    `Себепті түсіндіру: ${markers.cause.join('; ')}. Салдар/нәтиже: ${markers.consequence.join('; ')}. Себеп пен салдарды шатастырма. Қосымша ой: ${markers.addition.join('; ')}.`,
    params.includeCounterargument
      ? `Қарсы пікірдің бөлек абзацында ${markers.contrast.join('; ')} қалыптарының бірін қолданып, сол абзацта негізді жауап бер.`
      : 'Қарсы пікір сұралмаған: оған арнап жеке абзац қоспа.',
    params.essayType === 'Салыстырмалы'
      ? `Салыстыруға: ${markers.comparison.join('; ')}. «Айырмашылығы,» не «Ұқсастығы,» деген жалаң сөзді үтірмен бөліп сөйлем бастама; «Екі тәсілдің айырмашылығы ...» деп толық ой құр.`
      : '',
    ['Баяндау', 'Тарихи'].includes(params.essayType)
      ? `Оқиғаға қажет уақыт байланыстары: ${markers.time.join('; ')}. Әр абзацты осылармен бастау міндет емес.`
      : '',
    allowConclusionFormula
      ? 'Қорытындыда ойды түйіндейтін бір маркерді мағынаға сай қолдан. Түйінге жаңа дәлел қоспа.'
      : 'Бұл нұсқаның қорытындысын «Қорытындылай келе», «Қорыта айтқанда», «Қорыта келе» деп бастама. Нақты тұжырым, бастапқы сұраққа жауап немесе бейнеге оралу қорытынды қызметін өзі атқарсын. Жаңа дәлел қоспа.',
    ['Көркем', 'Бейресми'].includes(params.style) ||
    ['Баяндау', 'Сипаттама', 'Философиялық'].includes(params.essayType)
      ? 'Баяндау мен сипаттауда маркерді сирек қолдан: уақыт, мағыналы деталь немесе ойдың жалғасуы өтуді өзі жасай алады. Шығарманы мектептік санамалауға айналдырма.'
      : 'Негізден нәтиже шығатын жерде ғана «демек», «сондықтан» сияқты байланыстырғышты қолдануға болады; әр абзацты осылай аяқтама.',
    '«Өйткені», «себебі» сөздерінен кейін автоматты түрде үтір қойма: тыныс белгісі сөйлем құрылысына сай қойылады.',
    'Маркер сөздерді сан толтыру үшін қоспа. «Өйткені/себебі» алдыңғы ойдың себебін түсіндірсін; «сондықтан/демек» негізден туған нәтижені білдірсін; «алайда/дегенмен» шын қарама-қарсылық болғанда ғана қолданылсын.',
    'Бір реттік маркерді («Біріншіден» және т.б.) қайта қолданба; өзге бірдей дайын тіркесті мәтінде екі реттен артық қайталама.',
    '«Зерттеулерге сәйкес», «Статистика көрсеткендей», «Деректерге сүйенсек» деген қалыптар тек нақты тексерілген дерек барда қолданылады. Маркер үшін зерттеу, сан не дереккөз ойдан шығарма.',
  ]
    .filter(Boolean)
    .join('\n');
}

export function markerIssues(
  bodyParagraphs: string[],
  text: string,
  allowOrdinalMarkers?: boolean,
  allowConclusionFormula?: boolean,
): string[] {
  const issues: string[] = [];
  let expectedOrder = 0;
  let ordinalCount = 0;
  bodyParagraphs.forEach((paragraph) => {
    const used = markers.order.findIndex((marker) =>
      new RegExp(`^${marker}(?=[\\s,:;.!?]|$)`, 'iu').test(paragraph.trim()),
    );
    if (used < 0) return;
    ordinalCount++;
    if (allowOrdinalMarkers === false)
      issues.push(
        'Бұл композицияда реттік маркер қолданылмайды; абзацты мазмұндық өтумен байланыстырыңыз.',
      );
    else if (used !== expectedOrder)
      issues.push(
        `Дәлелдегі реттік маркер реті бұзылған: келесі маркер «${markers.order[expectedOrder]}» болуы керек.`,
      );
    expectedOrder++;
  });
  if (ordinalCount && ordinalCount !== bodyParagraphs.length && allowOrdinalMarkers !== false)
    issues.push(
      'Реттік маркер қолданылғанда дәлелдердің санамалау тізбегін толық сақтаңыз немесе санамалаудан бас тартыңыз.',
    );
  for (const marker of new Set(Object.values(markers).flat())) {
    const escaped = marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const count = [
      ...text.matchAll(new RegExp(`(?:^|[.!?]\\s+|\\n\\s*)${escaped}(?=[\\s,:;.!?]|$)`, 'giu')),
    ].length;
    const maximum = (markers.order as readonly string[]).includes(marker) ? 1 : 2;
    if (count > maximum)
      issues.push(
        `«${marker}» маркері ${count} рет қайталанған; ең көбі ${maximum} рет қолданыңыз.`,
      );
  }
  const summaryCount = [
    ...text.matchAll(
      /(?:^|[.!?]\s+|\n\s*)(?:Қорытындылай келе|Қорыта айтқанда|Қорыта келе)(?=[\s,:;.!?]|$)/giu,
    ),
  ].length;
  if (summaryCount && allowConclusionFormula === false)
    issues.push('Бұл нұсқада дайын қорытынды маркерін қолданбаңыз; нақты тұжырымнан бастаңыз.');
  if (summaryCount > 1)
    issues.push(
      'Дайын қорытынды маркерлерін бірнеше рет қайталамаңыз; бір нақты түйін жеткілікті.',
    );
  if (/(?:^|[.!?]\s+|\n\s*)(?:Айырмашылығы|Ұқсастығы)\s*,/iu.test(text))
    issues.push(
      '«Айырмашылығы/Ұқсастығы» сөзін жалаң маркер қылмай, толық сөйлеммен байланыстырыңыз.',
    );
  const allMarkers = Object.values(markers)
    .flat()
    .map((m) => m.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|');
  if (
    new RegExp(
      `(?:^|[.!?]\\s+|\\n\\s*)(?:${allMarkers})[,;:]?\\s+(?:${allMarkers})[,;:]`,
      'iu',
    ).test(text)
  )
    issues.push(
      'Бір сөйлемнің басына бірнеше маркерді тізбектемеңіз; ойға сәйкес біреуін қалдырыңыз.',
    );
  return issues;
}
