import { z } from 'zod';
import { PhoneSchema } from './user';

const id = z.object({ id: z.string() });
const none = z.object({}).strict();

/** Every navigable screen and the params it accepts. */
export const ROUTE_PARAMS = {
  home: none,
  history: none,
  'txn-detail': id,
  send: z.object({ to: PhoneSchema.optional() }),
  'send-confirm': z.object({
    to: PhoneSchema,
    amount: z.string(),
    note: z.string().max(140).optional(),
  }),
  request: none,
  'request-detail': id,
  split: none,
  rewards: none,
  'scratch-card': id,
  goals: none,
  'goal-detail': id,
  cards: none,
  bills: none,
  settings: none,
  help: none,
  security: none,
  kyc: none,
  'qr-scan': none,
  contacts: none,
  notifications: none,
} as const;

export const RouteNameSchema = z.enum(Object.keys(ROUTE_PARAMS) as [keyof typeof ROUTE_PARAMS]);
export type RouteName = keyof typeof ROUTE_PARAMS;
export type RouteParams<R extends RouteName> = z.infer<(typeof ROUTE_PARAMS)[R]>;

/** Loosely-typed route reference as carried in notifications and links. */
export const RouteRefSchema = z.object({
  name: z.string(),
  params: z.record(z.string()).optional(),
});
export type RouteRef = z.infer<typeof RouteRefSchema>;
