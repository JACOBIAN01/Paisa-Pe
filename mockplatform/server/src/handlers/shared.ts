import type { BalanceView } from '@pp/contracts-api';
import type { UserId } from '@pp/contracts-domain';
import { paise, walletOf, type Database, type TxnRecord } from '@pp/mock-db';
import { fail } from '../errors';
import { compareStamped } from '../util';

export function balanceView(db: Database, userId: UserId, now: number): BalanceView {
  const wallet = walletOf(db, userId);
  return { balance: paise(wallet.balance), asOf: now, version: wallet.version };
}

export function ownTxn(db: Database, userId: UserId, id: string): TxnRecord {
  const txn = db.t.txns.find((t) => t.id === id && t.ownerId === userId);
  if (!txn) throw fail('not_found', 'Transaction not found');
  return txn;
}

export const newestFirst = <T extends { createdAt: number; id: string }>(items: T[]): T[] =>
  [...items].sort((a, b) =>
    compareStamped({ time: b.createdAt, id: b.id }, { time: a.createdAt, id: a.id }),
  );
