import type { AppEventMap } from '@pp/contracts-events';
import type { EventBus } from '@pp/core-event-bus';
import { createIdempotencyKey, DEFAULT_RETRY, backoffDelay } from '@pp/core-net';
import type { HttpClient, RetryPolicy } from '@pp/core-net';
import { AbortedError, AppError, toAppError } from '@pp/core-result';
import type { JsonStore } from '@pp/core-storage';
import { every, type Cancel, type Clock } from '@pp/core-time';
import type { Ledger } from '@pp/svc-ledger';
import type { FlushReport, NewIntent, SendOutcome, TransferIntent } from './intent';
import { createMutex } from './mutex';
import { createOfflineQueue } from './queue';

export interface TransferServiceDeps {
  http: Pick<HttpClient, 'call'>;
  storage: JsonStore;
  ledger: Pick<Ledger, 'beginDebit' | 'settleDebit' | 'rollbackDebit' | 'recordTxn' | 'invalidate'>;
  bus: EventBus<AppEventMap>;
  clock: Clock;
  userId: string;
  isOnline?: () => boolean;
  /** Subscribes to connectivity changes; returns the unsubscribe function. */
  onOnlineChange?: (listener: (online: boolean) => void) => () => void;
  schedule?: (ms: number, fn: () => void) => Cancel;
  flushIntervalMs?: number;
  retry?: RetryPolicy;
  random?: () => number;
  createId?: () => string;
}

export interface TransferService {
  hydrate(): Promise<void>;
  start(): void;
  stop(): void;
  createIntent(input: NewIntent): Promise<TransferIntent>;
  getIntent(id: string): TransferIntent | undefined;
  send(intentId: string, options?: { signal?: AbortSignal }): Promise<SendOutcome>;
  flushQueue(): Promise<FlushReport>;
  repeatPayment(txnId: string): Promise<TransferIntent>;
  pendingCount(): Promise<number>;
}

const INTENTS_KEY = 'transfers.intents';
const KEEP_SENT = 50;
const DEFAULT_FLUSH_MS = 15_000;

let idCounter = 0;
const defaultId = (): string => `int_${Date.now().toString(36)}_${(idCounter += 1).toString(36)}`;

