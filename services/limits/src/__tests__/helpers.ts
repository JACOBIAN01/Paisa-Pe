import type { AppEventMap } from '@pp/contracts-events';
import type { Limits } from '@pp/contracts-domain';
import { createEventBus } from '@pp/core-event-bus';
import { createHttpClient, type HttpClient } from '@pp/core-net';
import { createMemoryBackend, createStorage, type JsonStore } from '@pp/core-storage';
import {
  createManualClock,
  createMockServer,
  type ManualClock,
  type MockServer,
} from '@pp/mock-server';
import { createLimitsService, type LimitsService } from '../limits-service';

export interface LimitsRig {
  server: MockServer;
  clock: ManualClock;
  storage: JsonStore;
  service: LimitsService;
  bus: ReturnType<typeof createEventBus<AppEventMap>>;
  signInAs(userId: string): void;
  restart(): LimitsService;
}

export function createLimitsRig(): LimitsRig {
  const clock = createManualClock(1_800_000_000_000);
  const server = createMockServer({ clock });
  const tokens = new Map<string, string>();
  let active: string | null = null;
  const http: HttpClient = createHttpClient({
    baseUrl: 'http://mock',
    fetch: server.fetch,
    getAccessToken: () => (active ? (tokens.get(active) ?? null) : null),
    retry: { maxAttempts: 1 },
  });
  const storage = createStorage({ namespace: 'limits-test', backend: createMemoryBackend() });
  const bus = createEventBus<AppEventMap>();
  const build = (): LimitsService =>
    createLimitsService({ http, storage, bus, getUserId: () => active });
  return {
    server,
    clock,
    storage,
    bus,
    service: build(),
    restart: build,
    signInAs(userId) {
      if (!tokens.has(userId)) tokens.set(userId, server.admin.loginAs(userId).accessToken);
      active = userId;
    },
  };
}

export const sampleLimits = (overrides: Partial<Limits> = {}): Limits =>
  ({
    tier: 'full',
    perTxn: 100_000_00,
    daily: { limit: 200_000_00, used: 0 },
    monthly: { limit: 500_000_00, used: 0 },
    walletCap: 1_000_000_00,
    asOf: 1,
    ...overrides,
  }) as Limits;
