import type { StructuredEssay } from '../server/essay-rules.ts';
/** Synthetic provider fixture used only by tests; no sample essays ship in the application. */
export function structuredFixture(totalWords: number): StructuredEssay {
  function paragraph(count: number, prefix: string) {
    const first = Math.ceil(count / 2);
    const words = Array(count).fill('Қазақша');
    const opening = prefix ? prefix.split(' ') : [];
    words.splice(0, opening.length, ...opening);
    return words.slice(0, first).join(' ') + '. ' + words.slice(first).join(' ') + '.';
  }
  const counts = Array.from(
    { length: 5 },
    (_, index) => Math.floor(totalWords / 5) + Number(index < totalWords % 5),
  );
  const prefixes = ['', 'Мысалы,', 'Өйткені', 'Сонымен қатар', 'Демек,'];
  const paragraphs = counts.map((count, i) => paragraph(count, prefixes[i]));
  return {
    title: 'Тіл байлығы',
    introduction: paragraphs[0],
    bodyParagraphs: paragraphs.slice(1, 4),
    counterargument: '',
    conclusion: paragraphs[4],
    wordCount: 999,
  };
}
