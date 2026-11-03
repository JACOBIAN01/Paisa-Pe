import type { SendOutcome } from '@pp/svc-transfers';
import type { Txn } from '@pp/contracts-domain';

export type PaymentState =
  | { phase: 'idle' }
  | { phase: 'sending' }
  | { phase: 'sent'; txn: Txn }
  | { phase: 'queued' }
  | { phase: 'unknown' }
  | { phase: 'failed'; code: string };

export function fromOutcome(outcome: SendOutcome): PaymentState {
  switch (outcome.status) {
    case 'sent':
      return { phase: 'sent', txn: outcome.txn };
    case 'queued':
      return { phase: 'queued' };
    case 'unknown':
      return { phase: 'unknown' };
    case 'failed':
      return { phase: 'failed', code: outcome.code };
  }
}

export function failureMessageKey(code: string) {
  switch (code) {
    case 'insufficient_funds':
      return 'send.insufficient' as const;
    case 'limit_exceeded':
    case 'kyc_required':
      return 'send.limitExceeded' as const;
    case 'network':
    case 'timeout':
      return 'error.network' as const;
    default:
      return 'send.failed' as const;
  }
}
