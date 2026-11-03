import type { Paise } from '@pp/contracts-domain';
import { allocate, splitEvenly } from '../allocate';
import { add, max, min, mul, paise, sub, sum, ZERO } from '../arithmetic';
import { normalizeDigits, toScriptDigits } from '../digits';
import { feeFor, percentOf, sumFees } from '../fees';
import { formatAmountInput, formatPaise, groupIndian } from '../format';
import { parseAmount } from '../parse';

const p = (n: number): Paise => paise(n);

describe('arithmetic', () => {
  it('rejects fractions and unsafe numbers', () => {
    expect(() => paise(1.5)).toThrow(RangeError);
    expect(() => paise(NaN)).toThrow(RangeError);
    expect(() => paise(Number.MAX_SAFE_INTEGER + 2)).toThrow(RangeError);
  });
  it('does integer math', () => {
    expect(add(p(10), p(5))).toBe(15);
    expect(sub(p(10), p(15))).toBe(-5);
    expect(mul(p(250), 3)).toBe(750);
    expect(() => mul(p(250), 0.5)).toThrow(RangeError);
    expect(min(p(1), p(2))).toBe(1);
    expect(max(p(1), p(2))).toBe(2);
    expect(sum([p(1), p(2), p(3)])).toBe(6);
    expect(sum([])).toBe(ZERO);
  });
});

describe('fees', () => {
  it('rounds half-up', () => {
    expect(percentOf(p(1000), 25)).toBe(3); // 2.5 -> 3
    expect(percentOf(p(999), 25)).toBe(2); // 2.4975 -> 2
    expect(percentOf(p(0), 100)).toBe(0);
    expect(feeFor(p(100_000), 150)).toBe(1500);
  });
  it('is exact for large amounts', () => {
    expect(percentOf(p(900_000_000_000), 175)).toBe(15_750_000_000);
  });
  it('rejects bad bps', () => {
    expect(() => percentOf(p(100), -1)).toThrow(RangeError);
    expect(() => percentOf(p(100), 1.5)).toThrow(RangeError);
  });
  it('sums per-line fees exactly', () => {
    const lines = [
      { amount: p(1999), feeBps: 50 },
      { amount: p(1999), feeBps: 50 },
      { amount: p(1999), feeBps: 50 },
    ];
    // each line: 9.995 -> 10
    expect(sumFees(lines)).toBe(30);
    expect(sumFees([])).toBe(0);
  });
});

describe('allocate', () => {
  it('always sums to the total', () => {
    for (const total of [0, 1, 99, 100, 1001, 123_457]) {
      for (const n of [1, 2, 3, 7, 11]) {
        const parts = splitEvenly(p(total), n);
        expect(parts.reduce((a, b) => a + b, 0)).toBe(total);
        expect(Math.max(...parts) - Math.min(...parts)).toBeLessThanOrEqual(1);
      }
    }
  });
  it('gives remainder to earlier people', () => {
    expect(splitEvenly(p(100), 3)).toEqual([34, 33, 33]);
  });
  it('respects weights, including zero weights', () => {
    expect(allocate(p(1000), [1, 3])).toEqual([250, 750]);
    expect(allocate(p(10), [0, 1, 1])).toEqual([0, 5, 5]);
    expect(allocate(p(7), [2, 1, 0])).toEqual([5, 2, 0]);
  });
  it('validates input', () => {
    expect(() => allocate(p(-1), [1])).toThrow(RangeError);
    expect(() => allocate(p(1), [])).toThrow(RangeError);
    expect(() => allocate(p(1), [0, 0])).toThrow(RangeError);
    expect(() => allocate(p(1), [1.5])).toThrow(RangeError);
  });
});

describe('digits', () => {
  it('normalises Devanagari and Bengali digits', () => {
    expect(normalizeDigits('१२३४.५०')).toBe('1234.50');
    expect(normalizeDigits('১২৩৪')).toBe('1234');
    expect(normalizeDigits('abc')).toBe('abc');
  });
  it('converts back to native digits', () => {
    expect(toScriptDigits('1,50.00', 'devanagari')).toBe('१,५०.००');
    expect(toScriptDigits('12', 'bengali')).toBe('১২');
    expect(toScriptDigits('12', 'latin')).toBe('12');
  });
});

