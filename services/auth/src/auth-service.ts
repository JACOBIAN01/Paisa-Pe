import {
  SessionIdSchema,
  UserIdSchema,
  type Device,
  type Session,
  type User,
} from '@pp/contracts-domain';
import type { HttpClient } from '@pp/core-net';
import { ApiRequestError } from '@pp/core-result';
import type { JsonStore, SecureStorage } from '@pp/core-storage';
import { getClock, type Clock } from '@pp/core-time';
import { createKeyedQueue } from './mutex';
import { createSessionStore, type SessionStore } from './session-store';
import type { AccountInfo, AuthBus, AuthSnapshot } from './types';

/** Treat tokens this close to expiry as expired so a call does not fail mid-flight. */
export const EXPIRY_SKEW_MS = 10_000;

export interface OtpChallenge {
  otpId: string;
  expiresInSec: number;
  resendAfterSec: number;
}

export interface AuthService {
  restore(): Promise<AuthSnapshot>;
  getState(): AuthSnapshot;
  subscribe(listener: (state: AuthSnapshot) => void): () => void;
  requestOtp(phone: string): Promise<OtpChallenge>;
  verifyOtp(otpId: string, code: string): Promise<{ user: User; isNewUser: boolean }>;
  /** Hook for core-net: the active user's access token, refreshed first when it is about to expire. */
  getAccessToken(): Promise<string | null>;
  /** Hook for core-net: resolves true when the active session was renewed. */
  onUnauthorized(): Promise<boolean>;
  refresh(userId: string): Promise<boolean>;
  switchAccount(userId: string): Promise<void>;
  logout(userId?: string): Promise<void>;
  listDevices(): Promise<Device[]>;
  revokeDevice(deviceId: string): Promise<void>;
}

export interface AuthServiceDeps {
  /** Pass a function when the client needs this service's hooks (construct the client second). */
  http: HttpClient | (() => HttpClient);
  /** Device-level storage for non-secret account metadata. */
  storage: JsonStore;
  secure: SecureStorage;
  bus: AuthBus;
  clock?: Clock;
}

const isDeadSession = (error: unknown): boolean =>
  error instanceof ApiRequestError &&
  (error.code === 'unauthorized' || error.code === 'token_expired');

export function createAuthService(deps: AuthServiceDeps): AuthService {
  const clock = deps.clock ?? getClock();
  const http = (): HttpClient => (typeof deps.http === 'function' ? deps.http() : deps.http);
  const store: SessionStore = createSessionStore(deps.storage, deps.secure);
  const exclusive = createKeyedQueue();
  const inFlight = new Map<string, Promise<boolean>>();
  const listeners = new Set<(state: AuthSnapshot) => void>();

  let state: AuthSnapshot = { ready: false, activeUserId: null, accounts: [] };

  function publish(next: AuthSnapshot): void {
    state = next;
    listeners.forEach((listener) => listener(state));
  }

  async function persist(accounts: AccountInfo[], activeUserId: string | null): Promise<void> {
    await store.saveAccounts(accounts, activeUserId);
    publish({ ready: true, accounts, activeUserId });
  }

  async function adopt(session: Session, user: User): Promise<void> {
    // The refresh token is durable first; the in-memory state only follows once it is stored.
    await store.setRefreshToken(session.userId, session.refreshToken);
    store.setAccess(session.userId, session);
    const account: AccountInfo = {
      userId: session.userId,
      sessionId: session.sessionId,
      deviceId: session.deviceId,
      name: user.name,
      phone: user.phone,
    };
    const accounts = [...state.accounts.filter((a) => a.userId !== account.userId), account];
    await persist(accounts, account.userId);
    deps.bus.emit('auth.sessionStarted', { userId: session.userId, sessionId: session.sessionId });
  }

  function announceActive(account: AccountInfo | undefined): void {
    if (!account) return;
    deps.bus.emit('auth.sessionStarted', {
      userId: UserIdSchema.parse(account.userId),
      sessionId: SessionIdSchema.parse(account.sessionId),
    });
  }

  async function endSession(
    userId: string,
    reason: 'logout' | 'revoked' | 'refresh_failed',
  ): Promise<void> {
    store.clearAccess(userId);
    await store.removeRefreshToken(userId);
    const wasActive = state.activeUserId === userId;
    const accounts = state.accounts.filter((a) => a.userId !== userId);
    const active = wasActive ? (accounts[0]?.userId ?? null) : state.activeUserId;
    await persist(accounts, active);
    deps.bus.emit('auth.sessionEnded', { userId: UserIdSchema.parse(userId), reason });
    if (wasActive) announceActive(accounts.find((a) => a.userId === active));
  }

  async function doRefresh(userId: string): Promise<boolean> {
    const refreshToken = await store.getRefreshToken(userId);
    if (!refreshToken) {
      await endSession(userId, 'refresh_failed');
      return false;
    }
    try {
      const { session } = await http().call('auth.refresh', { body: { refreshToken } });
      await store.setRefreshToken(userId, session.refreshToken);
      store.setAccess(userId, session);
      deps.bus.emit('auth.tokenRefreshed', { sessionId: session.sessionId });
      return true;
    } catch (error) {
      if (isDeadSession(error)) await endSession(userId, 'refresh_failed');
      return false;
    }
  }

  /** Concurrent callers share one refresh; rotating tokens make a second one fatal. */
  function refresh(userId: string): Promise<boolean> {
    const pending = inFlight.get(userId);
    if (pending) return pending;
    const run = doRefresh(userId).finally(() => {
      inFlight.delete(userId);
    });
    inFlight.set(userId, run);
    return run;
  }

  return {
    async restore() {
      const persisted = await store.load();
      publish({ ready: true, ...persisted });
      return state;
    },
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    requestOtp: (phone) => http().call('auth.requestOtp', { body: { phone } }),
    async verifyOtp(otpId, code) {
      const { session, user, isNewUser } = await http().call('auth.verifyOtp', {
        body: { otpId, code },
      });
      await exclusive(session.userId, () => adopt(session, user));
      return { user, isNewUser };
    },
    async getAccessToken() {
      const userId = state.activeUserId;
      if (!userId) return null;
      const current = store.getAccess(userId);
      if (current && current.accessExpiresAt - EXPIRY_SKEW_MS > clock.now()) {
        return current.accessToken;
      }
      if (!(await refresh(userId))) return null;
      return store.getAccess(userId)?.accessToken ?? null;
    },
    async onUnauthorized() {
      const userId = state.activeUserId;
      return userId ? refresh(userId) : false;
    },
    refresh,
    async switchAccount(userId) {
      const account = state.accounts.find((a) => a.userId === userId);
      if (!account) throw new Error(`unknown account ${userId}`);
      if (state.activeUserId === userId) return;
      await persist(state.accounts, userId);
      announceActive(account);
    },
    async logout(userId = state.activeUserId ?? undefined) {
      if (!userId) return;
      if (state.activeUserId === userId) {
        await http()
          .call('auth.logout', { body: {} })
          .catch(() => undefined);
      }
      await exclusive(userId, () => endSession(userId, 'logout'));
    },
    async listDevices() {
      return (await http().call('auth.listSessions')).devices;
    },
    async revokeDevice(deviceId) {
      await http().call('auth.revokeSession', { params: { id: deviceId } });
    },
  };
}
