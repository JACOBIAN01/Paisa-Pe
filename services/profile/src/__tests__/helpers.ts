import { createEventBus } from '@pp/core-event-bus';
import type { AppEventMap } from '@pp/contracts-events';
import { createHttpClient, type HttpClient } from '@pp/core-net';
import { createMemoryBackend, createStorage, type JsonStore } from '@pp/core-storage';
import { createMockServer, type MockServer } from '@pp/mock-server';
import { createProfileService, type ProfileService } from '../profile-service';

export interface ProfileRig {
  server: MockServer;
  http: HttpClient;
  storage: JsonStore;
  service: ProfileService;
  events: Array<{ name: string; payload: unknown }>;
  /** Makes `userId` the active user and the bearer for every request. */
  signInAs(userId: string): void;
}

export function createProfileRig(): ProfileRig {
  const server = createMockServer();
  const tokens = new Map<string, string>();
  let active: string | null = null;
  const http = createHttpClient({
    baseUrl: 'http://mock',
    fetch: server.fetch,
    getAccessToken: () => (active ? (tokens.get(active) ?? null) : null),
    retry: { maxAttempts: 1 },
  });
  const storage = createStorage({ namespace: 'profile-test', backend: createMemoryBackend() });
  const bus = createEventBus<AppEventMap>();
  const events: ProfileRig['events'] = [];
  bus.on('profile.changed', (payload) => events.push({ name: 'profile.changed', payload }));
  const service = createProfileService({ http, storage, bus, getUserId: () => active });
  return {
    server,
    http,
    storage,
    service,
    events,
    signInAs(userId) {
      if (!tokens.has(userId)) tokens.set(userId, server.admin.loginAs(userId).accessToken);
      active = userId;
    },
  };
}
