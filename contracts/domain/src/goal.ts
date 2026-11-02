import { z } from 'zod';
import { GoalIdSchema } from './ids';
import { EpochMsSchema, PaiseSchema } from './money';

export const GoalSchema = z.object({
  id: GoalIdSchema,
  name: z.string().min(1),
  emoji: z.string(),
  target: PaiseSchema,
  saved: PaiseSchema,
  /** Annual yield in basis points. */
  apyBps: z.number().int().nonnegative(),
  deadline: EpochMsSchema.optional(),
  createdAt: EpochMsSchema,
});
export type Goal = z.infer<typeof GoalSchema>;

export const InterestPreviewSchema = z.object({
  principal: PaiseSchema,
  months: z.number().int().positive(),
  interest: PaiseSchema,
  maturity: PaiseSchema,
});
export type InterestPreview = z.infer<typeof InterestPreviewSchema>;
