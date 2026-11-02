import { z } from 'zod';
import { DeviceSchema, PhoneSchema, SessionSchema, UserSchema } from '@pp/contracts-domain';
import { defineEndpoint } from './define';
import { IdParamsSchema, OkSchema, EmptySchema } from './common';

export const auth = {
  'auth.requestOtp': defineEndpoint({
    method: 'POST',
    path: '/auth/otp/request',
    auth: false,
    body: z.object({ phone: PhoneSchema }),
    response: z.object({
      otpId: z.string(),
      expiresInSec: z.number().int(),
      resendAfterSec: z.number().int(),
    }),
  }),
  'auth.verifyOtp': defineEndpoint({
    method: 'POST',
    path: '/auth/otp/verify',
    auth: false,
    body: z.object({ otpId: z.string(), code: z.string().regex(/^\d{6}$/) }),
    response: z.object({ session: SessionSchema, user: UserSchema, isNewUser: z.boolean() }),
  }),
  'auth.refresh': defineEndpoint({
    method: 'POST',
    path: '/auth/refresh',
    auth: false,
    body: z.object({ refreshToken: z.string() }),
    response: z.object({ session: SessionSchema }),
  }),
  'auth.logout': defineEndpoint({
    method: 'POST',
    path: '/auth/logout',
    auth: true,
    body: EmptySchema,
    response: OkSchema,
  }),
  'auth.listSessions': defineEndpoint({
    method: 'GET',
    path: '/auth/sessions',
    auth: true,
    response: z.object({ devices: z.array(DeviceSchema) }),
  }),
  'auth.revokeSession': defineEndpoint({
    method: 'DELETE',
    path: '/auth/sessions/:id',
    auth: true,
    params: IdParamsSchema,
    response: OkSchema,
  }),
};
