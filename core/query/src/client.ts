import { getClock, type Clock } from '@pp/core-time';
import { hashKey, startsWith, type QueryKey } from './key';

export type QueryStatus = 'idle' | 'loading' | 'success' | 'error';

export interface QuerySnapshot<T> {
  data: T | undefined;
  error: unknown;
  status: QueryStatus;
  isFetching: boolean;
  isInvalidated: boolean;
  updatedAt: number;
}

export type Updater<T> = T | ((old: T | undefined) => T);

export interface Rollback {
  (): void;
  /** Drops the optimistic layer without reverting it and refreshes from the server. */
  commit(): void;
}

interface Layer {
  update(old: unknown): unknown;
}

interface Entry {
  key: QueryKey;
  hash: string;
  base: unknown;
  hasBase: boolean;
  baseStatus: 'idle' | 'success' | 'error';
  error: unknown;
  updatedAt: number;
  invalidated: boolean;
  /** Fetches started at or before this sequence number must not count as fresh. */
  staleBefore: number;
  seq: number;
  inFlight: Promise<unknown> | undefined;
  fetcher: (() => Promise<unknown>) | undefined;
  layers: Layer[];
  listeners: Set<() => void>;
  snapshot: QuerySnapshot<unknown>;
}

const IDLE: QuerySnapshot<never> = {
  data: undefined,
  error: undefined,
  status: 'idle',
  isFetching: false,
  isInvalidated: false,
  updatedAt: 0,
};

const noop = (): void => undefined;

export interface QueryClientOptions {
  clock?: Clock;
}

export class QueryClient {
  private readonly entries = new Map<string, Entry>();
  private readonly clock: Clock;

  constructor(options: QueryClientOptions = {}) {
    this.clock = options.clock ?? getClock();
  }

  getQueryData<T>(key: QueryKey): T | undefined {
    const entry = this.entries.get(hashKey(key));
    return entry ? (this.view(entry) as T | undefined) : undefined;
  }

  /** Stable between changes, so it is safe to use as an external-store snapshot. */
  getSnapshot<T>(key: QueryKey): QuerySnapshot<T> {
    const entry = this.entries.get(hashKey(key));
    return (entry ? entry.snapshot : IDLE) as QuerySnapshot<T>;
  }

  subscribe(key: QueryKey, listener: () => void): () => void {
    const entry = this.entry(key);
    entry.listeners.add(listener);
    return () => {
      entry.listeners.delete(listener);
    };
  }

  /** Returns cached data when fresh, joins an in-flight request, or starts a new one. */
  ensure<T>(
    key: QueryKey,
    fn: () => Promise<T>,
    options: { staleMs?: number } = {},
  ): Promise<T | undefined> {
    const entry = this.entry(key);
    entry.fetcher = fn;
    const staleMs = options.staleMs ?? 0;
    const fresh =
      entry.hasBase && !entry.invalidated && this.clock.now() - entry.updatedAt < staleMs;
    if (fresh) return Promise.resolve(this.view(entry) as T | undefined);
    if (entry.inFlight && entry.seq > entry.staleBefore) {
      return entry.inFlight as Promise<T | undefined>;
    }
    return this.start(entry, fn);
  }

  /** Always starts a request. If another is in flight, the later-started one wins. */
  refetch<T>(key: QueryKey, fn: () => Promise<T>): Promise<T | undefined> {
    const entry = this.entry(key);
    entry.fetcher = fn;
    return this.start(entry, fn);
  }

  /** Authoritative write. Supersedes any fetch that started earlier. */
  setQueryData<T>(key: QueryKey, updater: Updater<T>): void {
    const entry = this.entry(key);
    entry.base =
      typeof updater === 'function'
        ? (updater as (old: T | undefined) => T)(entry.base as T | undefined)
        : updater;
    entry.hasBase = true;
    entry.baseStatus = 'success';
    entry.error = undefined;
    entry.updatedAt = this.clock.now();
    entry.invalidated = false;
    entry.seq += 1;
    this.publish(entry);
  }

  /**
   * Shows `updater(current)` on top of the cached data until rolled back or committed.
   * Writes that land in the meantime (fetches, credits) stay intact when it is undone.
   */
  optimisticUpdate<T>(key: QueryKey, updater: (old: T | undefined) => T): Rollback {
    const entry = this.entry(key);
    const layer: Layer = { update: (old) => updater(old as T | undefined) };
    entry.layers.push(layer);
    this.markStale(entry);
    this.publish(entry);

    const release = (): void => {
      const index = entry.layers.indexOf(layer);
      if (index < 0) return;
      entry.layers.splice(index, 1);
      this.markStale(entry);
      this.publish(entry);
      this.refreshIfObserved(entry);
    };
    const rollback = (() => release()) as Rollback;
    rollback.commit = release;
    return rollback;
  }

