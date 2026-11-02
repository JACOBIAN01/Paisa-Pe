import { z } from 'zod';
import { IdempotencyKeySchema, TxnIdSchema, UserIdSchema } from './ids';
import { EpochMsSchema, PaiseSchema } from './money';
import { PhoneSchema } from './user';

export const TXN_TYPES = [
  'p2p_send',
  'p2p_receive',
  'add_money',
  'bill_pay',
  'recharge',
  'cashback',
  'refund',
  'goal_deposit',
  'goal_withdraw',
] as const;
export const TxnTypeSchema = z.enum(TXN_TYPES);
export type TxnType = z.infer<typeof TxnTypeSchema>;

export const TxnStatusSchema = z.enum(['pending', 'success', 'failed', 'reversed']);
export type TxnStatus = z.infer<typeof TxnStatusSchema>;

export const CounterpartySchema = z.object({
  userId: UserIdSchema.optional(),
  name: z.string(),
  phone: PhoneSchema.optional(),
});
export type Counterparty = z.infer<typeof CounterpartySchema>;

export const TxnSchema = z.object({
  id: TxnIdSchema,
  type: TxnTypeSchema,
  status: TxnStatusSchema,
  /** Amount moved, always positive. Direction comes from `type`. */
  amount: PaiseSchema,
  fee: PaiseSchema,
  balanceAfter: PaiseSchema,
  counterparty: CounterpartySchema.optional(),
  note: z.string().max(140).optional(),
  idempotencyKey: IdempotencyKeySchema.optional(),
  createdAt: EpochMsSchema,
  updatedAt: EpochMsSchema,
});
export type Txn = z.infer<typeof TxnSchema>;

export const TxnPageSchema = z.object({
  items: z.array(TxnSchema),
  nextCursor: z.string().nullable(),
});
export type TxnPage = z.infer<typeof TxnPageSchema>;
