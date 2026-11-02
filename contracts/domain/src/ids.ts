import { z } from 'zod';

const id = <B extends string>() => z.string().min(1).brand<B>();

export const UserIdSchema = id<'UserId'>();
export const SessionIdSchema = id<'SessionId'>();
export const DeviceIdSchema = id<'DeviceId'>();
export const TxnIdSchema = id<'TxnId'>();
export const RequestIdSchema = id<'RequestId'>();
export const SplitIdSchema = id<'SplitId'>();
export const ContactIdSchema = id<'ContactId'>();
export const CouponIdSchema = id<'CouponId'>();
export const ScratchCardIdSchema = id<'ScratchCardId'>();
export const GoalIdSchema = id<'GoalId'>();
export const CardIdSchema = id<'CardId'>();
export const BillerIdSchema = id<'BillerId'>();
export const NotificationIdSchema = id<'NotificationId'>();
export const IdempotencyKeySchema = id<'IdempotencyKey'>();

export type UserId = z.infer<typeof UserIdSchema>;
export type SessionId = z.infer<typeof SessionIdSchema>;
export type DeviceId = z.infer<typeof DeviceIdSchema>;
export type TxnId = z.infer<typeof TxnIdSchema>;
export type RequestId = z.infer<typeof RequestIdSchema>;
export type SplitId = z.infer<typeof SplitIdSchema>;
export type ContactId = z.infer<typeof ContactIdSchema>;
export type CouponId = z.infer<typeof CouponIdSchema>;
export type ScratchCardId = z.infer<typeof ScratchCardIdSchema>;
export type GoalId = z.infer<typeof GoalIdSchema>;
export type CardId = z.infer<typeof CardIdSchema>;
export type BillerId = z.infer<typeof BillerIdSchema>;
export type NotificationId = z.infer<typeof NotificationIdSchema>;
export type IdempotencyKey = z.infer<typeof IdempotencyKeySchema>;
