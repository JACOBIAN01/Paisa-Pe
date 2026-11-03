import type { Session } from '@pp/contracts-domain';
import { scopedSecureKey, type JsonStore, type SecureStorage } from '@pp/core-storage';
import type { AccountInfo } from './types';

const ACCOUNTS_KEY = 'auth.accounts';
const ACTIVE_KEY = 'auth.active';

export interface AccessToken {
  accessToken: string;
  accessExpiresAt: number;
  sessionId: string;
}

export interface PersistedAuth {
  accounts: AccountInfo[];
  activeUserId: string | null;
}

export interface SessionStore {
  load(): Promise<PersistedAuth>;
  saveAccounts(accounts: AccountInfo[], activeUserId: string | null): Promise<void>;
  getRefreshToken(userId: string): Promise<string | null>;
  setRefreshToken(userId: string, token: string): Promise<void>;
  removeRefreshToken(userId: string): Promise<void>;
  /** Access tokens live in memory only. */
  getAccess(userId: string): AccessToken | null;
  setAccess(userId: string, session: Session): void;
  clearAccess(userId: string): void;
}

const isAccount = (raw: unknown): raw is AccountInfo => {
  if (typeof raw !== 'object' || raw === null) return false;
  const a = raw as Record<string, unknown>;
  return ['userId', 'sessionId', 'deviceId', 'name', 'phone'].every(
    (k) => typeof a[k] === 'string',
  );
};

export function createSessionStore(storage: JsonStore, secure: SecureStorage): SessionStore {
  const access = new Map<string, AccessToken>();
  const refreshKey = (userId: string): string => scopedSecureKey(userId, 'refresh');

  return {
    async load() {
      const raw = await storage.getJSON<unknown[]>(ACCOUNTS_KEY);
      const accounts = Array.isArray(raw) ? raw.filter(isAccount) : [];
      const active = await storage.getItem(ACTIVE_KEY);
      const activeUserId = accounts.some((a) => a.userId === active) ? active : null;
      return { accounts, activeUserId };
    },
    async saveAccounts(accounts, activeUserId) {
      await storage.setJSON(ACCOUNTS_KEY, accounts);
      if (activeUserId === null) await storage.removeItem(ACTIVE_KEY);
      else await storage.setItem(ACTIVE_KEY, activeUserId);
    },
    getRefreshToken: (userId) => secure.get(refreshKey(userId)),
    setRefreshToken: (userId, token) => secure.set(refreshKey(userId), token),
    removeRefreshToken: (userId) => secure.remove(refreshKey(userId)),
    getAccess: (userId) => access.get(userId) ?? null,
    setAccess(userId, session) {
      access.set(userId, {
        accessToken: session.accessToken,
        accessExpiresAt: session.accessExpiresAt,
        sessionId: session.sessionId,
      });
    },
    clearAccess: (userId) => {
      access.delete(userId);
    },
  };
}
