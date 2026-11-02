import { z } from 'zod';
import { EpochMsSchema } from './money';
import { UserIdSchema } from './ids';

export const PhoneSchema = z
  .string()
  .regex(/^\+91[6-9]\d{9}$/, 'Expected +91 followed by 10 digits');
export type Phone = z.infer<typeof PhoneSchema>;

export const LanguageSchema = z.enum(['en', 'hi', 'bn']);
export type Language = z.infer<typeof LanguageSchema>;

export const KycTierSchema = z.enum(['min', 'basic', 'full']);
export type KycTier = z.infer<typeof KycTierSchema>;

export const UserSchema = z.object({
  id: UserIdSchema,
  phone: PhoneSchema,
  name: z.string().min(1),
  kycTier: KycTierSchema,
  language: LanguageSchema,
  createdAt: EpochMsSchema,
});
export type User = z.infer<typeof UserSchema>;
