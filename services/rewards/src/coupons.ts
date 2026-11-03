import type { Coupon, EpochMs, Paise } from '@pp/contracts-domain';
import { min, paise, percentOf } from '@pp/core-money';

export type IneligibleReason = 'redeemed' | 'expired' | 'below_min_spend';

export type CouponEvaluation =
  | { eligible: true; discount: Paise; payable: Paise }
  | { eligible: false; reason: IneligibleReason; shortBy?: Paise };

/** What `coupon` takes off `spend` right now. Integer arithmetic only. */
export function evaluateCoupon(coupon: Coupon, spend: Paise, now: EpochMs): CouponEvaluation {
  if (coupon.status === 'redeemed') return { eligible: false, reason: 'redeemed' };
  if (coupon.status === 'expired' || coupon.expiresAt < now) {
    return { eligible: false, reason: 'expired' };
  }
  if (spend < coupon.minSpend) {
    return {
      eligible: false,
      reason: 'below_min_spend',
      shortBy: paise(coupon.minSpend - spend),
    };
  }
  const raw = coupon.kind === 'flat' ? paise(coupon.value) : percentOf(spend, coupon.value);
  const capped = coupon.maxDiscount === undefined ? raw : min(raw, coupon.maxDiscount);
  const discount = min(capped, spend);
  return { eligible: true, discount, payable: paise(spend - discount) };
}

export interface RankedCoupon {
  coupon: Coupon;
  discount: Paise;
  payable: Paise;
}

/** Eligible coupons for `spend`, best discount first (ties: earlier expiry, then code). */
export function rankCoupons(
  coupons: readonly Coupon[],
  spend: Paise,
  now: EpochMs,
): RankedCoupon[] {
  const ranked: RankedCoupon[] = [];
  for (const coupon of coupons) {
    const result = evaluateCoupon(coupon, spend, now);
    if (result.eligible)
      ranked.push({ coupon, discount: result.discount, payable: result.payable });
  }
  return ranked.sort(
    (a, b) =>
      b.discount - a.discount ||
      a.coupon.expiresAt - b.coupon.expiresAt ||
      a.coupon.code.localeCompare(b.coupon.code),
  );
}
