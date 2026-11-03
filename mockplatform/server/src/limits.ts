import type { Limits, KycTier, UserId } from '@pp/contracts-domain';
import { LIMITED_TYPES, istDayStart, istMonthStart, paise, type Database } from '@pp/mock-db';
import { fail } from './errors';

interface TierLimits {
  perTxn: number;
  daily: number;
  monthly: number;
  walletCap: number;
}

export const TIER_LIMITS: Record<KycTier, TierLimits> = {
  min: { perTxn: 500_000, daily: 1_000_000, monthly: 5_000_000, walletCap: 1_000_000 },
  basic: { perTxn: 2_500_000, daily: 5_000_000, monthly: 20_000_000, walletCap: 10_000_000 },
  full: { perTxn: 10_000_000, daily: 20_000_000, monthly: 100_000_000, walletCap: 100_000_000 },
};

export const NEXT_TIER: Record<KycTier, KycTier | undefined> = {
  min: 'basic',
  basic: 'full',
  full: undefined,
};

function spentSince(db: Database, userId: UserId, since: number): number {
  return db.t.txns
    .filter(
      (t) =>
        t.ownerId === userId &&
        t.status === 'success' &&
        LIMITED_TYPES.has(t.type) &&
        t.createdAt >= since,
    )
    .reduce((sum, t) => sum + t.amount + t.fee, 0);
}

function tierOf(db: Database, userId: UserId): KycTier {
  const record = db.t.users.get(userId);
  if (!record) throw fail('unauthorized', 'Unknown user');
  return record.user.kycTier;
}

export function computeLimits(db: Database, userId: UserId, now: number): Limits {
  const tier = tierOf(db, userId);
  const limits = TIER_LIMITS[tier];
  return {
    tier,
    perTxn: paise(limits.perTxn),
    daily: { limit: paise(limits.daily), used: paise(spentSince(db, userId, istDayStart(now))) },
    monthly: {
      limit: paise(limits.monthly),
      used: paise(spentSince(db, userId, istMonthStart(now))),
    },
    walletCap: paise(limits.walletCap),
    asOf: now,
  };
}

function breach(
  db: Database,
  userId: UserId,
  now: number,
  total: number,
): { limit: string; max: number; used: number } | undefined {
  const l = computeLimits(db, userId, now);
  if (total > l.perTxn) return { limit: 'perTxn', max: l.perTxn, used: 0 };
  if (l.daily.used + total > l.daily.limit)
    return { limit: 'daily', max: l.daily.limit, used: l.daily.used };
  if (l.monthly.used + total > l.monthly.limit)
    return { limit: 'monthly', max: l.monthly.limit, used: l.monthly.used };
  return undefined;
}

/** Throws when spending `total` paise (amount plus fee) would breach a tier limit. */
export function assertCanSpend(db: Database, userId: UserId, now: number, total: number): void {
  const found = breach(db, userId, now, total);
  if (!found) return;
  const tier = tierOf(db, userId);
  const next = NEXT_TIER[tier];
  const details = { ...found, tier };
  if (next && TIER_LIMITS[next][found.limit as keyof TierLimits] >= total) {
    throw fail('kyc_required', 'Complete KYC to raise your limit', { ...details, upgradeTo: next });
  }
  throw fail('limit_exceeded', 'Transaction limit exceeded', details);
}

export function assertWithinPerTxn(db: Database, userId: UserId, total: number): void {
  const tier = tierOf(db, userId);
  if (total > TIER_LIMITS[tier].perTxn) {
    throw fail('limit_exceeded', 'Amount exceeds the per-transaction limit', {
      limit: 'perTxn',
      max: TIER_LIMITS[tier].perTxn,
      tier,
    });
  }
}

export function assertCanHold(
  db: Database,
  userId: UserId,
  incoming: number,
  receiver = false,
): void {
  const wallet = db.t.wallets.get(userId);
  const cap = TIER_LIMITS[tierOf(db, userId)].walletCap;
  if (wallet && wallet.balance + incoming > cap) {
    throw fail(
      'limit_exceeded',
      receiver ? 'Recipient cannot receive this amount' : 'Wallet limit exceeded',
      {
        limit: 'walletCap',
        max: cap,
        receiver,
      },
    );
  }
}
