import { z } from 'zod';
import { NotificationIdSchema } from './ids';
import { EpochMsSchema } from './money';
import { RouteRefSchema } from './routes';

export const AppNotificationSchema = z.object({
  id: NotificationIdSchema,
  kind: z.enum(['payment', 'request', 'reward', 'security', 'reminder']),
  title: z.string(),
  body: z.string(),
  read: z.boolean(),
  createdAt: EpochMsSchema,
  route: RouteRefSchema.optional(),
});
export type AppNotification = z.infer<typeof AppNotificationSchema>;
