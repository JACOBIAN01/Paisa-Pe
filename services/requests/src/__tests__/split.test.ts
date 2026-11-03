import type { ContactId, Paise } from '@pp/contracts-domain';
import { paise } from '@pp/core-money';
import { unwrap } from '@pp/core-result';
import { computeSplit, MIN_SHARE, type SplitParticipant } from '../split';

const people = (n: number, withSelf = false): SplitParticipant[] => [
  ...(withSelf ? [{ ref: 'self' as const }] : []),
  ...Array.from({ length: n }, (_, i) => ({ ref: `ct_${i}` as ContactId })),
];

const sumOf = (values: readonly number[]): number => values.reduce((a, b) => a + b, 0);

describe('computeSplit: equal', () => {
  it('always adds up to the bill for many totals and group sizes', () => {
    for (let total = 1000; total <= 200_003; total += 997) {
      for (let n = 1; n <= 12; n += 1) {
        const plan = computeSplit(paise(total), people(n), 'equal');
        if (!plan.ok) {
          expect(Math.floor(total / n)).toBeLessThan(MIN_SHARE);
          continue;
        }
        expect(sumOf(plan.value.parts.map((p) => p.share))).toBe(total);
        const shares = plan.value.parts.map((p) => p.share);
        expect(Math.max(...shares) - Math.min(...shares)).toBeLessThanOrEqual(1);
      }
    }
  });

  it('gives the leftover paise to earlier people', () => {
    const plan = unwrap(computeSplit(paise(10_000), people(3), 'equal'));
    expect(plan.parts.map((p) => p.share)).toEqual([3334, 3333, 3333]);
  });

  it('keeps the requester slice out of the requested shares', () => {
    const plan = unwrap(computeSplit(paise(10_000), people(3, true), 'equal'));
    expect(plan.shares).toHaveLength(3);
    expect(plan.selfShare).toBe(2500);
    expect(sumOf(plan.shares.map((s) => s.share)) + plan.selfShare).toBe(10_000);
  });
});

describe('computeSplit: percent', () => {
  it('allocates by basis points with exact remainder handling', () => {
    const parts = people(3).map((p, i) => ({ ...p, percentBps: [3333, 3333, 3334][i] }));
    const plan = unwrap(computeSplit(paise(100_001), parts, 'percent'));
    expect(sumOf(plan.parts.map((p) => p.share))).toBe(100_001);
  });

  it('rejects percentages that do not total 100', () => {
    const parts = people(2).map((p) => ({ ...p, percentBps: 4000 }));
    const result = computeSplit(paise(5000), parts, 'percent');
    expect(result.ok).toBe(false);
  });
});

describe('computeSplit: custom', () => {
  it('accepts amounts that add up exactly', () => {
    const parts = people(2).map((p, i) => ({ ...p, amount: paise([3000, 2000][i] as number) }));
    expect(computeSplit(paise(5000), parts, 'custom').ok).toBe(true);
  });

  it('rejects amounts that are short or over', () => {
    const parts = (a: number, b: number) =>
      people(2).map((p, i) => ({ ...p, amount: paise([a, b][i] as number) }));
    expect(computeSplit(paise(5000), parts(3000, 1999), 'custom').ok).toBe(false);
    expect(computeSplit(paise(5000), parts(3000, 2001), 'custom').ok).toBe(false);
  });
});

describe('computeSplit: validation', () => {
  it.each([0, -100])('rejects total %d', (total) => {
    expect(computeSplit(total as Paise, people(2), 'equal').ok).toBe(false);
  });

  it('rejects empty groups, duplicates and oversized groups', () => {
    expect(computeSplit(paise(5000), [], 'equal').ok).toBe(false);
    const dup = [{ ref: 'ct_1' as ContactId }, { ref: 'ct_1' as ContactId }];
    expect(computeSplit(paise(5000), dup, 'equal').ok).toBe(false);
    expect(computeSplit(paise(999_999), people(51), 'equal').ok).toBe(false);
  });

  it('rejects shares below the minimum', () => {
    expect(computeSplit(paise(150), people(2), 'equal').ok).toBe(false);
  });
});
