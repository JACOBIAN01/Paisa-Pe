import { z } from 'zod';
import { CouponIdSchema, ScratchCardIdSchema, TxnIdSchema } from './ids';
import { EpochMsSchema, PaiseSchema } from './money';

export const CouponSchema = z.object({
  id: CouponIdSchema,
  code: z.string(),
  title: z.string(),
  description: z.string(),
  kind: z.enum(['flat', 'percent']),
  /** Paise for `flat`, basis points for `percent`. */
  value: z.number().int().positive(),
  minSpend: PaiseSchema,
  maxDiscount: PaiseSchema.optional(),
  expiresAt: EpochMsSchema,
  status: z.enum(['available', 'redeemed', 'expired']),
});
export type Coupon = z.infer<typeof CouponSchema>;

export const CashbackSchema = z.object({
  txnId: TxnIdSchema,
  amount: PaiseSchema,
  status: z.enum(['pending', 'credited']),
  createdAt: EpochMsSchema,
});
export type Cashback = z.infer<typeof CashbackSchema>;

export const ScratchCardSchema = z.object({
  id: ScratchCardIdSchema,
  state: z.enum(['unscratched', 'revealed']),
  reward: PaiseSchema.optional(),
  expiresAt: EpochMsSchema,
});
export type ScratchCard = z.infer<typeof ScratchCardSchema>;

export const ReferralSchema = z.object({
  code: z.string(),
  invited: z.number().int().nonnegative(),
  earned: PaiseSchema,
});
export type Referral = z.infer<typeof ReferralSchema>;
