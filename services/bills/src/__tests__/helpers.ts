import type { Session, UserId } from '@pp/contracts-domain';
import type { AppEventMap } from '@pp/contracts-events';
import { createEventBus } from '@pp/core-event-bus';
import { createHttpClient, type HttpClient } from '@pp/core-net';
import { createMemoryBackend, createUserStorage, withJson, type JsonStore } from '@pp/core-storage';
import { createMockServer, type MockServer } from '@pp/mock-server';

export interface TestEnv {
  server: MockServer;
  http: HttpClient;
  storage: JsonStore;
  bus: ReturnType<typeof createEventBus<AppEventMap>>;
  userId: UserId;
  session: Session;
}

export function createEnv(
  userId = 'usr_001',
  server: MockServer = createMockServer({ seed: 7 }),
): TestEnv {
  const session = server.admin.loginAs(userId);
  const http = createHttpClient({
    baseUrl: 'https://mock.test',
    fetch: server.fetch,
    getAccessToken: () => session.accessToken,
    retry: { maxAttempts: 1 },
  });
  return {
    server,
    http,
    storage: createUserStorage(userId, withJson(createMemoryBackend())),
    bus: createEventBus<AppEventMap>(),
    userId: session.userId,
    session,
  };
}