describe('parseAmount', () => {
  it.each([
    ['100', 10_000],
    ['100.5', 10_050],
    ['100.50', 10_050],
    ['0.99', 99],
    ['.5', 50],
    ['12.', 1200],
    ['1,234.50', 123_450],
    ['12,34,567', 123_456_700],
    ['1,234,567', 123_456_700],
    ['₹ 2,500', 250_000],
    ['Rs. 99', 9_900],
    ['१२३', 12_300],
    ['১,২৩৪.৫০', 123_450],
  ])('parses %s', (input, expected) => {
    expect(parseAmount(input)).toBe(expected);
  });

  it.each([
    '',
    ' ',
    'abc',
    '1e3',
    '1E3',
    '1,5',
    '1,50',
    '1,5,0',
    '12,3456',
    '1.234',
    '1..2',
    '-5',
    '0',
    '0.00',
    '1,23,4567',
    '+5',
    '1_000',
    '9999999999',
  ])('rejects %j', (input) => {
    expect(parseAmount(input)).toBeNull();
  });

  it('allows zero when asked', () => {
    expect(parseAmount('0', { allowZero: true })).toBe(0);
    expect(parseAmount('0.00', { allowZero: true })).toBe(0);
  });
});

describe('formatAmountInput', () => {
  it.each([
    ['', ''],
    ['1', '1'],
    ['1234', '1,234'],
    ['123456', '1,23,456'],
    ['1234567', '12,34,567'],
    ['0012', '12'],
    ['.', '0.'],
    ['.5', '0.5'],
    ['12.345', '12.34'],
    ['1,2,3', '123'],
    ['1e3', '13'],
    ['₹ 500', '500'],
    ['१२३४', '1,234'],
    ['1.2.3', '1.23'],
  ])('formats %j as %j', (raw, expected) => {
    expect(formatAmountInput(raw)).toBe(expected);
  });

  it('is idempotent and always readable by parseAmount', () => {
    const samples = [
      '',
      '1',
      '12.5',
      '1234567.89',
      '1e3',
      '1,5',
      '১২৩৪',
      '..',
      'abc12.3x',
      '9999999999',
      '0.001',
    ];
    for (const raw of samples) {
      const once = formatAmountInput(raw);
      expect(formatAmountInput(once)).toBe(once);
      const parsed = parseAmount(once, { allowZero: true });
      if (/\d/.test(once)) expect(parsed).not.toBeNull();
    }
  });

  it('agrees with parseAmount on what is displayed', () => {
    expect(parseAmount(formatAmountInput('1,5'))).toBe(1_500);
    expect(parseAmount(formatAmountInput('१२३४.५'))).toBe(123_450);
  });
});

describe('formatPaise', () => {
  it('uses Indian grouping', () => {
    expect(formatPaise(p(12_345_650))).toBe('₹1,23,456.50');
    expect(formatPaise(p(5))).toBe('₹0.05');
    expect(formatPaise(p(100_000_000))).toBe('₹10,00,000.00');
  });
  it('handles negatives, options and native digits', () => {
    expect(formatPaise(p(-250_050))).toBe('-₹2,500.50');
    expect(formatPaise(p(250_000), { dropZeroFraction: true })).toBe('₹2,500');
    expect(formatPaise(p(250_000), { symbol: 'Rs ' })).toBe('Rs 2,500.00');
    expect(formatPaise(p(12_300), { locale: 'hi-IN', nativeDigits: true })).toBe('₹१२३.००');
    expect(formatPaise(p(12_300), { locale: 'hi-IN' })).toBe('₹123.00');
  });
  it('groupIndian leaves short strings alone', () => {
    expect(groupIndian('999')).toBe('999');
    expect(groupIndian('1000')).toBe('1,000');
  });
});
