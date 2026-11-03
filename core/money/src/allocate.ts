import type { Paise } from '@pp/contracts-domain';
import { paise } from './arithmetic';

/**
 * Splits `total` across `weights` using the largest-remainder method.
 * The parts always sum to `total` exactly; ties go to the earlier index.
 */
export function allocate(total: Paise, weights: readonly number[]): Paise[] {
  if (total < 0) throw new RangeError('Cannot allocate a negative total');
  if (weights.length === 0) throw new RangeError('At least one weight is required');
  if (!weights.every((w) => Number.isInteger(w) && w >= 0)) {
    throw new RangeError('Weights must be non-negative integers');
  }
  const weightSum = weights.reduce((a, b) => a + b, 0);
  if (weightSum <= 0) throw new RangeError('Weights must not all be zero');

  const totalBig = BigInt(total);
  const sumBig = BigInt(weightSum);
  const parts = weights.map((w) => {
    const scaled = totalBig * BigInt(w);
    return { base: scaled / sumBig, remainder: scaled % sumBig };
  });

  const assigned = parts.reduce((acc, p) => acc + p.base, 0n);
  let leftover = Number(totalBig - assigned);

  const order = parts
    .map((p, index) => ({ index, remainder: p.remainder }))
    .sort((a, b) =>
      a.remainder === b.remainder ? a.index - b.index : a.remainder > b.remainder ? -1 : 1,
    );

  const result = parts.map((p) => Number(p.base));
  for (const { index } of order) {
    if (leftover === 0) break;
    const weight = weights[index] ?? 0;
    if (weight === 0) continue;
    result[index] = (result[index] ?? 0) + 1;
    leftover -= 1;
  }
  return result.map(paise);
}

/** Equal split of `total` across `count` people; earlier people absorb the remainder. */
export const splitEvenly = (total: Paise, count: number): Paise[] =>
  allocate(
    total,
    Array.from({ length: count }, () => 1),
  );
