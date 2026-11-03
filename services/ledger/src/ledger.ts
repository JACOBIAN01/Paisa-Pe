import type { BalanceView } from '@pp/contracts-api';
import type { HttpClient } from '@pp/core-net';
import type { EventBus } from '@pp/core-event-bus';
import type { AppEventMap } from '@pp/contracts-events';
import { paise } from '@pp/core-money';
import type { JsonStore } from '@pp/core-storage';
import type { Clock } from '@pp/core-time';
import { txnDelta } from './delta';
import { emptyState, parseState, sumPending } from './state';
import type { BalanceSource, Ledger, LedgerState, PendingDelta, ReconcileReport } from './types';

export interface LedgerDeps {
  http: Pick<HttpClient, 'call'>;
  storage: JsonStore;
  bus: EventBus<AppEventMap>;
  clock: Clock;
  userId: string;
  /** How long a fetched balance counts as fresh. */
  freshMs?: number;
}

const STORAGE_KEY = 'ledger.state';
const DEFAULT_FRESH_MS = 30_000;

export function createLedger(deps: LedgerDeps): Ledger {
  const { http, storage, bus, clock } = deps;
  const freshMs = deps.freshMs ?? DEFAULT_FRESH_MS;
  let state: LedgerState = emptyState();
  const listeners = new Set<() => void>();
  let writes: Promise<void> = Promise.resolve();
  let startedSeq = 0;
  let appliedSeq = 0;
  let inflight: Promise<BalanceView> | null = null;
  let unsubscribe: (() => void) | null = null;

  const projected = (): number => state.serverBalance + sumPending(state.pending);

  const commit = (next: LedgerState): void => {
    state = next;
    const snapshot = state;
    writes = writes.then(() => storage.setJSON(STORAGE_KEY, snapshot)).catch(() => undefined);
    for (const listener of [...listeners]) listener();
  };

  const emitChanged = (source: BalanceSource): void => {
    bus.emit('balance.changed', {
      balance: paise(projected()),
      version: state.version,
      source,
    });
  };

  const applyServerBalance = (view: BalanceView, source: BalanceSource = 'fetch'): boolean => {
    if (view.version < state.version) return false;
    const pending = state.pending.filter((p) => p.kind === 'debit' || p.at > view.asOf);
    commit({
      ...state,
      serverBalance: view.balance,
      version: view.version,
      asOf: view.asOf,
      baseline: state.baseline ?? { balance: view.balance, asOf: view.asOf },
      pending,
      stale: false,
      fetchedAt: clock.now(),
    });
    emitChanged(source);
    return true;
  };

  const recordTxn: Ledger['recordTxn'] = (txn) => {
    if (state.entries[txn.id]) return false;
    const delta = txnDelta(txn);
    const entries = {
      ...state.entries,
      [txn.id]: { txnId: txn.id, delta, updatedAt: txn.updatedAt },
    };
    commit({ ...state, entries });
    return true;
  };

  const onReceived = (txn: AppEventMap['payment.received']['txn']): void => {
    const isNew = recordTxn(txn);
    const delta = txnDelta(txn);
    if (!isNew || delta === 0) return;
    const credit: PendingDelta = { id: `rx:${txn.id}`, kind: 'credit', delta, at: txn.updatedAt };
    commit({ ...state, pending: [...state.pending, credit] });
    emitChanged('payment');
  };

  const fetchBalance: Ledger['fetchBalance'] = () => {
    startedSeq += 1;
    const seq = startedSeq;
    const request = http.call('wallet.balance').then((view) => {
      if (seq >= appliedSeq) {
        appliedSeq = seq;
        applyServerBalance(view, 'fetch');
      }
      return view;
    });
    inflight = request;
    const clear = (): void => {
      if (inflight === request) inflight = null;
    };
    request.then(clear, clear);
    return request;
  };

  const isFresh: Ledger['isFresh'] = (maxAgeMs = freshMs) =>
    !state.stale && clock.now() - state.fetchedAt <= maxAgeMs;

  return {
    async hydrate() {
      const saved = parseState(await storage.getJSON(STORAGE_KEY));
      if (saved) state = { ...saved, stale: true };
      for (const listener of [...listeners]) listener();
    },
    start() {
      if (unsubscribe) return;
      unsubscribe = bus.on('payment.received', ({ txn }) => onReceived(txn));
    },
    dispose() {
      unsubscribe?.();
      unsubscribe = null;
      listeners.clear();
    },
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    projectedBalance: () => paise(projected()),
    isFresh,
    invalidate() {
      commit({ ...state, stale: true });
    },
    fetchBalance,
    async ensureFresh(maxAgeMs) {
      if (!isFresh(maxAgeMs)) await (inflight ?? fetchBalance());
      return paise(projected());
    },
    applyServerBalance,
    recordTxn,
    beginDebit(id, amount) {
      const key = `tx:${id}`;
      if (state.pending.some((p) => p.id === key)) return;
      const debit: PendingDelta = { id: key, kind: 'debit', delta: -amount, at: clock.now() };
      commit({ ...state, pending: [...state.pending, debit] });
      emitChanged('payment');
    },
    settleDebit(id, view) {
      const key = `tx:${id}`;
      const pending = state.pending.filter((p) => p.id !== key);
      if (view && view.version >= state.version) {
        commit({ ...state, pending });
        applyServerBalance(view, 'payment');
        return;
      }
      commit({ ...state, pending, stale: true });
      emitChanged('payment');
    },
    rollbackDebit(id) {
      const key = `tx:${id}`;
      if (!state.pending.some((p) => p.id === key)) return;
      commit({ ...state, pending: state.pending.filter((p) => p.id !== key), stale: true });
      emitChanged('payment');
    },
    async reconcile(): Promise<ReconcileReport> {
      const view = await fetchBalance();
      const baseline = state.baseline;
      const replayed = Object.values(state.entries)
        .filter((entry) => !baseline || entry.updatedAt > baseline.asOf)
        .reduce((total, entry) => total + entry.delta, 0);
      const expected = (baseline?.balance ?? view.balance) + replayed;
      const comparable = state.pending.length === 0 && view.version === state.version;
      const drift = paise(view.balance - expected);
      bus.emit('ledger.reconciled', { drift });
      return {
        server: view.balance,
        expected: paise(expected),
        drift,
        version: view.version,
        comparable,
      };
    },
  };
}
