import type { Goal, GoalId, Paise } from '@pp/contracts-domain';
import { paise } from '@pp/core-money';
import { interestPreview } from '../interest';
import { goalProgress, monthlyNeeded, monthsUntil } from '../progress';

describe('interestPreview', () => {
  it('computes simple interest', () => {
    expect(interestPreview(paise(1_000_000), 650, 12)).toEqual({
      principal: 1_000_000,
      months: 12,
      interest: 65_000,
      maturity: 1_065_000,
    });
  });

  it('rounds half-up', () => {
    // 1_000 * 650 * 1 / 120_000 = 5.4166 -> 5 ; 1_100 -> 5.958 -> 6
    expect(interestPreview(paise(1_000), 650, 1).interest).toBe(5);
    expect(interestPreview(paise(1_100), 650, 1).interest).toBe(6);
    // exactly .5: 120_000 * 0.5 -> principal 12_000, apy 5, months 1 => 0.5 -> 1
    expect(interestPreview(paise(12_000), 5, 1).interest).toBe(1);
  });

  it('is exact for very large principals', () => {
    const preview = interestPreview(paise(9_000_000_000_000), 1200, 60);
    expect(preview.interest).toBe(5_400_000_000_000);
  });

  it('rejects invalid input', () => {
    expect(() => interestPreview(0 as Paise, 650, 1)).toThrow(RangeError);
    expect(() => interestPreview(paise(100), -1, 1)).toThrow(RangeError);
    expect(() => interestPreview(paise(100), 650, 0)).toThrow(RangeError);
  });
});

const goal = (extra: Partial<Goal> = {}): Goal => ({
  id: 'g1' as GoalId,
  name: 'Trip',
  emoji: '✈️',
  target: paise(100_000),
  saved: paise(25_000),
  apyBps: 650,
  createdAt: 0,
  ...extra,
});

describe('goal progress', () => {
  it('reports progress in basis points, capped at 100%', () => {
    expect(goalProgress(goal()).progressBps).toBe(2500);
    expect(goalProgress(goal({ saved: paise(250_000) }))).toMatchObject({
      progressBps: 10_000,
      remaining: 0,
      reached: true,
    });
  });

  it('works out the monthly amount needed, rounded up', () => {
    const now = 0;
    const deadline = 3 * 30 * 24 * 60 * 60 * 1000;
    expect(monthsUntil(deadline, now)).toBe(3);
    expect(monthlyNeeded(goal({ deadline }), now)).toBe(25_000);
    expect(monthlyNeeded(goal({ deadline, saved: paise(1) }), now)).toBe(33_333);
    expect(monthlyNeeded(goal(), now)).toBeNull();
  });
});
