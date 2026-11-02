import { z } from 'zod';
import {
  AutopaySchema,
  BillDueSchema,
  BillLineItemSchema,
  BillerIdSchema,
  BillerSchema,
  PaiseSchema,
  TxnSchema,
} from '@pp/contracts-domain';
import { defineEndpoint } from './define';
import { BalanceSchema } from './common';

export const bills = {
  'bills.billers': defineEndpoint({
    method: 'GET',
    path: '/bills/billers',
    auth: true,
    response: z.object({ items: z.array(BillerSchema) }),
  }),
  'bills.dues': defineEndpoint({
    method: 'GET',
    path: '/bills/dues',
    auth: true,
    response: z.object({ items: z.array(BillDueSchema) }),
  }),
  'bills.pay': defineEndpoint({
    method: 'POST',
    path: '/bills/pay',
    auth: true,
    idempotent: true,
    body: z.object({
      billerId: BillerIdSchema,
      accountRef: z.string(),
      items: z.array(BillLineItemSchema).min(1),
    }),
    response: z.object({ txn: TxnSchema, balance: BalanceSchema }),
  }),
  'bills.recharge': defineEndpoint({
    method: 'POST',
    path: '/bills/recharge',
    auth: true,
    idempotent: true,
    body: z.object({ billerId: BillerIdSchema, accountRef: z.string(), amount: PaiseSchema }),
    response: z.object({ txn: TxnSchema, balance: BalanceSchema }),
  }),
  'bills.setAutopay': defineEndpoint({
    method: 'POST',
    path: '/bills/autopay',
    auth: true,
    body: AutopaySchema,
    response: z.object({ autopay: AutopaySchema }),
  }),
};
