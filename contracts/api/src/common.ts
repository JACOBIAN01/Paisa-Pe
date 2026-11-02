import { z } from 'zod';
import { PaiseSchema } from '@pp/contracts-domain';

export const EmptySchema = z.object({}).strict();
export const OkSchema = z.object({ ok: z.literal(true) });
export const IdParamsSchema = z.object({ id: z.string() });

export const PageQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const BalanceSchema = z.object({
  balance: PaiseSchema,
  asOf: z.number().int().nonnegative(),
  /** Increments on every balance change; lets clients discard stale reads. */
  version: z.number().int().nonnegative(),
});
export type BalanceView = z.infer<typeof BalanceSchema>;