export function createTransferService(deps: TransferServiceDeps): TransferService {
  const { http, storage, ledger, bus, clock } = deps;
  const policy = deps.retry ?? DEFAULT_RETRY;
  const random = deps.random ?? Math.random;
  const makeId = deps.createId ?? defaultId;
  const online = deps.isOnline ?? ((): boolean => true);
  const schedule = deps.schedule ?? every;
  const queue = createOfflineQueue(storage, createMutex());
  const intents = new Map<string, TransferIntent>();
  const inflight = new Map<string, Promise<SendOutcome>>();
  let flushing: Promise<FlushReport> | null = null;
  let writes: Promise<void> = Promise.resolve();
  let cancelTimer: Cancel | null = null;
  let unlistenOnline: (() => void) | null = null;

  const persist = (): void => {
    const sent = [...intents.values()].filter((i) => i.status === 'sent');
    const stale = new Set(
      sent
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(KEEP_SENT)
        .map((i) => i.id),
    );
    for (const id of stale) intents.delete(id);
    const snapshot = [...intents.values()];
    writes = writes.then(() => storage.setJSON(INTENTS_KEY, snapshot)).catch(() => undefined);
  };

  const update = (id: string, patch: Partial<TransferIntent>): TransferIntent => {
    const current = intents.get(id);
    if (!current) throw new AppError('not_found', `unknown transfer intent ${id}`);
    const next = { ...current, ...patch };
    intents.set(id, next);
    persist();
    return next;
  };

  const enqueue = (intent: TransferIntent, delayMs: number): Promise<void> =>
    queue.upsert({
      intentId: intent.id,
      attempts: intent.attempts,
      nextAttemptAt: clock.now() + delayMs,
    });

  async function attemptSend(id: string, signal?: AbortSignal): Promise<SendOutcome> {
    const intent = intents.get(id);
    if (!intent) return { status: 'failed', code: 'not_found' };
    if (intent.status === 'sent' && intent.txn) return { status: 'sent', txn: intent.txn };
    if (intent.status === 'failed')
      return { status: 'failed', code: intent.errorCode ?? 'unknown' };

    const current = update(id, { status: 'sending', attempts: intent.attempts + 1 });
    ledger.beginDebit(id, current.amount);
    try {
      const response = await http.call('transfers.send', {
        body: { to: current.to, amount: current.amount, note: current.note },
        idempotencyKey: current.key,
        signal,
      });
      update(id, { status: 'sent', txn: response.txn, errorCode: undefined });
      await queue.remove(id);
      ledger.recordTxn(response.txn);
      ledger.settleDebit(id, response.balance);
      bus.emit('payment.sent', { txn: response.txn });
      return { status: 'sent', txn: response.txn };
    } catch (thrown) {
      const error = toAppError(thrown);
      if (error instanceof AbortedError) {
        const next = update(id, { status: 'unknown' });
        await enqueue(next, 0);
        bus.emit('queue.enqueued', { intentId: id });
        return { status: 'unknown' };
      }
      if (error.retryable) {
        const next = update(id, { status: 'queued', errorCode: error.code });
        await enqueue(next, backoffDelay(next.attempts, policy, random));
        bus.emit('queue.enqueued', { intentId: id });
        return { status: 'queued' };
      }
      update(id, { status: 'failed', errorCode: error.code });
      await queue.remove(id);
      ledger.rollbackDebit(id);
      bus.emit('payment.failed', { intentId: id, code: error.code });
      return { status: 'failed', code: error.code };
    }
  }

  const send: TransferService['send'] = (intentId, options = {}) => {
    const existing = inflight.get(intentId);
    if (existing) return existing;
    const run = attemptSend(intentId, options.signal).catch((thrown): SendOutcome => ({
      status: 'failed',
      code: toAppError(thrown).code,
    }));
    inflight.set(intentId, run);
    void run.then(() => {
      if (inflight.get(intentId) === run) inflight.delete(intentId);
    });
    return run;
  };

  async function doFlush(): Promise<FlushReport> {
    let sent = 0;
    let failed = 0;
    if (online()) {
      const due = (await queue.list()).filter((item) => item.nextAttemptAt <= clock.now());
      for (const item of due) {
        const intent = intents.get(item.intentId);
        if (!intent || intent.status === 'sent' || intent.status === 'failed') {
          await queue.remove(item.intentId);
          continue;
        }
        const outcome = await send(item.intentId);
        if (outcome.status === 'sent') sent += 1;
        if (outcome.status === 'failed') failed += 1;
      }
      if (sent + failed > 0) bus.emit('queue.flushed', { sent, failed });
    }
    return { sent, failed, remaining: (await queue.list()).length };
  }

  const service: TransferService = {
    async hydrate() {
      const saved = await storage.getJSON<TransferIntent[]>(INTENTS_KEY);
      intents.clear();
      for (const intent of Array.isArray(saved) ? saved : []) intents.set(intent.id, intent);
      for (const intent of [...intents.values()]) {
        if (intent.status === 'sending') {
          await enqueue(update(intent.id, { status: 'unknown' }), 0);
        }
      }
    },
    start() {
      if (!cancelTimer) {
        cancelTimer = schedule(deps.flushIntervalMs ?? DEFAULT_FLUSH_MS, () => {
          void service.flushQueue();
        });
      }
      if (!unlistenOnline && deps.onOnlineChange) {
        unlistenOnline = deps.onOnlineChange((isUp) => {
          if (isUp) void service.flushQueue();
        });
      }
    },
    stop() {
      cancelTimer?.();
      cancelTimer = null;
      unlistenOnline?.();
      unlistenOnline = null;
    },
    async createIntent(input) {
      const intent: TransferIntent = {
        id: makeId(),
        key: createIdempotencyKey(),
        to: input.to,
        amount: input.amount,
        ...(input.note ? { note: input.note } : {}),
        status: 'draft',
        attempts: 0,
        createdAt: clock.now(),
      };
      intents.set(intent.id, intent);
      persist();
      return intent;
    },
    getIntent: (id) => intents.get(id),
    send,
    flushQueue() {
      if (flushing) return flushing;
      const run = doFlush();
      flushing = run;
      const done = (): void => {
        if (flushing === run) flushing = null;
      };
      run.then(done, done);
      return run;
    },
    async repeatPayment(txnId) {
      const { txn } = await http.call('wallet.transaction', { params: { id: txnId } });
      const phone = txn.counterparty?.phone;
      if (txn.type !== 'p2p_send' || !phone) {
        throw new AppError('invalid_request', 'Only a sent payment can be repeated');
      }
      return service.createIntent({ to: { phone }, amount: txn.amount, note: txn.note });
    },
    async pendingCount() {
      return (await queue.list()).length;
    },
  };
  return service;
}
