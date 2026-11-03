import { createHash, randomBytes } from 'node:crypto';
import { createMockServer, type MockServer } from '@pp/mock-server';
import { createEventBus } from '@pp/core-event-bus';
import type { AppEventMap } from '@pp/contracts-events';
import { createHttpClient, type HttpClient } from '@pp/core-net';
import {
  createMemoryBackend,
  createSecureStorage,
  createStorage,
  type JsonStore,
  type SecureStorage,
} from '@pp/core-storage';
import type { Clock } from '@pp/core-time';
import { createAuthService, type AuthService } from '../auth-service';
import type { PinHasher } from '../hasher';
import { createPinService, type PinService } from '../pin-service';

export const PHONE = '+919800000001';
export const OTHER_PHONE = '+919800000002';
export const OTP = '123456';

export interface TestClock extends Clock {
  advance(ms: number): void;
  /** Moves wall time only, like a user changing the date. */
  setWall(ms: number): void;
}

export function createTestClock(start = 1_800_000_000_000): TestClock {
  let wall = start;
  let mono = 1_000;
  return {
    now: () => wall,
    monotonic: () => mono,
    advance(ms) {
      wall += ms;
      mono += ms;
    },
    setWall(ms) {
      wall = ms;
    },
  };
}

export const nodeHasher: PinHasher = {
  digest: async (data) => createHash('sha256').update(data).digest('hex'),
  randomHex: async (bytes) => randomBytes(bytes).toString('hex'),
};

export function createMemorySecure(): { secure: SecureStorage; dump(): Record<string, string> } {
  const data = new Map<string, string>();
  const secure = createSecureStorage({
    getItemAsync: async (key) => data.get(key) ?? null,
    setItemAsync: async (key, value) => {
      data.set(key, value);
    },
    deleteItemAsync: async (key) => {
      data.delete(key);
    },
  });
  return { secure, dump: () => Object.fromEntries(data) };
}

export interface AuthRig {
  clock: TestClock;
  server: MockServer;
  http: HttpClient;
  auth: AuthService;
  storage: JsonStore;
  secure: SecureStorage;
  secureDump(): Record<string, string>;
  events: Array<{ name: keyof AppEventMap; payload: unknown }>;
  /** A second service instance over the same storage, as after an app restart. */
  restart(): AuthService;
}

export function createAuthRig(): AuthRig {
  const clock = createTestClock();
  const server = createMockServer({ clock });
  const storage = createStorage({ namespace: 'test', backend: createMemoryBackend() });
  const { secure, dump } = createMemorySecure();
  const bus = createEventBus<AppEventMap>();
  const events: AuthRig['events'] = [];
  for (const name of ['auth.sessionStarted', 'auth.sessionEnded', 'auth.tokenRefreshed'] as const) {
    bus.on(name, (payload) => events.push({ name, payload }));
  }

  function build(): { auth: AuthService; http: HttpClient } {
    const holder: { http?: HttpClient } = {};
    const auth = createAuthService({
      http: () => holder.http as HttpClient,
      storage,
      secure,
      bus,
      clock,
    });
    const http = createHttpClient({
      baseUrl: 'http://mock',
      fetch: server.fetch,
      getAccessToken: auth.getAccessToken,
      onUnauthorized: auth.onUnauthorized,
      clock,
      retry: { maxAttempts: 1 },
    });
    holder.http = http;
    return { auth, http };
  }

  const first = build();
  return {
    clock,
    server,
    http: first.http,
    auth: first.auth,
    storage,
    secure,
    secureDump: dump,
    events,
    restart: () => build().auth,
  };
}

export async function signIn(rig: AuthRig, phone = PHONE): Promise<string> {
  const challenge = await rig.auth.requestOtp(phone);
  const { user } = await rig.auth.verifyOtp(challenge.otpId, OTP);
  return user.id;
}

export function createPinRig(overrides: { bootId?: string; clock?: TestClock } = {}): {
  clock: TestClock;
  storage: JsonStore;
  secure: SecureStorage;
  secureDump(): Record<string, string>;
  pins: PinService;
  restart(bootId?: string, hasher?: PinHasher): PinService;
} {
  const clock = overrides.clock ?? createTestClock();
  const storage = createStorage({ namespace: 'pin', backend: createMemoryBackend() });
  const { secure, dump } = createMemorySecure();
  const make = (bootId: string, hasher: PinHasher = nodeHasher): PinService =>
    createPinService({ storage, secure, clock, hasher, rounds: 4, bootId });
  return {
    clock,
    storage,
    secure,
    secureDump: dump,
    pins: make(overrides.bootId ?? 'boot-1'),
    restart: (bootId = 'boot-2', hasher) => make(bootId, hasher),
  };
}
