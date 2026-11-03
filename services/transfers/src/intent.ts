import type { Recipient } from '@pp/contracts-api';
import type { IdempotencyKey, Paise, Txn } from '@pp/contracts-domain';

export type IntentStatus = 'draft' | 'sending' | 'queued' | 'unknown' | 'sent' | 'failed';

/**
 * One user decision to pay someone. The idempotency key is minted when the intent is created
 * and reused for every attempt, so the server can never process the same intent twice.
 */
export interface TransferIntent {
  id: string;
  key: IdempotencyKey;
  to: Recipient;
  amount: Paise;
  note?: string;
  status: IntentStatus;
  attempts: number;
  createdAt: number;
  txn?: Txn;
  errorCode?: string;
}

export interface NewIntent {
  to: Recipient;
  amount: Paise;
  note?: string;
}

export type SendOutcome =
  | { status: 'sent'; txn: Txn }
  | { status: 'queued' }
  | { status: 'unknown' }
  | { status: 'failed'; code: string };

export interface FlushReport {
  sent: number;
  failed: number;
  remaining: number;
}
