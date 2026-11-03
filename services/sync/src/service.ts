import type { NoteEdit, Txn } from '@pp/contracts-domain';
import type { AppEventMap } from '@pp/contracts-events';
import type { EventBus } from '@pp/core-event-bus';
import type { HttpClient } from '@pp/core-net';
import type { JsonStore } from '@pp/core-storage';
import type { Clock } from '@pp/core-time';
import type { Ledger } from '@pp/svc-ledger';
import { emptyState, overlayEdits, parseState } from './state';
import type { SyncResult, SyncService, SyncState } from './types';

export interface SyncServiceDeps {
  http: Pick<HttpClient, 'call'>;
  storage: JsonStore;
  bus: EventBus<AppEventMap>;
  clock: Clock;
  userId: string;
  ledger?: Pick<Ledger, 'recordTxn'>;
  pageLimit?: number;
}

const STATE_KEY = 'sync.state';
const DEFAULT_PAGE = 50;
const MAX_PAGES = 500;

const sameEdit = (a: NoteEdit, b: NoteEdit): boolean =>
  a.txnId === b.txnId && a.note === b.note && a.clientUpdatedAt === b.clientUpdatedAt;

export function createSyncService(deps: SyncServiceDeps): SyncService {
  const { http, storage, bus, clock } = deps;
  const pageLimit = deps.pageLimit ?? DEFAULT_PAGE;
  let state: SyncState = emptyState();
  let inflight: Promise<SyncResult> | null = null;
  let writes: Promise<void> = Promise.resolve();
  const listeners = new Set<() => void>();

  const commit = (next: SyncState): void => {
    state = next;
    const snapshot = state;
    writes = writes.then(() => storage.setJSON(STATE_KEY, snapshot)).catch(() => undefined);
    for (const listener of [...listeners]) listener();
  };

  /** Returns true when the txn was new or changed. Older copies never replace newer ones. */
  const apply = (txns: Record<string, Txn>, item: Txn, announce: boolean): boolean => {
    const existing = txns[item.id];
    if (existing && existing.updatedAt > item.updatedAt) return false;
    txns[item.id] = item;
    deps.ledger?.recordTxn(item);
    if (!existing && announce && item.type === 'p2p_receive' && item.status === 'success') {
      bus.emit('payment.received', { txn: item });
    }
    return true;
  };

  async function pull(): Promise<number> {
    const backfill = !state.initialised;
    let applied = 0;
    for (let page = 0; page < MAX_PAGES; page += 1) {
      const response = await http.call('sync.delta', {
        query: { cursor: state.cursor ?? undefined, limit: pageLimit },
      });
      const txns = { ...state.txns };
      for (const item of response.items) if (apply(txns, item, !backfill)) applied += 1;
      commit({ ...state, txns, cursor: response.nextCursor ?? state.cursor });
      if (!response.hasMore) break;
    }
    commit({ ...state, initialised: true, lastSyncAt: clock.now() });
    return applied;
  }

  async function push(): Promise<number> {
    const sending = state.pendingEdits;
    if (sending.length === 0) return 0;
    const response = await http.call('sync.push', { body: { edits: sending } });
    const txns = { ...state.txns };
    for (const txn of response.applied) apply(txns, txn, false);
    // Applied or rejected, the server has decided; anything edited since stays pending.
    const settled = state.pendingEdits.filter((edit) =>
      sending.some((sent) => sameEdit(sent, edit)),
    );
    commit({
      ...state,
      txns,
      pendingEdits: state.pendingEdits.filter((edit) => !settled.includes(edit)),
    });
    return response.applied.length;
  }

  async function run(): Promise<SyncResult> {
    const applied = await pull();
    const pushed = await push();
    bus.emit('sync.completed', { applied, cursor: state.cursor });
    return { applied, pushed, cursor: state.cursor };
  }

  return {
    async hydrate() {
      const saved = parseState(await storage.getJSON(STATE_KEY));
      if (saved) state = saved;
      for (const listener of [...listeners]) listener();
    },
    syncNow() {
      if (inflight) return inflight;
      const current = run();
      inflight = current;
      const done = (): void => {
        if (inflight === current) inflight = null;
      };
      current.then(done, done);
      return current;
    },
    getTxns: () => overlayEdits(state.txns, state.pendingEdits),
    getCursor: () => state.cursor,
    getPendingEdits: () => state.pendingEdits,
    async editNote(txnId, note) {
      const edit: NoteEdit = {
        txnId: txnId as NoteEdit['txnId'],
        note,
        clientUpdatedAt: clock.now(),
      };
      commit({
        ...state,
        pendingEdits: [...state.pendingEdits.filter((e) => e.txnId !== txnId), edit],
      });
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    async reset() {
      commit(emptyState());
      await writes;
    },
  };
}
