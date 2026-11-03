import type { NoteEdit, Txn } from '@pp/contracts-domain';

export interface SyncState {
  /** Opaque server cursor; always passed back unchanged. */
  cursor: string | null;
  /** True once the first full catch-up has completed. */
  initialised: boolean;
  txns: Record<string, Txn>;
  pendingEdits: NoteEdit[];
  lastSyncAt: number;
}

export interface SyncResult {
  applied: number;
  pushed: number;
  cursor: string | null;
}

export interface SyncService {
  hydrate(): Promise<void>;
  /** Single-flight: concurrent callers share one run. */
  syncNow(): Promise<SyncResult>;
  /** Transactions with any pending local note edits overlaid, newest first. */
  getTxns(): Txn[];
  getCursor(): string | null;
  getPendingEdits(): NoteEdit[];
  editNote(txnId: string, note: string): Promise<void>;
  subscribe(listener: () => void): () => void;
  reset(): Promise<void>;
}
