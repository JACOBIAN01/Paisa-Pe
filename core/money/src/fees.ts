import type { Paise } from '@pp/contracts-domain';
import { add, paise, ZERO } from './arithmetic';

const BPS_DENOMINATOR = 10_000n;

/** `amount * bps / 10_000`, rounded half-up, in exact integer arithmetic. */
export function percentOf(amount: Paise, bps: number): Paise {
  if (!Number.isInteger(bps) || bps < 0) throw new RangeError(`bps must be a non-negative integer`);
  const negative = amount < 0;
  const abs = BigInt(negative ? -amount : amount);
  const rounded = (abs * BigInt(bps) + BPS_DENOMINATOR / 2n) / BPS_DENOMINATOR;
  const value = Number(rounded);
  return paise(negative ? -value : value);
}

export const feeFor = (amount: Paise, bps: number): Paise => percentOf(amount, bps);

export interface FeeLine {
  amount: Paise;
  feeBps: number;
}

/** Total fee for a set of lines: each line is rounded once, half-up, then summed exactly. */
export function sumFees(lines: readonly FeeLine[]): Paise {
  return lines.reduce<Paise>((acc, line) => add(acc, feeFor(line.amount, line.feeBps)), ZERO);
}