  /** Marks every entry under `prefix` stale and refetches the ones being observed. */
  invalidate(prefix: QueryKey = []): void {
    for (const entry of [...this.entries.values()]) {
      if (!startsWith(entry.key, prefix)) continue;
      this.markStale(entry);
      this.publish(entry);
      this.refreshIfObserved(entry);
    }
  }

  clearUser(userId: string): void {
    this.drop((entry) => entry.key[0] === userId);
  }

  clear(): void {
    this.drop(() => true);
  }

  private drop(match: (entry: Entry) => boolean): void {
    for (const entry of [...this.entries.values()]) {
      if (!match(entry)) continue;
      entry.seq += 1;
      entry.inFlight = undefined;
      entry.fetcher = undefined;
      if (entry.listeners.size === 0) {
        this.entries.delete(entry.hash);
        continue;
      }
      entry.base = undefined;
      entry.hasBase = false;
      entry.baseStatus = 'idle';
      entry.error = undefined;
      entry.invalidated = false;
      entry.layers = [];
      this.publish(entry);
    }
  }

  private entry(key: QueryKey): Entry {
    const hash = hashKey(key);
    const existing = this.entries.get(hash);
    if (existing) return existing;
    const created: Entry = {
      key,
      hash,
      base: undefined,
      hasBase: false,
      baseStatus: 'idle',
      error: undefined,
      updatedAt: 0,
      invalidated: false,
      staleBefore: 0,
      seq: 0,
      inFlight: undefined,
      fetcher: undefined,
      layers: [],
      listeners: new Set(),
      snapshot: IDLE,
    };
    this.entries.set(hash, created);
    return created;
  }

  private view(entry: Entry): unknown {
    return entry.layers.reduce((acc, layer) => layer.update(acc), entry.base);
  }

  private markStale(entry: Entry): void {
    entry.invalidated = true;
    entry.staleBefore = entry.seq;
  }

  private publish(entry: Entry): void {
    const hasView = entry.hasBase || entry.layers.length > 0;
    entry.snapshot = {
      data: this.view(entry),
      error: entry.error,
      status: entry.inFlight && !hasView ? 'loading' : entry.baseStatus,
      isFetching: entry.inFlight !== undefined,
      isInvalidated: entry.invalidated,
      updatedAt: entry.updatedAt,
    };
    for (const listener of [...entry.listeners]) listener();
  }

  private refreshIfObserved(entry: Entry): void {
    if (entry.listeners.size === 0 || !entry.fetcher) return;
    this.start(entry, entry.fetcher).catch(noop);
  }

  private current(entry: Entry, seq: number): boolean {
    return this.entries.get(entry.hash) === entry && entry.seq === seq;
  }

  private start<T>(entry: Entry, fn: () => Promise<T>): Promise<T | undefined> {
    entry.seq += 1;
    const seq = entry.seq;
    const self: { promise?: Promise<T | undefined> } = {};
    let pending: Promise<T>;
    try {
      pending = Promise.resolve(fn());
    } catch (error) {
      pending = Promise.reject(error);
    }

    const run = async (): Promise<T | undefined> => {
      try {
        const data = await pending;
        if (this.current(entry, seq)) {
          entry.base = data;
          entry.hasBase = true;
          entry.baseStatus = 'success';
          entry.error = undefined;
          entry.updatedAt = this.clock.now();
          entry.invalidated = seq <= entry.staleBefore;
        }
        return this.view(entry) as T | undefined;
      } catch (error) {
        if (!this.current(entry, seq)) return this.view(entry) as T | undefined;
        entry.error = error;
        entry.baseStatus = 'error';
        throw error;
      } finally {
        if (entry.inFlight === self.promise) entry.inFlight = undefined;
        if (this.entries.get(entry.hash) === entry) this.publish(entry);
      }
    };

    self.promise = run();
    entry.inFlight = self.promise;
    this.publish(entry);
    return self.promise;
  }
}

export const createQueryClient = (options?: QueryClientOptions): QueryClient =>
  new QueryClient(options);
