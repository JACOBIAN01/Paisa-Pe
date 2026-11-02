import { z } from 'zod';
import {
  ContactSchema,
  KycStatusSchema,
  LimitsSchema,
  PhoneSchema,
  PreferencesSchema,
  UserSchema,
  AppNotificationSchema,
} from '@pp/contracts-domain';
import { defineEndpoint } from './define';
import { OkSchema } from './common';

export const profile = {
  'profile.get': defineEndpoint({
    method: 'GET',
    path: '/profile',
    auth: true,
    response: z.object({ user: UserSchema }),
  }),
  'profile.update': defineEndpoint({
    method: 'PATCH',
    path: '/profile',
    auth: true,
    body: z.object({ name: z.string().min(1) }),
    response: z.object({ user: UserSchema }),
  }),
  'profile.contacts': defineEndpoint({
    method: 'GET',
    path: '/profile/contacts',
    auth: true,
    response: z.object({ items: z.array(ContactSchema) }),
  }),
  'profile.addContact': defineEndpoint({
    method: 'POST',
    path: '/profile/contacts',
    auth: true,
    body: z.object({ name: z.string().min(1), phone: PhoneSchema }),
    response: z.object({ contact: ContactSchema }),
  }),
  'profile.preferences': defineEndpoint({
    method: 'GET',
    path: '/profile/preferences',
    auth: true,
    response: z.object({ preferences: PreferencesSchema }),
  }),
  'profile.setPreferences': defineEndpoint({
    method: 'PUT',
    path: '/profile/preferences',
    auth: true,
    body: PreferencesSchema,
    response: z.object({ preferences: PreferencesSchema }),
  }),
  'limits.get': defineEndpoint({
    method: 'GET',
    path: '/limits',
    auth: true,
    response: z.object({ limits: LimitsSchema }),
  }),
  'kyc.status': defineEndpoint({
    method: 'GET',
    path: '/kyc/status',
    auth: true,
    response: z.object({ status: KycStatusSchema }),
  }),
  'kyc.submit': defineEndpoint({
    method: 'POST',
    path: '/kyc/submit',
    auth: true,
    body: z.object({ docType: z.enum(['aadhaar', 'pan']), docLast4: z.string().length(4) }),
    response: z.object({ status: KycStatusSchema }),
  }),
  'notifications.list': defineEndpoint({
    method: 'GET',
    path: '/notifications',
    auth: true,
    response: z.object({ items: z.array(AppNotificationSchema) }),
  }),
  'notifications.markRead': defineEndpoint({
    method: 'POST',
    path: '/notifications/read',
    auth: true,
    body: z.object({ ids: z.array(z.string()) }),
    response: OkSchema,
  }),
};
