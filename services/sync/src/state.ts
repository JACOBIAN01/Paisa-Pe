import type { Txn } from '@pp/contracts-domain';
import type { SyncState } from './types';

export const emptyState = (): SyncState => ({
  cursor: null,
  initialised: false,
  txns: {},
  pendingEdits: [],
  lastSyncAt: 0,
});

export function parseState(raw: unknown): SyncState | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const s = raw as Partial<SyncState>;
  if (typeof s.txns !== 'object' || s.txns === null) return null;
  return {
    ...emptyState(),
    ...s,
    txns: s.txns,
    pendingEdits: Array.isArray(s.pendingEdits) ? s.pendingEdits : [],
  };
}

/** Orders by updatedAt, then id, so equal timestamps still have a stable order. */
export const byRecency = (a: Txn, b: Txn): number =>
  b.updatedAt - a.updatedAt || (a.id < b.id ? 1 : a.id > b.id ? -1 : 0);

export const overlayEdits = (
  txns: Record<string, Txn>,
  edits: SyncState['pendingEdits'],
): Txn[] => {
  const notes = new Map(edits.map((edit) => [edit.txnId, edit.note]));
  return Object.values(txns)
    .map((txn) => (notes.has(txn.id) ? { ...txn, note: notes.get(txn.id) } : txn))
    .sort(byRecency);
};
