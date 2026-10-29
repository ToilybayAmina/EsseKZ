import type { StructuredEssay } from '../server/essay-rules.ts';
/** Synthetic provider fixture used only by tests; no sample essays ship in the application. */
export function structuredFixture(totalWords: number): StructuredEssay {
  function paragraph(count: number) {
    const first = Math.ceil(count / 2);
    return (
      Array(first).fill('Қазақша').join(' ') +
      '. ' +
      Array(count - first)
        .fill('Қазақша')
        .join(' ') +
      '.'
    );
  }
  const counts = Array.from(
    { length: 5 },
    (_, index) => Math.floor(totalWords / 5) + Number(index < totalWords % 5),
  );
  const paragraphs = counts.map(paragraph);
  return {
    title: 'Тіл байлығы',
    introduction: paragraphs[0],
    bodyParagraphs: paragraphs.slice(1, 4),
    counterargument: '',
    conclusion: paragraphs[4],
    wordCount: 999,
  };
}
