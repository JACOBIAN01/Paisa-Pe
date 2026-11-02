import { z } from 'zod';
import { DeviceIdSchema, SessionIdSchema, UserIdSchema } from './ids';
import { EpochMsSchema } from './money';

export const SessionSchema = z.object({
  sessionId: SessionIdSchema,
  userId: UserIdSchema,
  deviceId: DeviceIdSchema,
  accessToken: z.string(),
  refreshToken: z.string(),
  accessExpiresAt: EpochMsSchema,
});
export type Session = z.infer<typeof SessionSchema>;

export const DeviceSchema = z.object({
  id: DeviceIdSchema,
  name: z.string(),
  platform: z.enum(['ios', 'android']),
  lastActiveAt: EpochMsSchema,
  current: z.boolean(),
});
export type Device = z.infer<typeof DeviceSchema>;
