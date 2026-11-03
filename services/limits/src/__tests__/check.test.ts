import type { Paise } from '@pp/contracts-domain';
import { applySpend, checkAgainst } from '../check';
import { canUpgrade, nextTier, tierAtLeast, tierRank } from '../kyc';
import { sampleLimits } from './helpers';

const p = (n: number): Paise => n as Paise;

describe('checkAgainst (send)', () => {
  it('allows amounts within every limit, including exactly at them', () => {
    const limits = sampleLimits({ perTxn: p(1000), daily: { limit: p(1000), used: p(0) } });
    expect(checkAgainst(limits, { amount: p(1000) })).toEqual({ ok: true });
  });

  it('flags per-transaction overruns for the top tier', () => {
    expect(checkAgainst(sampleLimits(), { amount: p(100_000_01) })).toEqual({
      ok: false,
      reason: 'per_txn',
    });
  });

  it('asks for KYC when a lower tier exceeds the per-transaction limit', () => {
    const limits = sampleLimits({ tier: 'basic', perTxn: p(10_000_00) });
    expect(checkAgainst(limits, { amount: p(10_000_01) })).toEqual({
      ok: false,
      reason: 'kyc_required',
    });
  });

  it('flags the daily and monthly limits using what is already used', () => {
    const daily = sampleLimits({ daily: { limit: p(5000), used: p(4000) } });
    expect(checkAgainst(daily, { amount: p(1001) })).toEqual({ ok: false, reason: 'daily' });
    expect(checkAgainst(daily, { amount: p(1000) })).toEqual({ ok: true });
    const monthly = sampleLimits({ monthly: { limit: p(9000), used: p(8500) } });
    expect(checkAgainst(monthly, { amount: p(501) })).toEqual({ ok: false, reason: 'monthly' });
  });
});

describe('checkAgainst (add money)', () => {
  const limits = sampleLimits({ walletCap: p(10_000) });
  it('enforces the wallet cap against the balance', () => {
    expect(checkAgainst(limits, { amount: p(2000), kind: 'add_money', balance: p(8001) })).toEqual({
      ok: false,
      reason: 'wallet_cap',
    });
    expect(checkAgainst(limits, { amount: p(2000), kind: 'add_money', balance: p(8000) })).toEqual({
      ok: true,
    });
  });
  it('does not apply send limits', () => {
    const tight = sampleLimits({ perTxn: p(1), walletCap: p(10_000) });
    expect(checkAgainst(tight, { amount: p(5000), kind: 'add_money', balance: p(0) }).ok).toBe(
      true,
    );
  });
});

describe('applySpend', () => {
  it('adds to both usage counters without mutating the input', () => {
    const before = sampleLimits({ daily: { limit: p(5000), used: p(100) } });
    const after = applySpend(before, p(250));
    expect(after.daily.used).toBe(350);
    expect(after.monthly.used).toBe(250);
    expect(before.daily.used).toBe(100);
  });
});

describe('kyc tiers', () => {
  it('orders tiers and finds the next one', () => {
    expect(tierRank('min')).toBeLessThan(tierRank('basic'));
    expect(nextTier('min')).toBe('basic');
    expect(nextTier('basic')).toBe('full');
    expect(nextTier('full')).toBeNull();
    expect(canUpgrade('full')).toBe(false);
    expect(tierAtLeast('full', 'basic')).toBe(true);
    expect(tierAtLeast('min', 'basic')).toBe(false);
  });
});
