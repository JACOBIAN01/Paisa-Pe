import type { Paise } from '@pp/contracts-domain';
import { scriptForLanguage, toScriptDigits } from './digits';
import { normalizeAmountText } from './parse';

const MAX_INTEGER_DIGITS = 9;

/** Groups digits the Indian way: last three, then pairs (1,23,456). */
export function groupIndian(digits: string): string {
  if (digits.length <= 3) return digits;
  const head = digits.slice(0, -3);
  const tail = digits.slice(-3);
  return `${head.replace(/\B(?=(\d{2})+(?!\d))/g, ',')},${tail}`;
}

/**
 * Progressive formatting for an amount text field. Whatever this returns,
 * `parseAmount` reads back exactly what is displayed.
 */
export function formatAmountInput(raw: string): string {
  const text = normalizeAmountText(raw).replace(/,/g, '');
  const dot = text.indexOf('.');
  const hasDot = dot !== -1;
  const integerRaw = (hasDot ? text.slice(0, dot) : text).replace(/\D/g, '');
  const fractionRaw = hasDot
    ? text
        .slice(dot + 1)
        .replace(/\D/g, '')
        .slice(0, 2)
    : '';

  const trimmed = integerRaw.replace(/^0+(?=\d)/, '').slice(0, MAX_INTEGER_DIGITS);
  const integer = trimmed === '' && hasDot ? '0' : trimmed;
  const grouped = groupIndian(integer);
  return hasDot ? `${grouped}.${fractionRaw}` : grouped;
}

export interface FormatPaiseOptions {
  symbol?: string;
  /** BCP-47-ish tag; `hi` and `bn` pick native digits when `nativeDigits` is true. */
  locale?: string;
  nativeDigits?: boolean;
  /** Omit `.00` when there is no fractional part. */
  dropZeroFraction?: boolean;
}

export function formatPaise(value: Paise, options: FormatPaiseOptions = {}): string {
  const {
    symbol = '₹',
    locale = 'en-IN',
    nativeDigits = false,
    dropZeroFraction = false,
  } = options;
  const negative = value < 0;
  const abs = Math.abs(value);
  const rupees = Math.floor(abs / 100);
  const fraction = abs % 100;
  const fractionText =
    dropZeroFraction && fraction === 0 ? '' : `.${String(fraction).padStart(2, '0')}`;
  const body = `${groupIndian(String(rupees))}${fractionText}`;
  const script = nativeDigits ? scriptForLanguage(locale.split('-')[0] ?? 'en') : 'latin';
  return `${negative ? '-' : ''}${symbol}${toScriptDigits(body, script)}`;
}
