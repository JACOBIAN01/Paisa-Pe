import type { Paise } from '@pp/contracts-domain';
import { normalizeDigits } from './digits';
import { paise } from './arithmetic';

const MAX_INTEGER_DIGITS = 9;
const CURRENCY_MARKS = /(?:₹|rs\.?|inr)/gi;

/**
 * The single normalisation step shared by `parseAmount` and `formatAmountInput`:
 * native digits become Latin, currency marks and whitespace disappear.
 */
export function normalizeAmountText(raw: string): string {
  return normalizeDigits(raw).replace(CURRENCY_MARKS, '').replace(/\s+/g, '');
}

function validGrouping(integerPart: string): boolean {
  if (!integerPart.includes(',')) return /^\d+$/.test(integerPart);
  const groups = integerPart.split(',');
  const first = groups[0] ?? '';
  const last = groups[groups.length - 1] ?? '';
  const middle = groups.slice(1, -1);
  if (!/^\d{1,3}$/.test(first) || !/^\d{3}$/.test(last)) return false;
  if (middle.length === 0) return true;
  if (middle.every((g) => g.length === 3)) return true; // 1,234,567
  return middle.every((g) => g.length === 2) && first.length <= 2; // 12,34,567
}

export interface ParseAmountOptions {
  allowZero?: boolean;
}

/** Parses rupee text such as `1,234.50` into paise. Returns null for anything ambiguous or invalid. */
export function parseAmount(input: string, options: ParseAmountOptions = {}): Paise | null {
  const text = normalizeAmountText(input);
  if (text === '') return null;

  const dot = text.indexOf('.');
  if (dot !== text.lastIndexOf('.')) return null;
  const integerText = dot === -1 ? text : text.slice(0, dot);
  const fractionText = dot === -1 ? '' : text.slice(dot + 1);

  if (fractionText.length > 2 || !/^\d*$/.test(fractionText)) return null;
  if (integerText === '' && fractionText === '') return null;
  if (integerText !== '' && !validGrouping(integerText)) return null;

  const digits = integerText.replace(/,/g, '');
  if (digits.length > MAX_INTEGER_DIGITS) return null;

  const rupees = digits === '' ? 0 : Number(digits);
  const fraction = Number(fractionText.padEnd(2, '0'));
  const total = rupees * 100 + fraction;
  if (total === 0 && !options.allowZero) return null;
  return paise(total);
}
