import type { Limits, Paise } from '@pp/contracts-domain';
import { canUpgrade } from './kyc';
import type { CheckKind, LimitCheck } from './types';

export interface CheckInput {
  amount: Paise;
  kind?: CheckKind;
  /** Current wallet balance, needed for the wallet cap on `add_money`. */
  balance?: Paise;
}

/**
 * Pure client-side pre-check. The server stays authoritative; this only avoids
 * sending requests that are certain to be rejected.
 */
export function checkAgainst(
  limits: Limits,
  { amount, kind = 'send', balance }: CheckInput,
): LimitCheck {
  if (kind === 'add_money') {
    if (balance !== undefined && balance + amount > limits.walletCap) {
      return { ok: false, reason: 'wallet_cap' };
    }
    return { ok: true };
  }
  if (amount > limits.perTxn) {
    return { ok: false, reason: canUpgrade(limits.tier) ? 'kyc_required' : 'per_txn' };
  }
  if (limits.daily.used + amount > limits.daily.limit) return { ok: false, reason: 'daily' };
  if (limits.monthly.used + amount > limits.monthly.limit) return { ok: false, reason: 'monthly' };
  return { ok: true };
}

/** Returns a copy of `limits` with a completed spend applied to the usage counters. */
export function applySpend(limits: Limits, amount: Paise): Limits {
  return {
    ...limits,
    daily: { ...limits.daily, used: (limits.daily.used + amount) as Paise },
    monthly: { ...limits.monthly, used: (limits.monthly.used + amount) as Paise },
  };
}
