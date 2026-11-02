import { z } from 'zod';
import { ContactIdSchema, PaiseSchema, PhoneSchema, TxnSchema } from '@pp/contracts-domain';
import { defineEndpoint } from './define';
import { BalanceSchema } from './common';

export const RecipientSchema = z.union([
  z.object({ phone: PhoneSchema }),
  z.object({ contactId: ContactIdSchema }),
]);
export type Recipient = z.infer<typeof RecipientSchema>;

export const transfers = {
  'transfers.send': defineEndpoint({
    method: 'POST',
    path: '/transfers',
    auth: true,
    idempotent: true,
    body: z.object({
      to: RecipientSchema,
      amount: PaiseSchema,
      note: z.string().max(140).optional(),
    }),
    response: z.object({ txn: TxnSchema, balance: BalanceSchema }),
  }),
};
