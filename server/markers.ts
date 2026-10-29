import type { Parameters } from '../shared/schema.ts';

// Adapted from «эссе правила.docx», sections V–VIII. Choices, not filler.
export const markers = {
  thesis: ['Меніңше', 'Менің ойымша', 'Менің пікірімше'],
  order: ['Біріншіден', 'Екіншіден', 'Үшіншіден', 'Төртіншіден', 'Бесіншіден'],
  evidence: ['Мысалы', 'Бұған мысал ретінде', 'Нақты мысал ретінде', 'Дәлел ретінде'],
  cause: ['Себебі', 'Өйткені', 'Осыған байланысты'],
  addition: ['Сонымен қатар', 'Бұған қоса', 'Оған қоса'],
  contrast: ['Алайда', 'Дегенмен', 'Қарсы көзқарас бойынша'],
  comparison: ['Салыстырсақ', 'Айырмашылығы', 'Ұқсастығы', 'Екеуі де'],
  conclusion: [
    'Қорыта айтқанда',
    'Қорыта келе',
    'Қорытындылай келе',
    'Осылайша',
    'Демек',
    'Сондықтан',
  ],
};

export function markerGuidance(params: Parameters): string {
  const formal = ['Ғылыми', 'Академиялық', 'Ресми-іскери'].includes(params.style);
  return [
    'Маркерді ойдың логикалық қызметіне сай таңда. Бір сөйлемге бірнеше маркерді тізбектеме, әр сөйлемді маркермен бастама.',
    formal
      ? 'Ресми стильде тезисті бейтарап тұжырымда; «Менің ойымша» сияқты бірінші жақ қалыптарын орынсыз қолданба. Ғылыми стильде «мен» есімдігін барынша азайт.'
      : `Авторлық ұстанымға қажет болса бір қалып таңда: ${markers.thesis.join('; ')}.`,
    `Негізгі бөлімдегі дәлелдер реті: ${markers.order.slice(0, params.argumentsCount).join(' → ')}. Бірінші дәлелде «Біріншіден» қолданылса, келесілерінің реті бұзылмасын; сандық тізім не тақырыпша жасама.`,
    `Мысал келтіру: ${markers.evidence.join('; ')}. Мысалдан кейін оның тезисті қалай негіздейтінін түсіндір.`,
    `Себеп-салдар: ${markers.cause.join('; ')}. Қосымша ой: ${markers.addition.join('; ')}.`,
    params.includeCounterargument
      ? `Қарсы пікірдің бөлек абзацында ${markers.contrast.join('; ')} қалыптарының бірін қолданып, сол абзацта негізді жауап бер.`
      : 'Қарсы пікір сұралмаған: оған арнап жеке абзац қоспа.',
    params.essayType === 'Салыстырмалы' ? `Салыстыруға: ${markers.comparison.join('; ')}.` : '',
    `Соңғы абзацта бір қорытынды маркерін таңда: ${markers.conclusion.join('; ')}. Жаңа дәлел қоспай тезисті түйінде.`,
    'Бір реттік маркерді («Біріншіден» және т.б.) қайта қолданба; өзге бірдей дайын тіркесті мәтінде екі реттен артық қайталама.',
    '«Зерттеулерге сәйкес», «Статистика көрсеткендей», «Деректерге сүйенсек» деген қалыптар тек нақты тексерілген дерек барда қолданылады. Маркер үшін зерттеу, сан не дереккөз ойдан шығарма.',
  ]
    .filter(Boolean)
    .join('\n');
}

export function markerIssues(bodyParagraphs: string[], text: string): string[] {
  const issues: string[] = [];
  bodyParagraphs.forEach((paragraph, index) => {
    const used = markers.order.findIndex((marker) =>
      new RegExp(`^${marker}(?=[\\s,:;.!?]|$)`, 'iu').test(paragraph.trim()),
    );
    if (used >= 0 && used !== index)
      issues.push(
        `${index + 1}-дәлелдегі реттік маркер сәйкес емес: осы орында «${markers.order[index]}» болуы керек.`,
      );
  });
  for (const marker of Object.values(markers).flat()) {
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
  return issues;
}
