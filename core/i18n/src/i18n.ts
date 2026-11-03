import type { Language } from '@pp/contracts-domain';
import { catalogues, type MessageKey } from './catalogues';
import { pluralCategory } from './plural';

export type Params = Record<string, string | number>;

type PluralBase = {
  [K in MessageKey]: K extends `${infer Base}_one` ? Base : never;
}[MessageKey];

export interface I18n {
  readonly language: Language;
  t(key: MessageKey, params?: Params): string;
  /** Looks up `<key>_one` / `<key>_other` for the language's plural rule and fills `{count}`. */
  tn(key: PluralBase, count: number, params?: Params): string;
  has(key: string): key is MessageKey;
}

const PLACEHOLDER = /\{(\w+)\}/g;

function interpolate(template: string, params?: Params): string {
  if (!params) return template;
  return template.replace(PLACEHOLDER, (match, name: string) => {
    const value = params[name];
    return value === undefined ? match : String(value);
  });
}

export function createI18n(language: Language): I18n {
  const active = catalogues[language];
  const fallback = catalogues.en;
  const lookup = (key: MessageKey): string => active[key] ?? fallback[key] ?? key;
  return {
    language,
    t: (key, params) => interpolate(lookup(key), params),
    tn: (key, count, params) => {
      const category = pluralCategory(language, Math.abs(count));
      return interpolate(lookup(`${key}_${category}` as MessageKey), { count, ...params });
    },
    has: (key): key is MessageKey => key in fallback,
  };
}

let current: I18n = createI18n('en');
const listeners = new Set<(language: Language) => void>();

export const getLanguage = (): Language => current.language;

export function setLanguage(language: Language): void {
  if (language === current.language) return;
  current = createI18n(language);
  for (const listener of [...listeners]) listener(language);
}

export function subscribe(listener: (language: Language) => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export const t: I18n['t'] = (key, params) => current.t(key, params);
export const tn: I18n['tn'] = (key, count, params) => current.tn(key, count, params);
