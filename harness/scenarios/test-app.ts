import { appBus } from '@pp/core-event-bus';
import { createContainer, type Container } from '@pp/core-di';
import { createHttpClient, HTTP_CLIENT, type FetchLike, type HttpClient } from '@pp/core-net';
import { createQueryClient, QUERY_CLIENT, type QueryClient } from '@pp/core-query';
import { SECURE_STORAGE } from '@pp/core-storage';
import { CLOCK } from '@pp/core-time';
import type { MockAdmin } from '@pp/mock-admin';
import type { Chaos } from '@pp/mock-chaos';
import { createMockServer, type MockServer } from '@pp/mock-server';
import {
  AUTH_SERVICE,
  PIN_SERVICE,
  createAuthService,
  createPinService,
  type AuthService,
  type PinService,
} from '@pp/svc-auth';
import { LIMITS_SERVICE, createLimitsService } from '@pp/svc-limits';
import { PROFILE_SERVICE, createProfileService } from '@pp/svc-profile';
import { createFakeClock, type FakeClock } from '../clock';
import { nodePinHasher } from '../hasher';
import { resetTestEnvironment } from '../reset';
import { createTestStorage, type TestStorage } from '../storage-mock';
import { wireUserServices, type UserServices } from './wire';

export const DEMO_OTP = '123456';
export const BASE_URL = 'http://mock.paisape.test';

export interface TestAppOptions {
  seed?: number;
  /** Demo user to sign in as (usr_001 .. usr_008). */
  user?: string;
  /** Sign in during setup. Default true. */
  loggedIn?: boolean;
  online?: boolean;
  /** Start time for the fake clock. */
  start?: number;
}

export interface TestApp {
  clock: FakeClock;
  server: MockServer;
  admin: MockAdmin;
  chaos: Chaos;
  http: HttpClient;
  auth: AuthService;
  pin: PinService;
  storage: TestStorage;
  queryClient: QueryClient;
  /** Infrastructure bindings plus the device-wide services (auth, pin, profile, limits). */
  root: Container;
  /** Active user's container: the per-user services. Falls back to `root` when signed out. */
  readonly container: Container;
  userId(): string | null;
  /** Signs in through the real OTP flow. Resolves once the user's services are ready. */
  login(userId?: string): Promise<void>;
  switchAccount(userId: string): Promise<void>;
  logout(): Promise<void>;
  setOnline(online: boolean): void;
  isOnline(): boolean;
  dispose(): void;
}

export const phoneOf = (userId: string): string => `+9198000000${userId.slice(-2)}`;

export async function createTestApp(options: TestAppOptions = {}): Promise<TestApp> {
  resetTestEnvironment();
  const clock = createFakeClock(options.start);
  clock.install();
  const server = createMockServer({ clock, seed: options.seed ?? 1 });
  const storage = createTestStorage();

  let online = options.online ?? true;
  const onlineListeners = new Set<(value: boolean) => void>();

  const fetch: FetchLike = (url, init) =>
    online ? server.fetch(url, init) : Promise.reject(new TypeError('Network request failed'));

  const authRef: { current: AuthService | null } = { current: null };
  const requireAuth = (): AuthService => {
    if (!authRef.current) throw new Error('auth service is not ready');
    return authRef.current;
  };
  const http = createHttpClient({
    baseUrl: BASE_URL,
    fetch,
    clock,
    getAccessToken: () => requireAuth().getAccessToken(),
    onUnauthorized: () => requireAuth().onUnauthorized(),
    retry: { maxAttempts: 1 },
  });
  const auth = createAuthService({
    http: () => http,
    storage: storage.storage,
    secure: storage.secure,
    bus: appBus,
    clock,
  });
  authRef.current = auth;
  const pin = createPinService({
    storage: storage.storage,
    secure: storage.secure,
    clock,
    hasher: nodePinHasher,
    rounds: 8,
  });
  const queryClient = createQueryClient({ clock });

  const root = createContainer();
  root.registerValue(CLOCK, clock);
  root.registerValue(HTTP_CLIENT, http);
  root.registerValue(SECURE_STORAGE, storage.secure);
  root.registerValue(AUTH_SERVICE, auth);
  root.registerValue(PIN_SERVICE, pin);
  root.registerValue(QUERY_CLIENT, queryClient);
  root.registerValue(
    PROFILE_SERVICE,
    createProfileService({
      http,
      storage: storage.storage,
      bus: appBus,
      getUserId: () => auth.getState().activeUserId,
    }),
  );
  root.registerValue(
    LIMITS_SERVICE,
    createLimitsService({
      http,
      storage: storage.storage,
      bus: appBus,
      getUserId: () => auth.getState().activeUserId,
    }),
  );

  let active: { userId: string; services: UserServices } | null = null;
  let pending: Promise<void> = Promise.resolve();

  const activate = (userId: string | null): Promise<void> => {
    pending = pending.then(async () => {
      if (active?.userId === userId) return;
      active?.services.dispose();
      active = null;
      queryClient.clear();
      if (userId === null) return;
      const services = await wireUserServices({
        root,
        userId,
        http,
        deviceStorage: storage.storage,
        bus: appBus,
        clock,
        isOnline: () => online,
        onOnlineChange: (listener) => {
          onlineListeners.add(listener);
          return () => {
            onlineListeners.delete(listener);
          };
        },
      });
      active = { userId, services };
    });
    return pending;
  };

  const unsubscribe = auth.subscribe((state) => {
    void activate(state.activeUserId);
  });

  const app: TestApp = {
    clock,
    server,
    admin: server.admin,
    chaos: server.chaos,
    http,
    auth,
    pin,
    storage,
    queryClient,
    root,
    get container() {
      return active?.services.container ?? root;
    },
    userId: () => auth.getState().activeUserId,
    async login(userId = options.user ?? 'usr_001') {
      const challenge = await auth.requestOtp(phoneOf(userId));
      await auth.verifyOtp(challenge.otpId, DEMO_OTP);
      await activate(auth.getState().activeUserId);
    },
    async switchAccount(userId) {
      await auth.switchAccount(userId);
      await activate(auth.getState().activeUserId);
    },
    async logout() {
      await auth.logout();
      await activate(auth.getState().activeUserId);
    },
    setOnline(next) {
      if (next === online) return;
      online = next;
      [...onlineListeners].forEach((listener) => listener(next));
    },
    isOnline: () => online,
    dispose() {
      unsubscribe();
      active?.services.dispose();
      active = null;
      queryClient.clear();
    },
  };

  await auth.restore();
  if (options.loggedIn ?? true) await app.login();
  return app;
}
