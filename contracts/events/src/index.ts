import type { Paise, Session, Txn, UserId, MoneyRequest } from '@pp/contracts-domain';

export type LockReason = 'timeout' | 'manual' | 'cold_start' | 'lockout';

export interface AppEventMap {
  'auth.sessionStarted': { userId: UserId; sessionId: Session['sessionId'] };
  'auth.sessionEnded': { userId: UserId; reason: 'logout' | 'revoked' | 'refresh_failed' };
  'auth.tokenRefreshed': { sessionId: Session['sessionId'] };
  'lock.locked': { reason: LockReason };
  'lock.unlocked': { method: 'pin' | 'biometric' };
  'payment.sent': { txn: Txn };
  'payment.received': { txn: Txn };
  'payment.failed': { intentId: string; code: string };
  'balance.changed': { balance: Paise; version: number; source: 'fetch' | 'payment' | 'sync' };
  'ledger.reconciled': { drift: Paise };
  'queue.enqueued': { intentId: string };
  'queue.flushed': { sent: number; failed: number };
  'sync.completed': { applied: number; cursor: string | null };
  'request.created': { request: MoneyRequest };
  'request.updated': { request: MoneyRequest };
  'reward.earned': { amount: Paise; kind: 'cashback' | 'scratch' | 'referral' };
  'connectivity.changed': { online: boolean };
  'notification.received': { id: string };
  'notification.tapped': { id: string };
  'deeplink.received': { url: string; source: 'cold' | 'warm' };
  'flags.changed': { keys: string[] };
  'profile.changed': { userId: UserId };
}

export type AppEventName = keyof AppEventMap;
