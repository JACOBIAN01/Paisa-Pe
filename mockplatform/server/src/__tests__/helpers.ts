/* eslint-disable @typescript-eslint/no-explicit-any */
import { PRIMARY_USER_ID, paise, userId } from '@pp/mock-db';
import {
  createManualClock,
  createMockServer,
  parseUrl,
  type MockServer,
  type MockServerOptions,
} from '../index';

export const T0 = Date.UTC(2025, 5, 1, 6, 0, 0);
export const PRIMARY = PRIMARY_USER_ID;
export const PRIMARY_PHONE = '+919800000001';
export const DIYA = 'usr_002';
export const DIYA_PHONE = '+919800000002';
export const DIYA_CONTACT = 'ct_001_01';
export const EXTERNAL_PHONE = '+919900000020';

export interface Reply {
  status: number;
  body: any;
  headers: Record<string, string>;
}

export function setup(options: MockServerOptions = {}) {
  const clock = createManualClock(T0);
  const server = createMockServer({ clock, seed: 7, ...options });
  return { server, clock };
}

export function setBalance(server: MockServer, id: string, amount: number): void {
  const wallet = server.db.t.wallets.get(userId(id));
  if (!wallet) throw new Error('no wallet');
  wallet.balance = paise(amount);
}

export function client(server: MockServer, token?: string) {
  const call = (
    method: string,
    url: string,
    body?: unknown,
    headers: Record<string, string> = {},
  ): Reply => {
    const { path, query } = parseUrl(url);
    const merged: Record<string, string> = { ...headers };
    if (token) merged.authorization = `Bearer ${token}`;
    const lowered = Object.fromEntries(
      Object.entries(merged).map(([k, v]) => [k.toLowerCase(), v]),
    );
    const result = server.handle({ method, path, query, headers: lowered, body });
    return { status: result.status, body: result.body, headers: result.headers };
  };
  return {
    get: (url: string) => call('GET', url),
    post: (url: string, body?: unknown, headers?: Record<string, string>) =>
      call('POST', url, body, headers),
    put: (url: string, body?: unknown) => call('PUT', url, body),
    patch: (url: string, body?: unknown) => call('PATCH', url, body),
    del: (url: string) => call('DELETE', url),
    keyed: (url: string, body: unknown, key: string) =>
      call('POST', url, body, { 'Idempotency-Key': key }),
  };
}

export function login(server: MockServer, id = PRIMARY) {
  const session = server.admin.loginAs(id, { name: 'Test phone', platform: 'ios' });
  return { session, api: client(server, session.accessToken) };
}
