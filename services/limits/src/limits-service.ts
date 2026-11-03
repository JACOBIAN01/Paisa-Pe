import { LimitsSchema, type Limits, type Paise } from '@pp/contracts-domain';
import type { HttpClient } from '@pp/core-net';
import { AppError } from '@pp/core-result';
import { createUserStorage, type JsonStore } from '@pp/core-storage';
import { applySpend, checkAgainst, type CheckInput } from './check';
import type { LimitCheck, LimitsBus } from './types';

const SNAPSHOT_KEY = 'limits.snapshot';

export interface LimitsService {
  /** The active user's snapshot from memory, falling back to storage. */
  getSnapshot(): Promise<Limits | null>;
  /** Fetches fresh limits. When calls overlap, only the most recently started one is applied. */
  refresh(): Promise<Limits>;
  checkAmount(input: CheckInput | Paise): LimitCheck;
  /** Reflects a completed send in the cached usage counters. */
  noteSpent(amount: Paise): Promise<void>;
  clearUser(userId: string): Promise<void>;
  dispose(): void;
}

export interface LimitsServiceDeps {
  http: HttpClient;
  storage: JsonStore;
  bus: LimitsBus;
  getUserId: () => string | null;
}

export function createLimitsService(deps: LimitsServiceDeps): LimitsService {
  const memory = new Map<string, Limits>();
  const latestRequest = new Map<string, number>();
  let counter = 0;

  const storageFor = (userId: string): JsonStore => createUserStorage(userId, deps.storage);

  /** Memory only ever holds the active user; entries for anyone else are dropped. */
  function evictOthers(activeUserId: string | null): void {
    for (const userId of [...memory.keys()]) {
      if (userId !== activeUserId) memory.delete(userId);
    }
  }

  const offStarted = deps.bus.on('auth.sessionStarted', ({ userId }) => evictOthers(userId));
  const offEnded = deps.bus.on('auth.sessionEnded', ({ userId }) => {
    memory.delete(userId);
    latestRequest.delete(userId);
    void storageFor(userId).removeItem(SNAPSHOT_KEY);
  });

  function requireUser(): string {
    const userId = deps.getUserId();
    if (!userId) throw new AppError('unauthorized', 'No active session');
    return userId;
  }

  async function persist(userId: string, limits: Limits): Promise<void> {
    memory.set(userId, limits);
    await storageFor(userId).setJSON(SNAPSHOT_KEY, limits);
  }

  return {
    async getSnapshot() {
      const userId = deps.getUserId();
      if (!userId) return null;
      const cached = memory.get(userId);
      if (cached) return cached;
      const stored = await storageFor(userId).getJSON(SNAPSHOT_KEY, (raw) =>
        LimitsSchema.parse(raw),
      );
      if (stored && deps.getUserId() === userId) memory.set(userId, stored);
      return stored;
    },
    async refresh() {
      const userId = requireUser();
      counter += 1;
      const mine = counter;
      latestRequest.set(userId, mine);
      const { limits } = await deps.http.call('limits.get');
      if (latestRequest.get(userId) === mine) await persist(userId, limits);
      return memory.get(userId) ?? limits;
    },
    checkAmount(input) {
      const userId = deps.getUserId();
      const limits = userId ? memory.get(userId) : undefined;
      if (!limits) return { ok: true };
      return checkAgainst(limits, typeof input === 'number' ? { amount: input } : input);
    },
    async noteSpent(amount) {
      const userId = deps.getUserId();
      const limits = userId ? memory.get(userId) : undefined;
      if (userId && limits) await persist(userId, applySpend(limits, amount));
    },
    async clearUser(userId) {
      memory.delete(userId);
      latestRequest.delete(userId);
      await storageFor(userId).removeItem(SNAPSHOT_KEY);
    },
    dispose() {
      offStarted();
      offEnded();
    },
  };
}
