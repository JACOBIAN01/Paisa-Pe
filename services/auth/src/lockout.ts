import type { JsonStore } from '@pp/core-storage';
import type { Clock } from '@pp/core-time';

export const LOCKOUT_KEY = 'auth.lockout';
export const ATTEMPTS_PER_LOCK = 5;
export const BASE_LOCK_MS = 30_000;
export const MAX_LOCK_MS = 60 * 60_000;

interface LockoutRecord {
  failedAttempts: number;
  /** Set once a lock has been applied. */
  lock?: {
    durationMs: number;
    /** Process the monotonic reading belongs to. */
    bootId: string;
    monotonicAt: number;
    wallAt: number;
  };
}

export interface LockoutStatus {
  failedAttempts: number;
  attemptsLeft: number;
  locked: boolean;
  remainingMs: number;
}

export interface Lockout {
  status(userId: string): Promise<LockoutStatus>;
  /** Counts the attempt and persists it before the caller compares anything. */
  recordAttempt(userId: string): Promise<LockoutStatus>;
  reset(userId: string): Promise<void>;
}

export interface LockoutDeps {
  storageFor(userId: string): JsonStore;
  clock: Clock;
  /** Identifies this process. A fresh value means stored monotonic readings are meaningless. */
  bootId: string;
}

export const lockDurationFor = (failedAttempts: number): number => {
  const step = Math.floor(failedAttempts / ATTEMPTS_PER_LOCK) - 1;
  return Math.min(BASE_LOCK_MS * 2 ** Math.max(0, step), MAX_LOCK_MS);
};

const isRecord = (raw: unknown): raw is LockoutRecord =>
  typeof raw === 'object' &&
  raw !== null &&
  typeof (raw as LockoutRecord).failedAttempts === 'number';

export function createLockout({ storageFor, clock, bootId }: LockoutDeps): Lockout {
  const load = async (userId: string): Promise<LockoutRecord> =>
    (await storageFor(userId).getJSON(LOCKOUT_KEY, (raw) => (isRecord(raw) ? raw : null))) ?? {
      failedAttempts: 0,
    };

  const save = (userId: string, record: LockoutRecord): Promise<void> =>
    storageFor(userId).setJSON(LOCKOUT_KEY, record);

  function remainingFor(lock: NonNullable<LockoutRecord['lock']>): number {
    if (lock.bootId === bootId) {
      const elapsed = clock.monotonic() - lock.monotonicAt;
      return Math.max(0, lock.durationMs - Math.max(0, elapsed));
    }
    // The process restarted, so the monotonic reading is gone. Use wall time, but a clock
    // set backwards must never shorten the lock.
    const elapsed = clock.now() - lock.wallAt;
    if (elapsed < 0) return lock.durationMs;
    return Math.max(0, lock.durationMs - elapsed);
  }

  const toStatus = (record: LockoutRecord): LockoutStatus => {
    const remainingMs = record.lock ? remainingFor(record.lock) : 0;
    const used = record.failedAttempts % ATTEMPTS_PER_LOCK;
    return {
      failedAttempts: record.failedAttempts,
      attemptsLeft: remainingMs > 0 ? 0 : ATTEMPTS_PER_LOCK - used,
      locked: remainingMs > 0,
      remainingMs,
    };
  };

  return {
    status: async (userId) => toStatus(await load(userId)),
    async recordAttempt(userId) {
      const record = await load(userId);
      const failedAttempts = record.failedAttempts + 1;
      const next: LockoutRecord = { failedAttempts, lock: record.lock };
      if (failedAttempts % ATTEMPTS_PER_LOCK === 0) {
        next.lock = {
          durationMs: lockDurationFor(failedAttempts),
          bootId,
          monotonicAt: clock.monotonic(),
          wallAt: clock.now(),
        };
      }
      await save(userId, next);
      return toStatus(next);
    },
    reset: (userId) => storageFor(userId).removeItem(LOCKOUT_KEY),
  };
}
