import type { Language, Paise } from '@pp/contracts-domain';
import { formatPaise, groupIndian, scriptForLanguage, toScriptDigits } from '@pp/core-money';

export interface FormatNumberOptions {
  nativeDigits?: boolean;
}

/** Integer or decimal number with Indian digit grouping. */
export function formatNumber(
  value: number,
  language: Language,
  options: FormatNumberOptions = {},
): string {
  const negative = value < 0;
  const [whole = '0', fraction] = String(Math.abs(value)).split('.');
  const body = `${groupIndian(whole)}${fraction ? `.${fraction}` : ''}`;
  const script = options.nativeDigits ? scriptForLanguage(language) : 'latin';
  return `${negative ? '-' : ''}${toScriptDigits(body, script)}`;
}

export function formatCurrency(
  value: Paise,
  language: Language,
  options: { nativeDigits?: boolean; dropZeroFraction?: boolean } = {},
): string {
  return formatPaise(value, { locale: language, ...options });
}

const MONTHS: Record<Language, readonly string[]> = {
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  hi: ['जन', 'फ़र', 'मार्च', 'अप्रैल', 'मई', 'जून', 'जुल', 'अग', 'सित', 'अक्टू', 'नव', 'दिस'],
  bn: [
    'জানু',
    'ফেব্রু',
    'মার্চ',
    'এপ্রি',
    'মে',
    'জুন',
    'জুল',
    'আগ',
    'সেপ্টে',
    'অক্টো',
    'নভে',
    'ডিসে',
  ],
};

const MERIDIEM: Record<Language, readonly [string, string]> = {
  en: ['am', 'pm'],
  hi: ['पूर्वाह्न', 'अपराह्न'],
  bn: ['পূর্বাহ্ণ', 'অপরাহ্ণ'],
};

export type TimeZone = 'Asia/Kolkata' | 'UTC' | number;

/** Offset of `tz` from UTC in minutes. A number is taken as minutes directly. */
export function offsetMinutes(tz: TimeZone): number {
  if (typeof tz === 'number') return tz;
  return tz === 'UTC' ? 0 : 330;
}

export interface FormatDateOptions {
  withTime?: boolean;
  nativeDigits?: boolean;
}

/** e.g. `3 Nov 2026, 4:05 pm`. Pure arithmetic, so it behaves the same on every JS engine. */
export function formatDate(
  epochMs: number,
  language: Language,
  tz: TimeZone = 'Asia/Kolkata',
  options: FormatDateOptions = {},
): string {
  const shifted = new Date(epochMs + offsetMinutes(tz) * 60_000);
  const day = shifted.getUTCDate();
  const month = MONTHS[language][shifted.getUTCMonth()] ?? '';
  const year = shifted.getUTCFullYear();
  let text = `${day} ${month} ${year}`;
  if (options.withTime ?? true) {
    const hours24 = shifted.getUTCHours();
    const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
    const minutes = String(shifted.getUTCMinutes()).padStart(2, '0');
    const meridiem = MERIDIEM[language][hours24 < 12 ? 0 : 1];
    text += `, ${hours12}:${minutes} ${meridiem}`;
  }
  const script = options.nativeDigits ? scriptForLanguage(language) : 'latin';
  return toScriptDigits(text, script);
}
