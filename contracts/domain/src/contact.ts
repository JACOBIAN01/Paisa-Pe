import { z } from 'zod';
import { ContactIdSchema, UserIdSchema } from './ids';
import { EpochMsSchema } from './money';
import { PhoneSchema } from './user';

export const ContactSchema = z.object({
  id: ContactIdSchema,
  userId: UserIdSchema.optional(),
  name: z.string().min(1),
  phone: PhoneSchema,
  favourite: z.boolean(),
  avatarColor: z.string(),
  lastPaidAt: EpochMsSchema.optional(),
});
export type Contact = z.infer<typeof ContactSchema>;
