import { z } from 'zod';
import {
  ContactIdSchema,
  MoneyRequestSchema,
  PaiseSchema,
  SplitBillSchema,
  TxnSchema,
} from '@pp/contracts-domain';
import { defineEndpoint } from './define';
import { BalanceSchema, IdParamsSchema } from './common';

export const requests = {
  'requests.list': defineEndpoint({
    method: 'GET',
    path: '/requests',
    auth: true,
    query: z.object({ direction: z.enum(['incoming', 'outgoing']).optional() }),
    response: z.object({ items: z.array(MoneyRequestSchema) }),
  }),
  'requests.create': defineEndpoint({
    method: 'POST',
    path: '/requests',
    auth: true,
    idempotent: true,
    body: z.object({
      from: ContactIdSchema,
      amount: PaiseSchema,
      note: z.string().max(140).optional(),
    }),
    response: z.object({ request: MoneyRequestSchema }),
  }),
  'requests.pay': defineEndpoint({
    method: 'POST',
    path: '/requests/:id/pay',
    auth: true,
    idempotent: true,
    params: IdParamsSchema,
    response: z.object({ request: MoneyRequestSchema, txn: TxnSchema, balance: BalanceSchema }),
  }),
  'requests.decline': defineEndpoint({
    method: 'POST',
    path: '/requests/:id/decline',
    auth: true,
    params: IdParamsSchema,
    response: z.object({ request: MoneyRequestSchema }),
  }),
  'requests.cancel': defineEndpoint({
    method: 'POST',
    path: '/requests/:id/cancel',
    auth: true,
    params: IdParamsSchema,
    response: z.object({ request: MoneyRequestSchema }),
  }),
  'splits.create': defineEndpoint({
    method: 'POST',
    path: '/splits',
    auth: true,
    idempotent: true,
    body: z.object({
      total: PaiseSchema,
      shares: z.array(z.object({ contactId: ContactIdSchema, share: PaiseSchema })).min(1),
      note: z.string().max(140).optional(),
    }),
    response: z.object({ split: SplitBillSchema, requests: z.array(MoneyRequestSchema) }),
  }),
};
