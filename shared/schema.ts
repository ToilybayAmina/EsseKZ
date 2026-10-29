import { z } from 'zod';
export const essayTypes = [
  'Пікірталастық',
  'Философиялық',
  'Тарихи',
  'Академиялық',
  'Публицистикалық',
  'Салыстырмалы',
  'Себеп-салдар',
  'Шешім ұсыну',
  'Сипаттама',
  'Баяндау',
  'Дәлелдеу',
  'Сыни талдау',
] as const;
export const styles = [
  'Академиялық',
  'Ғылыми',
  'Публицистикалық',
  'Ресми-іскери',
  'Бейресми',
  'Көркем',
] as const;
export const audiences = [
  'Оқушылар',
  'Студенттер',
  'Мұғалімдер',
  'Жалпы қауым',
  'Мамандар',
] as const;
export const wordOptions = [150, 200, 250, 300, 400, 500];
export const parametersSchema = z.object({
  title: z.string().trim().min(3).max(200),
  thesis: z.string().trim().max(2000).default(''),
  essayType: z.enum(essayTypes),
  style: z.enum(styles),
  audience: z.enum(audiences),
  targetWordCount: z
    .number()
    .int()
    .refine((n) => wordOptions.includes(n)),
  argumentsCount: z.number().int().min(1).max(5),
  includeCounterargument: z.boolean(),
  includeSources: z.boolean(),
});
export type Parameters = z.infer<typeof parametersSchema>;
export const defaults: Parameters = {
  title: '',
  thesis: '',
  essayType: 'Пікірталастық',
  style: 'Академиялық',
  audience: 'Студенттер',
  targetWordCount: 250,
  argumentsCount: 3,
  includeCounterargument: false,
  includeSources: false,
};
export type User = { id: string; name: string; email: string; created_at: string };
export type Essay = {
  id: string;
  title: string;
  thesis: string;
  essay_text: string;
  essay_type: string;
  style: string;
  word_count: number;
  target_word_count: number;
  audience: string;
  arguments_count: number;
  include_counterargument: boolean;
  include_sources: boolean;
  created_at: string;
  updated_at: string;
  source: 'manual' | 'gemini';
};
export function countWords(text: string) {
  return text.match(/[\p{L}\p{N}]+(?:[’'–-][\p{L}\p{N}]+)*/gu)?.length || 0;
}
export function essayParameters(e: Essay): Parameters {
  return {
    title: e.title,
    thesis: e.thesis,
    essayType: e.essay_type as Parameters['essayType'],
    style: e.style as Parameters['style'],
    audience: e.audience as Parameters['audience'],
    targetWordCount: e.target_word_count,
    argumentsCount: e.arguments_count,
    includeCounterargument: e.include_counterargument,
    includeSources: e.include_sources,
  };
}
