import { z } from 'zod';
import { EpochMsSchema, PaiseSchema } from './money';
import { KycTierSchema } from './user';

const UsageSchema = z.object({ limit: PaiseSchema, used: PaiseSchema });

export const LimitsSchema = z.object({
  tier: KycTierSchema,
  perTxn: PaiseSchema,
  daily: UsageSchema,
  monthly: UsageSchema,
  walletCap: PaiseSchema,
  asOf: EpochMsSchema,
});
export type Limits = z.infer<typeof LimitsSchema>;

export const KycStatusSchema = z.object({
  tier: KycTierSchema,
  state: z.enum(['none', 'in_review', 'approved', 'rejected']),
});
export type KycStatus = z.infer<typeof KycStatusSchema>;
