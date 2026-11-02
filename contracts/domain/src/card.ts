import { z } from 'zod';
import { CardIdSchema } from './ids';
import { PaiseSchema } from './money';

export const CardSchema = z.object({
  id: CardIdSchema,
  last4: z.string().regex(/^\d{4}$/),
  network: z.enum(['rupay', 'visa']),
  holder: z.string(),
  expiry: z.string().regex(/^\d{2}\/\d{2}$/),
  status: z.enum(['active', 'frozen']),
  spendLimit: PaiseSchema.optional(),
});
export type Card = z.infer<typeof CardSchema>;

/** Short-lived; never persisted or logged. */
export const CardRevealSchema = z.object({
  pan: z.string().regex(/^\d{16}$/),
  cvv: z.string().regex(/^\d{3}$/),
  expiresInSec: z.number().int().positive(),
});
export type CardReveal = z.infer<typeof CardRevealSchema>;
