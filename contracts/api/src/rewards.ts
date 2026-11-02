import { z } from 'zod';
import {
  CashbackSchema,
  CouponSchema,
  ReferralSchema,
  ScratchCardSchema,
} from '@pp/contracts-domain';
import { defineEndpoint } from './define';
import { BalanceSchema, IdParamsSchema } from './common';

export const rewards = {
  'rewards.coupons': defineEndpoint({
    method: 'GET',
    path: '/rewards/coupons',
    auth: true,
    response: z.object({ items: z.array(CouponSchema) }),
  }),
  'rewards.redeemCoupon': defineEndpoint({
    method: 'POST',
    path: '/rewards/coupons/:id/redeem',
    auth: true,
    params: IdParamsSchema,
    response: z.object({ coupon: CouponSchema }),
  }),
  'rewards.cashback': defineEndpoint({
    method: 'GET',
    path: '/rewards/cashback',
    auth: true,
    response: z.object({ items: z.array(CashbackSchema) }),
  }),
  'rewards.scratchCards': defineEndpoint({
    method: 'GET',
    path: '/rewards/scratch-cards',
    auth: true,
    response: z.object({ items: z.array(ScratchCardSchema) }),
  }),
  'rewards.scratch': defineEndpoint({
    method: 'POST',
    path: '/rewards/scratch-cards/:id/scratch',
    auth: true,
    idempotent: true,
    params: IdParamsSchema,
    response: z.object({ card: ScratchCardSchema, balance: BalanceSchema }),
  }),
  'rewards.referral': defineEndpoint({
    method: 'GET',
    path: '/rewards/referral',
    auth: true,
    response: z.object({ referral: ReferralSchema }),
  }),
};
