import type { AppEventMap } from '@pp/contracts-events';
import { createEventBus } from '@pp/core-event-bus';
import { createHttpClient, type HttpClient } from '@pp/core-net';
import { createMemoryBackend, withJson } from '@pp/core-storage';
import { PRIMARY_USER_ID } from '@pp/mock-db';
import { createManualClock, createMockServer } from '@pp/mock-server';
import { createSyncService, type SyncServiceDeps } from '../index';

export const T0 = Date.UTC(2025, 5, 1, 6, 0, 0);
export const PRIMARY = PRIMARY_USER_ID;
export const DIYA = 'usr_002';

export function setup(options: { pageLimit?: number; deps?: Partial<SyncServiceDeps> } = {}) {
  const clock = createManualClock(T0);
  const server = createMockServer({ clock, seed: 7 });
  const login = (): string =>
    server.admin.loginAs(PRIMARY, { name: 'Test phone', platform: 'ios' }).accessToken;
  let token = login();
  const relogin = (): void => {
    token = login();
  };
  const real = createHttpClient({
    baseUrl: 'http://mock.local',
    fetch: server.fetch,
    getAccessToken: () => token,
    clock,
    retry: { maxAttempts: 1 },
  });
  const calls: string[] = [];
  const http = {
    call: ((name: string, input: never) => {
      calls.push(name);
      return (real.call as (n: string, i: never) => unknown)(name, input);
    }) as HttpClient['call'],
  };
  const bus = createEventBus<AppEventMap>();
  const storage = withJson(createMemoryBackend());
  const sync = createSyncService({
    http,
    storage,
    bus,
    clock,
    userId: PRIMARY,
    pageLimit: options.pageLimit,
    ...options.deps,
  });
  return { clock, server, bus, storage, http, calls, sync, real, relogin };
}

export const flushWrites = (): Promise<void> => new Promise((resolve) => setImmediate(resolve));
