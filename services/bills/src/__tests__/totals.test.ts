import type { BillLineItem } from '@pp/contracts-domain';
import { paise } from '@pp/core-money';
import { compareWithTxn, computeBillTotal } from '../totals';

const item = (label: string, amount: number, feeBps: number): BillLineItem => ({
  label,
  amount: paise(amount),
  feeBps,
});

describe('computeBillTotal', () => {
  it('rounds each line half-up once, then sums', () => {
    // 12.5 -> 13, 12.5 -> 13 : per-line total 26, while the pooled fee would be 25.
    const total = computeBillTotal([item('a', 2500, 50), item('b', 2500, 50)]);
    expect(total.lines.map((l) => l.fee)).toEqual([13, 13]);
    expect(total.fee).toBe(26);
    expect(total.subtotal).toBe(5000);
    expect(total.total).toBe(5026);
  });

  it('matches an exact reference for many amounts and rates', () => {
    for (let amount = 1; amount < 5000; amount += 37) {
      for (const bps of [0, 25, 50, 118, 250, 999]) {
        const expected = Number((BigInt(amount) * BigInt(bps) * 2n + 10_000n) / 20_000n);
        const { fee } = computeBillTotal([item('x', amount, bps)]);
        expect(fee).toBe(expected);
      }
    }
  });

  it('never accumulates drift across a long list of lines', () => {
    const lines = Array.from({ length: 200 }, (_, i) => item(`l${i}`, 101 + i, 175));
    const total = computeBillTotal(lines);
    const reference = lines.reduce(
      (acc, l) => acc + Number((BigInt(l.amount) * 175n * 2n + 10_000n) / 20_000n),
      0,
    );
    expect(total.fee).toBe(reference);
    expect(Number.isInteger(total.total)).toBe(true);
  });

  it('handles zero fee lines', () => {
    expect(computeBillTotal([item('a', 1234, 0)])).toMatchObject({ fee: 0, total: 1234 });
  });
});

describe('compareWithTxn', () => {
  it('reports exact matches and signed differences', () => {
    const expected = computeBillTotal([item('a', 2500, 50), item('b', 2500, 50)]);
    expect(compareWithTxn(expected, { amount: paise(5000), fee: paise(26) }).matches).toBe(true);
    expect(compareWithTxn(expected, { amount: paise(5000), fee: paise(25) })).toEqual({
      matches: false,
      amountDiff: 0,
      feeDiff: -1,
    });
  });
});
