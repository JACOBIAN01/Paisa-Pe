import { appBus } from '@pp/core-event-bus';
import { createContainer, type Container } from '@pp/core-di';
import { createHttpClient, HTTP_CLIENT, type FetchLike, type HttpClient } from '@pp/core-net';
import { createQueryClient, QUERY_CLIENT, type QueryClient } from '@pp/core-query';
import { appStorage, SECURE_STORAGE, secureStorage } from '@pp/core-storage';
import { CLOCK, getClock } from '@pp/core-time';
import { createConnectivity, createFetchProbe, type Connectivity } from '@pp/platform-connectivity';
import type { Preferences } from '@pp/contracts-domain';
import { createMockServer, type MockServer } from '@pp/mock-server';
import {
  AUTH_SERVICE,
  PIN_SERVICE,
  createAuthService,
  createPinService,
  expoHasher,
  type AuthService,
  type PinService,
} from '@pp/svc-auth';
import { LIMITS_SERVICE, createLimitsService } from '@pp/svc-limits';
import { PROFILE_SERVICE, createProfileService, type ProfileService } from '@pp/svc-profile';
import { wireUserServices, type UserServices } from './wire-user';

export const DEFAULT_BASE_URL = 'https://api.paisape.app';
const CONNECTIVITY_INTERVAL_MS = 15_000;

export interface RuntimeOptions {
  /** Network layer. Omit in development to run against the in-process mock platform. */
  fetch?: FetchLike;
  baseUrl?: string;
}

export interface AppRuntime {
  auth: AuthService;
  pin: PinService;
  profile: ProfileService;
  http: HttpClient;
  queryClient: QueryClient;
  connectivity: Connectivity;
  /** Present only when running against the in-process mock platform. */
  mockServer: MockServer | null;
  root: Container;
  /** Active user's services, or the root container when signed out. */
  getContainer(): Container;
  subscribeContainer(listener: () => void): () => void;
  /** Saved preferences of the signed-in user, or null when signed out. */
  readPreferences(): Promise<Preferences | null>;
  /** Restores saved sessions and builds the active user's services. */
  start(): Promise<void>;
  /** Resolves once the services for the current account exist. */
  whenIdle(): Promise<void>;
  dispose(): void;
}

export function createAppRuntime(options: RuntimeOptions = {}): AppRuntime {
  const clock = getClock();
  const mockServer = options.fetch ? null : createMockServer({ clock });
  const fetchImpl: FetchLike = options.fetch ?? (mockServer as MockServer).fetch;
  const baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;

  const connectivity = createConnectivity({
    probe: mockServer ? async () => true : createFetchProbe({ url: `${baseUrl}/health` }),
    intervalMs: CONNECTIVITY_INTERVAL_MS,
    clock,
  });

  const authRef: { current: AuthService | null } = { current: null };
  const requireAuth = (): AuthService => {
    if (!authRef.current) throw new Error('auth service is not ready');
    return authRef.current;
  };
  const http = createHttpClient({
    baseUrl,
    fetch: fetchImpl,
    clock,
    getAccessToken: () => requireAuth().getAccessToken(),
    onUnauthorized: () => requireAuth().onUnauthorized(),
  });
  const auth = createAuthService({
    http: () => http,
    storage: appStorage,
    secure: secureStorage,
    bus: appBus,
    clock,
  });
  authRef.current = auth;
  const pin = createPinService({
    storage: appStorage,
    secure: secureStorage,
    clock,
    hasher: expoHasher,
  });
  const getUserId = (): string | null => auth.getState().activeUserId;
  const profile = createProfileService({ http, storage: appStorage, bus: appBus, getUserId });
  const queryClient = createQueryClient({ clock });

  const root = createContainer();
  root.registerValue(CLOCK, clock);
  root.registerValue(HTTP_CLIENT, http);
  root.registerValue(SECURE_STORAGE, secureStorage);
  root.registerValue(AUTH_SERVICE, auth);
  root.registerValue(PIN_SERVICE, pin);
  root.registerValue(QUERY_CLIENT, queryClient);
  root.registerValue(PROFILE_SERVICE, profile);
  root.registerValue(
    LIMITS_SERVICE,
    createLimitsService({ http, storage: appStorage, bus: appBus, getUserId }),
  );

  const listeners = new Set<() => void>();
  let active: { userId: string; services: UserServices } | null = null;
  let pending: Promise<void> = Promise.resolve();
  let container: Container = root;

  const publish = (next: Container): void => {
    container = next;
    listeners.forEach((listener) => listener());
  };

  const activate = (userId: string | null): Promise<void> => {
    pending = pending.then(async () => {
      if (active?.userId === userId) return;
      active?.services.dispose();
      active = null;
      queryClient.clear();
      if (userId === null) {
        publish(root);
        return;
      }
      const services = await wireUserServices({
        root,
        userId,
        http,
        deviceStorage: appStorage,
        bus: appBus,
        clock,
        isOnline: connectivity.isOnline,
        onOnlineChange: connectivity.subscribe,
      });
      active = { userId, services };
      publish(services.container);
    });
    return pending;
  };

  const unsubscribeAuth = auth.subscribe((state) => {
    void activate(state.activeUserId);
  });

  return {
    auth,
    pin,
    profile,
    http,
    queryClient,
    connectivity,
    mockServer,
    root,
    async readPreferences() {
      if (getUserId() === null) return null;
      return profile.getCachedPreferences().catch(() => null);
    },
    getContainer: () => container,
    subscribeContainer(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    async start() {
      const state = await auth.restore();
      await activate(state.activeUserId);
    },
    whenIdle: () => pending,
    dispose() {
      unsubscribeAuth();
      connectivity.stop();
      active?.services.dispose();
      active = null;
      listeners.clear();
    },
  };
}
