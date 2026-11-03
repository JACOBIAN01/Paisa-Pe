import type { Coupon } from '@pp/contracts-domain';
import { t } from '@pp/core-i18n';
import { formatPaise, paise } from '@pp/core-money';
import type { CouponEvaluation } from '@pp/svc-rewards';

export const DEFAULT_SPEND_TEXT = '500';

export interface CouponView {
  eligible: boolean;
  label: string;
  tone: 'success' | 'warning' | 'neutral';
}

export function describeCoupon(evaluation: CouponEvaluation): CouponView {
  if (evaluation.eligible) {
    return {
      eligible: true,
      label: t('rewards.saves', { amount: formatPaise(evaluation.discount) }),
      tone: 'success',
    };
  }
  switch (evaluation.reason) {
    case 'redeemed':
      return { eligible: false, label: t('rewards.redeemedLabel'), tone: 'neutral' };
    case 'expired':
      return { eligible: false, label: t('rewards.expiredLabel'), tone: 'neutral' };
    case 'below_min_spend':
      return {
        eligible: false,
        label: t('rewards.spendMore', { amount: formatPaise(evaluation.shortBy ?? paise(0)) }),
        tone: 'warning',
      };
  }
}

export const couponCanBeRedeemed = (coupon: Coupon, view: CouponView): boolean =>
  view.eligible && coupon.status === 'available';
