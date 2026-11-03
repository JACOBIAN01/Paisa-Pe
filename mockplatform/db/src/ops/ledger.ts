import type {
  Counterparty,
  IdempotencyKey,
  Paise,
  TxnStatus,
  TxnType,
  UserId,
} from '@pp/contracts-domain';
import type { Database } from '../database';
import { paise, txnId } from '../ids';
import type { TxnRecord, WalletRecord } from '../types';

export const DEBIT_TYPES: ReadonlySet<TxnType> = new Set<TxnType>([
  'p2p_send',
  'bill_pay',
  'recharge',
  'goal_deposit',
]);

/** Debits that count against daily and monthly spending limits. */
export const LIMITED_TYPES: ReadonlySet<TxnType> = new Set<TxnType>([
  'p2p_send',
  'bill_pay',
  'recharge',
]);

export interface PostTxnInput {
  ownerId: UserId;
  type: TxnType;
  amount: number;
  fee?: number;
  status?: TxnStatus;
  counterparty?: Counterparty;
  note?: string;
  idempotencyKey?: IdempotencyKey;
}

export function walletOf(db: Database, userId: UserId): WalletRecord {
  const wallet = db.t.wallets.get(userId);
  if (!wallet) throw new Error(`no wallet for ${userId}`);
  return wallet;
}

/**
 * Records a transaction and moves the wallet balance in the same step.
 * Callers validate funds and limits first; the balance can never go negative here.
 */
export function postTxn(db: Database, now: number, input: PostTxnInput): TxnRecord {
  const wallet = walletOf(db, input.ownerId);
  const status = input.status ?? 'success';
  const fee = input.fee ?? 0;
  const debit = DEBIT_TYPES.has(input.type);
  if (status === 'success') {
    const delta = debit ? -(input.amount + fee) : input.amount;
    if (wallet.balance + delta < 0) throw new Error('ledger invariant: negative balance');
    wallet.balance = paise(wallet.balance + delta);
    wallet.version += 1;
  }
  const stamp = db.stamp(now);
  const record: TxnRecord = {
    ownerId: input.ownerId,
    id: txnId(db.nextId('txn')),
    type: input.type,
    status,
    amount: paise(input.amount),
    fee: paise(fee),
    balanceAfter: wallet.balance,
    counterparty: input.counterparty,
    note: input.note,
    idempotencyKey: input.idempotencyKey,
    createdAt: stamp,
    updatedAt: stamp,
  };
  db.t.txns.push(record);
  return record;
}

export function touchTxn(db: Database, now: number, record: TxnRecord): void {
  record.updatedAt = db.stamp(now);
}

export const ownTxns = (db: Database, userId: UserId): TxnRecord[] =>
  db.t.txns.filter((t) => t.ownerId === userId);

export const asPaise = (n: number): Paise => paise(n);
