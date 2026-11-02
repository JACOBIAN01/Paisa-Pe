import { z } from 'zod';
import { PaiseSchema, TxnPageSchema, TxnSchema } from '@pp/contracts-domain';
import { defineEndpoint } from './define';
import { BalanceSchema, IdParamsSchema, PageQuerySchema } from './common';

export const wallet = {
  'wallet.balance': defineEndpoint({
    method: 'GET',
    path: '/wallet/balance',
    auth: true,
    response: BalanceSchema,
  }),
  'wallet.addMoney': defineEndpoint({
    method: 'POST',
    path: '/wallet/add-money',
    auth: true,
    idempotent: true,
    body: z.object({ amount: PaiseSchema, source: z.enum(['upi', 'card', 'netbanking']) }),
    response: z.object({ txn: TxnSchema, balance: BalanceSchema }),
  }),
  'wallet.transactions': defineEndpoint({
    method: 'GET',
    path: '/wallet/transactions',
    auth: true,
    query: PageQuerySchema,
    response: TxnPageSchema,
  }),
  'wallet.transaction': defineEndpoint({
    method: 'GET',
    path: '/wallet/transactions/:id',
    auth: true,
    params: IdParamsSchema,
    response: z.object({ txn: TxnSchema }),
  }),
};
