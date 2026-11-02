import { z } from 'zod';
import { BillerIdSchema } from './ids';
import { EpochMsSchema, PaiseSchema } from './money';

export const BillerSchema = z.object({
  id: BillerIdSchema,
  name: z.string(),
  category: z.enum(['electricity', 'water', 'gas', 'mobile', 'dth', 'broadband']),
});
export type Biller = z.infer<typeof BillerSchema>;

export const BillLineItemSchema = z.object({
  label: z.string(),
  amount: PaiseSchema,
  /** Convenience fee on this line in basis points. */
  feeBps: z.number().int().nonnegative(),
});
export type BillLineItem = z.infer<typeof BillLineItemSchema>;

export const BillDueSchema = z.object({
  billerId: BillerIdSchema,
  accountRef: z.string(),
  items: z.array(BillLineItemSchema).min(1),
  dueAt: EpochMsSchema,
});
export type BillDue = z.infer<typeof BillDueSchema>;

export const AutopaySchema = z.object({
  billerId: BillerIdSchema,
  accountRef: z.string(),
  maxAmount: PaiseSchema,
  enabled: z.boolean(),
});
export type Autopay = z.infer<typeof AutopaySchema>;
