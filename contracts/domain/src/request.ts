import { z } from 'zod';
import { ContactIdSchema, RequestIdSchema, SplitIdSchema, UserIdSchema } from './ids';
import { EpochMsSchema, PaiseSchema } from './money';

export const RequestStatusSchema = z.enum(['pending', 'paid', 'declined', 'cancelled', 'expired']);
export type RequestStatus = z.infer<typeof RequestStatusSchema>;

export const MoneyRequestSchema = z.object({
  id: RequestIdSchema,
  requesterId: UserIdSchema,
  payerId: UserIdSchema,
  amount: PaiseSchema,
  note: z.string().max(140).optional(),
  status: RequestStatusSchema,
  splitId: SplitIdSchema.optional(),
  createdAt: EpochMsSchema,
  updatedAt: EpochMsSchema,
  expiresAt: EpochMsSchema,
});
export type MoneyRequest = z.infer<typeof MoneyRequestSchema>;

export const SplitShareSchema = z.object({
  contactId: ContactIdSchema,
  share: PaiseSchema,
});
export type SplitShare = z.infer<typeof SplitShareSchema>;

export const SplitBillSchema = z.object({
  id: SplitIdSchema,
  createdBy: UserIdSchema,
  total: PaiseSchema,
  shares: z.array(SplitShareSchema).min(1),
  note: z.string().max(140).optional(),
  createdAt: EpochMsSchema,
});
export type SplitBill = z.infer<typeof SplitBillSchema>;
