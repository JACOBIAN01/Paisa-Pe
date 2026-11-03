import type { Paise } from '@pp/contracts-domain';

/** Brands an integer number of paise. Throws on fractions, NaN and unsafe integers. */
export function paise(value: number): Paise {
  if (!Number.isSafeInteger(value)) {
    throw new RangeError(`Paise must be a safe integer, received ${value}`);
  }
  return value as Paise;
}

export const ZERO: Paise = paise(0);

export const add = (a: Paise, b: Paise): Paise => paise(a + b);
export const sub = (a: Paise, b: Paise): Paise => paise(a - b);

/** Multiplies by an integer factor (a count, not a rate). */
export const mul = (a: Paise, factor: number): Paise => {
  if (!Number.isInteger(factor))
    throw new RangeError(`Factor must be an integer, received ${factor}`);
  return paise(a * factor);
};

export const min = (a: Paise, b: Paise): Paise => (a <= b ? a : b);
export const max = (a: Paise, b: Paise): Paise => (a >= b ? a : b);

export const sum = (values: readonly Paise[]): Paise =>
  values.reduce<Paise>((acc, v) => add(acc, v), ZERO);

export const isPositive = (a: Paise): boolean => a > 0;
