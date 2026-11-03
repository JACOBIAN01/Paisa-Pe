import { createEventBus } from '@pp/core-event-bus';
import type { AppEventMap } from '@pp/contracts-events';
import { createHttpClient } from '@pp/core-net';
import { createMemoryBackend, withJson } from '@pp/core-storage';
import { PRIMARY_USER_ID } from '@pp/mock-db';
import { createManualClock, createMockServer } from '@pp/mock-server';

export const T0 = Date.UTC(2025, 5, 1, 6, 0, 0);
export const PRIMARY = PRIMARY_USER_ID;

export function setup() {
  const clock = createManualClock(T0);
  const server = createMockServer({ clock, seed: 7 });
  const session = server.admin.loginAs(PRIMARY, { name: 'Test phone', platform: 'ios' });
  const http = createHttpClient({
    baseUrl: 'http://mock.local',
    fetch: server.fetch,
    getAccessToken: () => session.accessToken,
    clock,
    retry: { maxAttempts: 1 },
  });
  const bus = createEventBus<AppEventMap>();
  const backend = createMemoryBackend();
  const storage = withJson(backend);
  return { clock, server, http, bus, storage, backend, session };
}
