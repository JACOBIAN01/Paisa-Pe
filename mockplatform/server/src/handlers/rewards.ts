import { postTxn } from '@pp/mock-db';
import { fail } from '../errors';
import type { Registry } from '../context';
import { assertCanHold } from '../limits';
import { balanceView } from './shared';

export function registerRewards(r: Registry): void {
  r.auth('rewards.coupons', ({ db, now, userId }) => {
    const items = db.t.coupons
      .filter((c) => c.ownerId === userId)
      .map(({ coupon }) =>
        coupon.status === 'available' && coupon.expiresAt < now
          ? { ...coupon, status: 'expired' as const }
          : coupon,
      );
    return { items };
  });

  r.auth('rewards.redeemCoupon', ({ db, now, userId, params }) => {
    const record = db.t.coupons.find((c) => c.ownerId === userId && c.coupon.id === params.id);
    if (!record) throw fail('not_found', 'Coupon not found');
    const { coupon } = record;
    if (coupon.status === 'redeemed') throw fail('conflict', 'Coupon already redeemed');
    if (coupon.status === 'expired' || coupon.expiresAt < now)
      throw fail('conflict', 'Coupon has expired');
    coupon.status = 'redeemed';
    return { coupon };
  });

  r.auth('rewards.cashback', ({ db, userId }) => ({
    items: db.t.cashbacks.filter((c) => c.ownerId === userId).map((c) => c.cashback),
  }));

  r.auth('rewards.scratchCards', ({ db, userId }) => ({
    items: db.t.scratchCards.filter((c) => c.ownerId === userId).map((c) => c.card),
  }));

  r.auth('rewards.scratch', ({ db, now, userId, params, idempotencyKey }) => {
    const record = db.t.scratchCards.find((c) => c.ownerId === userId && c.card.id === params.id);
    if (!record) throw fail('not_found', 'Scratch card not found');
    if (record.card.state === 'revealed') throw fail('conflict', 'Card already scratched');
    if (record.card.expiresAt < now) throw fail('conflict', 'Card has expired');
    assertCanHold(db, userId, record.prize);
    record.card.state = 'revealed';
    record.card.reward = record.prize;
    postTxn(db, now, {
      ownerId: userId,
      type: 'cashback',
      amount: record.prize,
      counterparty: { name: 'Scratch card' },
      idempotencyKey,
    });
    return { card: record.card, balance: balanceView(db, userId, now) };
  });

  r.auth('rewards.referral', ({ db, userId }) => {
    const record = db.t.users.get(userId);
    if (!record) throw fail('unauthorized', 'Unknown user');
    return { referral: record.referral };
  });
}
