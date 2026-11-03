import type { AppEventMap } from '@pp/contracts-events';
import type { EventBus } from '@pp/core-event-bus';

export type LimitsBus = Pick<EventBus<AppEventMap>, 'on'>;

export type LimitReason = 'per_txn' | 'daily' | 'monthly' | 'wallet_cap' | 'kyc_required';

export type LimitCheck = { ok: true } | { ok: false; reason: LimitReason };

export type CheckKind = 'send' | 'add_money';
