import type { BalanceView } from '@pp/contracts-api';
import type { Paise, Txn } from '@pp/contracts-domain';

/** A change to the balance the server has not confirmed yet. */
export interface PendingDelta {
  id: string;
  kind: 'debit' | 'credit';
  /** Signed paise. */
  delta: number;
  /** Credits stop counting once a server balance with `asOf >= at` arrives. */
  at: number;
}

export interface LedgerEntry {
  txnId: string;
  delta: number;
  updatedAt: number;
}

export interface LedgerState {
  /** Last balance confirmed by the server. */
  serverBalance: number;
  version: number;
  asOf: number;
  /** First confirmed balance; reconciliation replays entries on top of it. */
  baseline: { balance: number; asOf: number } | null;
  entries: Record<string, LedgerEntry>;
  pending: PendingDelta[];
  /** Set when a rollback or error means the cached balance must not be trusted. */
  stale: boolean;
  fetchedAt: number;
}

export interface ReconcileReport {
  server: Paise;
  expected: Paise;
  drift: Paise;
  version: number;
  /** False when pending changes made the comparison meaningless. */
  comparable: boolean;
}

export type BalanceSource = 'fetch' | 'payment' | 'sync';

export interface Ledger {
  hydrate(): Promise<void>;
  start(): void;
  dispose(): void;
  getState(): LedgerState;
  subscribe(listener: () => void): () => void;
  projectedBalance(): Paise;
  isFresh(maxAgeMs?: number): boolean;
  invalidate(): void;
  fetchBalance(): Promise<BalanceView>;
  ensureFresh(maxAgeMs?: number): Promise<Paise>;
  applyServerBalance(view: BalanceView, source?: BalanceSource): boolean;
  recordTxn(txn: Txn): boolean;
  beginDebit(id: string, amount: number): void;
  settleDebit(id: string, view?: BalanceView): void;
  rollbackDebit(id: string): void;
  reconcile(): Promise<ReconcileReport>;
}
