import { z } from 'zod';
import {
  ContactSchema,
  PreferencesSchema,
  UserIdSchema,
  UserSchema,
  type Contact,
  type Preferences,
  type User,
} from '@pp/contracts-domain';
import type { HttpClient } from '@pp/core-net';
import { AppError } from '@pp/core-result';
import type { JsonStore } from '@pp/core-storage';
import { createUserCache, type UserCache } from './cache';
import type { ProfileBus } from './types';

export const DEFAULT_PREFERENCES: Preferences = {
  language: 'en',
  lockTimeoutSec: 60,
  biometricsEnabled: false,
  hideBalance: false,
  pushEnabled: true,
};

export interface ProfileService {
  getProfile(): Promise<User>;
  getCachedProfile(): Promise<User | null>;
  updateName(name: string): Promise<User>;
  getContacts(): Promise<Contact[]>;
  getCachedContacts(): Promise<Contact[]>;
  addContact(input: { name: string; phone: string }): Promise<Contact>;
  getPreferences(): Promise<Preferences>;
  getCachedPreferences(): Promise<Preferences>;
  setPreferences(next: Preferences): Promise<Preferences>;
  updatePreferences(patch: Partial<Preferences>): Promise<Preferences>;
  /** Drops everything cached for one user (used when a session ends). */
  clearUser(userId: string): Promise<void>;
}

export interface ProfileServiceDeps {
  http: HttpClient;
  /** Device-level storage; this service namespaces everything per user inside it. */
  storage: JsonStore;
  bus: ProfileBus;
  getUserId: () => string | null;
}

/** Failures that say nothing about the data: no connection, or the server is unavailable. */
const isUnavailable = (error: unknown): boolean =>
  error instanceof AppError &&
  (error.code === 'network' || error.code === 'timeout' || error.code === 'server_error');

const ContactsSchema = z.array(ContactSchema);

export function createProfileService(deps: ProfileServiceDeps): ProfileService {
  const cache: UserCache = createUserCache(deps.storage, 'profile');

  /** The user this call belongs to, fixed at call time so a later account switch cannot redirect the write. */
  function requireUser(): string {
    const userId = deps.getUserId();
    if (!userId) throw new AppError('unauthorized', 'No active session');
    return userId;
  }

  const changed = (userId: string): void =>
    deps.bus.emit('profile.changed', { userId: UserIdSchema.parse(userId) });

  async function fetchWithFallback<T>(
    userId: string,
    load: () => Promise<T>,
    fallback: () => Promise<T | null>,
  ): Promise<T> {
    try {
      return await load();
    } catch (error) {
      if (!isUnavailable(error)) throw error;
      const cached = await fallback();
      if (cached === null) throw error;
      return cached;
    }
  }

  const readPreferences = async (userId: string): Promise<Preferences> =>
    (await cache.read(userId, 'preferences', PreferencesSchema)) ?? DEFAULT_PREFERENCES;

  return {
    getCachedProfile: () => cache.read(requireUser(), 'user', UserSchema),
    async getProfile() {
      const userId = requireUser();
      return fetchWithFallback(
        userId,
        async () => {
          const { user } = await deps.http.call('profile.get');
          await cache.write(userId, 'user', user);
          return user;
        },
        () => cache.read(userId, 'user', UserSchema),
      );
    },
    async updateName(name) {
      const userId = requireUser();
      const { user } = await deps.http.call('profile.update', { body: { name: name.trim() } });
      await cache.write(userId, 'user', user);
      changed(userId);
      return user;
    },
    async getCachedContacts() {
      return (await cache.read(requireUser(), 'contacts', ContactsSchema)) ?? [];
    },
    async getContacts() {
      const userId = requireUser();
      return fetchWithFallback(
        userId,
        async () => {
          const { items } = await deps.http.call('profile.contacts');
          await cache.write(userId, 'contacts', items);
          return items;
        },
        () => cache.read(userId, 'contacts', ContactsSchema),
      );
    },
    async addContact(input) {
      const userId = requireUser();
      const { contact } = await deps.http.call('profile.addContact', { body: input });
      const existing = (await cache.read(userId, 'contacts', ContactsSchema)) ?? [];
      await cache.write(userId, 'contacts', [
        ...existing.filter((c) => c.id !== contact.id),
        contact,
      ]);
      changed(userId);
      return contact;
    },
    getCachedPreferences: () => readPreferences(requireUser()),
    async getPreferences() {
      const userId = requireUser();
      return fetchWithFallback(
        userId,
        async () => {
          const { preferences } = await deps.http.call('profile.preferences');
          await cache.write(userId, 'preferences', preferences);
          return preferences;
        },
        async () =>
          (await cache.read(userId, 'preferences', PreferencesSchema)) ?? DEFAULT_PREFERENCES,
      );
    },
    async setPreferences(next) {
      const userId = requireUser();
      const { preferences } = await deps.http.call('profile.setPreferences', { body: next });
      await cache.write(userId, 'preferences', preferences);
      changed(userId);
      return preferences;
    },
    async updatePreferences(patch) {
      const userId = requireUser();
      const current = await readPreferences(userId);
      const { preferences } = await deps.http.call('profile.setPreferences', {
        body: { ...current, ...patch },
      });
      await cache.write(userId, 'preferences', preferences);
      changed(userId);
      return preferences;
    },
    clearUser: (userId) => cache.clear(userId),
  };
}
