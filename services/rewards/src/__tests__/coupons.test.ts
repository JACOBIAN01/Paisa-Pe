import type { Coupon, CouponId, Paise } from '@pp/contracts-domain';
import { paise } from '@pp/core-money';
import { evaluateCoupon, rankCoupons } from '../coupons';

const NOW = 1_000_000;

const coupon = (extra: Partial<Coupon> = {}): Coupon => ({
  id: 'c1' as CouponId,
  code: 'SAVE',
  title: 'Save',
  description: 'Save money',
  kind: 'flat',
  value: 5000,
  minSpend: paise(10_000),
  expiresAt: NOW + 1000,
  status: 'available',
  ...extra,
});

describe('evaluateCoupon', () => {
  it('applies a flat discount', () => {
    expect(evaluateCoupon(coupon(), paise(20_000), NOW)).toEqual({
      eligible: true,
      discount: 5000,
      payable: 15_000,
    });
  });

  it('never discounts more than the spend', () => {
    const result = evaluateCoupon(coupon({ value: 50_000, minSpend: paise(0) }), paise(300), NOW);
    expect(result).toEqual({ eligible: true, discount: 300, payable: 0 });
  });

  it('applies percent discounts in basis points, half-up', () => {
    const c = coupon({ kind: 'percent', value: 1250, minSpend: paise(0) });
    expect(evaluateCoupon(c, paise(10_001), NOW)).toMatchObject({ discount: 1250 }); // 1250.125
    expect(evaluateCoupon(c, paise(10_004), NOW)).toMatchObject({ discount: 1251 }); // 1250.5
  });

  it('caps percent discounts at maxDiscount', () => {
    const c = coupon({ kind: 'percent', value: 2000, maxDiscount: paise(1500) });
    expect(evaluateCoupon(c, paise(50_000), NOW)).toMatchObject({ discount: 1500 });
  });

  it('explains why a coupon does not apply', () => {
    expect(evaluateCoupon(coupon(), paise(9_999), NOW)).toEqual({
      eligible: false,
      reason: 'below_min_spend',
      shortBy: 1,
    });
    expect(evaluateCoupon(coupon({ status: 'redeemed' }), paise(20_000), NOW)).toMatchObject({
      reason: 'redeemed',
    });
    expect(evaluateCoupon(coupon({ expiresAt: NOW - 1 }), paise(20_000), NOW)).toMatchObject({
      reason: 'expired',
    });
    expect(evaluateCoupon(coupon({ status: 'expired' }), paise(20_000), NOW)).toMatchObject({
      reason: 'expired',
    });
  });

  it('accepts a spend exactly at the minimum and a coupon expiring right now', () => {
    expect(evaluateCoupon(coupon({ expiresAt: NOW }), paise(10_000), NOW).eligible).toBe(true);
  });
});

describe('rankCoupons', () => {
  it('orders by discount, then earlier expiry, then code', () => {
    const list = [
      coupon({ id: 'a' as CouponId, code: 'B', value: 1000, minSpend: paise(0) }),
      coupon({ id: 'b' as CouponId, code: 'A', value: 3000, minSpend: paise(0) }),
      coupon({
        id: 'c' as CouponId,
        code: 'C',
        value: 1000,
        minSpend: paise(0),
        expiresAt: NOW + 5,
      }),
      coupon({
        id: 'd' as CouponId,
        code: 'D',
        value: 9000,
        minSpend: paise(0),
        status: 'redeemed',
      }),
    ];
    const ranked = rankCoupons(list, 20_000 as Paise, NOW);
    expect(ranked.map((r) => r.coupon.id)).toEqual(['b', 'c', 'a']);
  });
});
