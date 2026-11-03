import type {
  BillerId,
  CardId,
  ContactId,
  CouponId,
  DeviceId,
  GoalId,
  IdempotencyKey,
  NotificationId,
  Paise,
  Phone,
  RequestId,
  ScratchCardId,
  SessionId,
  SplitId,
  TxnId,
  UserId,
} from '@pp/contracts-domain';

export const userId = (s: string): UserId => s as UserId;
export const sessionId = (s: string): SessionId => s as SessionId;
export const deviceId = (s: string): DeviceId => s as DeviceId;
export const txnId = (s: string): TxnId => s as TxnId;
export const requestId = (s: string): RequestId => s as RequestId;
export const splitId = (s: string): SplitId => s as SplitId;
export const contactId = (s: string): ContactId => s as ContactId;
export const couponId = (s: string): CouponId => s as CouponId;
export const scratchCardId = (s: string): ScratchCardId => s as ScratchCardId;
export const goalId = (s: string): GoalId => s as GoalId;
export const cardId = (s: string): CardId => s as CardId;
export const billerId = (s: string): BillerId => s as BillerId;
export const notificationId = (s: string): NotificationId => s as NotificationId;
export const idempotencyKey = (s: string): IdempotencyKey => s as IdempotencyKey;
export const phone = (s: string): Phone => s as Phone;
export const paise = (n: number): Paise => n as Paise;
