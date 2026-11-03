import type { Language } from '@pp/contracts-domain';

export type PluralCategory = 'one' | 'other';

/** CLDR rules for the supported languages: English singular is exactly 1; Hindi/Bengali treat 0 and 1 as singular. */
export function pluralCategory(language: Language, count: number): PluralCategory {
  if (language === 'en') return count === 1 ? 'one' : 'other';
  return count === 0 || count === 1 ? 'one' : 'other';
}

export const plural = <T>(language: Language, count: number, forms: { one: T; other: T }): T =>
  forms[pluralCategory(language, Math.abs(count))];
