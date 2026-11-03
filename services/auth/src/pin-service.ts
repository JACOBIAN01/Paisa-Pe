import { AppError } from '@pp/core-result';
import { createUserStorage, type JsonStore } from '@pp/core-storage';
import { getClock, type Clock } from '@pp/core-time';
import { createKeyedQueue } from './mutex';
import { createPinVault, type PinVault } from './pin-vault';
import { createLockout, type Lockout } from './lockout';
import { DEFAULT_PIN_ROUNDS, expoHasher, type PinHasher } from './hasher';
import type { SecureStorage } from '@pp/core-storage';

export type VerifyResult =
  | { ok: true }
  | { ok: false; reason: 'wrong'; attemptsLeft: number }
  | { ok: false; reason: 'locked'; remainingMs: number };

export interface PinStatus {
  pinSet: boolean;
  locked: boolean;
  remainingMs: number;
  attemptsLeft: number;
}

export interface PinService {
  isPinSet(userId: string): Promise<boolean>;
  getStatus(userId: string): Promise<PinStatus>;
  setPin(userId: string, pin: string): Promise<void>;
  verifyPin(userId: string, pin: string): Promise<VerifyResult>;
  changePin(userId: string, currentPin: string, nextPin: string): Promise<VerifyResult>;
  clearPin(userId: string): Promise<void>;
  subscribe(listener: (userId: string) => void): () => void;
}

export interface PinServiceDeps {
  /** Device-level storage; per-user data is namespaced inside it. */
  storage: JsonStore;
  secure: SecureStorage;
  clock?: Clock;
  hasher?: PinHasher;
  rounds?: number;
  /** Test hook: supply a fixed process id. */
  bootId?: string;
}

const PIN_PATTERN = /^\d{4}$/;

export function validatePinFormat(pin: string): void {
  if (!PIN_PATTERN.test(pin)) throw new AppError('invalid_request', 'PIN must be 4 digits');
  const digits = [...pin].map(Number);
  const allSame = digits.every((d) => d === digits[0]);
  const step = (digits[1] ?? 0) - (digits[0] ?? 0);
  const sequential =
    Math.abs(step) === 1 && digits.every((d, i) => d - (digits[0] ?? 0) === step * i);
  if (allSame || sequential) throw new AppError('invalid_request', 'PIN is too easy to guess');
}

const randomBootId = (): string => Math.random().toString(36).slice(2) + Date.now().toString(36);

export function createPinService(deps: PinServiceDeps): PinService {
  const clock = deps.clock ?? getClock();
  const vault: PinVault = createPinVault({
    secure: deps.secure,
    hasher: deps.hasher ?? expoHasher,
    rounds: deps.rounds ?? DEFAULT_PIN_ROUNDS,
  });
  const lockout: Lockout = createLockout({
    storageFor: (userId) => createUserStorage(userId, deps.storage),
    clock,
    bootId: deps.bootId ?? randomBootId(),
  });
  const queue = createKeyedQueue();
  const listeners = new Set<(userId: string) => void>();
  const notify = (userId: string): void => listeners.forEach((listener) => listener(userId));

  async function verify(userId: string, pin: string): Promise<VerifyResult> {
    const before = await lockout.status(userId);
    if (before.locked) return { ok: false, reason: 'locked', remainingMs: before.remainingMs };
    if (!(await vault.has(userId))) throw new AppError('forbidden', 'No PIN set');

    // Count the attempt first: if the process dies during the compare it still counts.
    const counted = await lockout.recordAttempt(userId);
    const matched = await vault.matches(userId, pin);
    if (matched) {
      await lockout.reset(userId);
      notify(userId);
      return { ok: true };
    }
    notify(userId);
    if (counted.locked) return { ok: false, reason: 'locked', remainingMs: counted.remainingMs };
    return { ok: false, reason: 'wrong', attemptsLeft: counted.attemptsLeft };
  }

  return {
    isPinSet: (userId) => vault.has(userId),
    async getStatus(userId) {
      const [pinSet, status] = await Promise.all([vault.has(userId), lockout.status(userId)]);
      return {
        pinSet,
        locked: status.locked,
        remainingMs: status.remainingMs,
        attemptsLeft: status.attemptsLeft,
      };
    },
    async setPin(userId, pin) {
      validatePinFormat(pin);
      await queue(userId, async () => {
        await vault.set(userId, pin);
        await lockout.reset(userId);
      });
      notify(userId);
    },
    verifyPin: (userId, pin) => queue(userId, () => verify(userId, pin)),
    async changePin(userId, currentPin, nextPin) {
      validatePinFormat(nextPin);
      const result = await queue(userId, async () => {
        const verified = await verify(userId, currentPin);
        if (verified.ok) await vault.set(userId, nextPin);
        return verified;
      });
      if (result.ok) notify(userId);
      return result;
    },
    async clearPin(userId) {
      await queue(userId, async () => {
        await vault.clear(userId);
        await lockout.reset(userId);
      });
      notify(userId);
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
