import { z } from 'zod';

export const RiskPromptSchema = z.object({
  kind: z.enum(['new_payee', 'unusual_amount', 'large_amount']),
  severity: z.enum(['info', 'warn', 'block']),
  message: z.string(),
});
export type RiskPrompt = z.infer<typeof RiskPromptSchema>;
