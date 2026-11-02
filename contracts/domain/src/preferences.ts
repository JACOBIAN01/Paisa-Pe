import { z } from 'zod';
import { LanguageSchema } from './user';

export const LOCK_TIMEOUTS_SEC = [0, 30, 60, 300] as const;

export const PreferencesSchema = z.object({
  language: LanguageSchema,
  lockTimeoutSec: z.union([z.literal(0), z.literal(30), z.literal(60), z.literal(300)]),
  biometricsEnabled: z.boolean(),
  hideBalance: z.boolean(),
  pushEnabled: z.boolean(),
});
export type Preferences = z.infer<typeof PreferencesSchema>;
