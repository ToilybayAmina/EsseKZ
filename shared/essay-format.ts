/** A physical line break denotes a paragraph; empty separator lines are ignored. */
export function splitParagraphs(text: string): string[] {
  return text
    .replace(/\r\n?/g, '\n')
    .split(/\n+/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

/** Preserve the provider's words, normalize only whitespace inside one paragraph. */
export function normalizeParagraph(text: string): string {
  return text.replace(/\s+/gu, ' ').trim();
}
