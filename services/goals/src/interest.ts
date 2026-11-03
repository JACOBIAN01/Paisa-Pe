import type { InterestPreview, Paise } from '@pp/contracts-domain';
import { paise } from '@pp/core-money';

const BPS = 10_000n;
const MONTHS_PER_YEAR = 12n;

/** Simple interest: principal × apy × months / 12, rounded half-up, in exact integer math. */
export function interestPreview(principal: Paise, apyBps: number, months: number): InterestPreview {
  if (!Number.isSafeInteger(principal) || principal <= 0) {
    throw new RangeError('Principal must be a positive amount');
  }
  if (!Number.isInteger(apyBps) || apyBps < 0) throw new RangeError('apyBps must be >= 0');
  if (!Number.isInteger(months) || months <= 0) throw new RangeError('months must be positive');

  const denominator = BPS * MONTHS_PER_YEAR;
  const numerator = BigInt(principal) * BigInt(apyBps) * BigInt(months);
  const interest = paise(Number((numerator * 2n + denominator) / (denominator * 2n)));
  return { principal, months, interest, maturity: paise(principal + interest) };
}
