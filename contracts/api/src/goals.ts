import { z } from 'zod';
import { GoalSchema, InterestPreviewSchema, PaiseSchema } from '@pp/contracts-domain';
import { defineEndpoint } from './define';
import { BalanceSchema, IdParamsSchema } from './common';

const MoveBody = z.object({ amount: PaiseSchema });
const MoveResponse = z.object({ goal: GoalSchema, balance: BalanceSchema });

export const goals = {
  'goals.list': defineEndpoint({
    method: 'GET',
    path: '/goals',
    auth: true,
    response: z.object({ items: z.array(GoalSchema) }),
  }),
  'goals.create': defineEndpoint({
    method: 'POST',
    path: '/goals',
    auth: true,
    idempotent: true,
    body: z.object({
      name: z.string().min(1),
      emoji: z.string(),
      target: PaiseSchema,
      deadline: z.number().int().optional(),
    }),
    response: z.object({ goal: GoalSchema }),
  }),
  'goals.deposit': defineEndpoint({
    method: 'POST',
    path: '/goals/:id/deposit',
    auth: true,
    idempotent: true,
    params: IdParamsSchema,
    body: MoveBody,
    response: MoveResponse,
  }),
  'goals.withdraw': defineEndpoint({
    method: 'POST',
    path: '/goals/:id/withdraw',
    auth: true,
    idempotent: true,
    params: IdParamsSchema,
    body: MoveBody,
    response: MoveResponse,
  }),
  'goals.interestPreview': defineEndpoint({
    method: 'GET',
    path: '/goals/:id/interest-preview',
    auth: true,
    params: IdParamsSchema,
    query: z.object({
      amount: z.coerce.number().int().positive(),
      months: z.coerce.number().int().positive(),
    }),
    response: z.object({ preview: InterestPreviewSchema }),
  }),
};
