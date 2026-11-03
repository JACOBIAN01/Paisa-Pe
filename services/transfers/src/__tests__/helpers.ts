import type { AppEventMap } from '@pp/contracts-events';
import { createEventBus } from '@pp/core-event-bus';
import { paise } from '@pp/core-money';
import { createHttpClient, type HttpClient } from '@pp/core-net';
import { createMemoryBackend, withJson } from '@pp/core-storage';
import { createLedger } from '@pp/svc-ledger';
import { PRIMARY_USER_ID } from '@pp/mock-db';
import { createManualClock, createMockServer } from '@pp/mock-server';
import { createTransferService, type TransferServiceDeps } from '../index';

export const T0 = Date.UTC(2025, 5, 1, 6, 0, 0);
export const PRIMARY = PRIMARY_USER_ID;
export const DIYA = 'usr_002';
export const DIYA_PHONE = '+919800000002';

interface SetupOptions {
  timeoutMs?: number;
  deps?: Partial<TransferServiceDeps>;
}

export function setup(options: SetupOptions = {}) {
  const clock = createManualClock(T0);
  const server = createMockServer({ clock, seed: 7 });
  const session = server.admin.loginAs(PRIMARY, { name: 'Test phone', platform: 'ios' });
  const real = createHttpClient({
    baseUrl: 'http://mock.local',
    fetch: server.fetch,
    getAccessToken: () => session.accessToken,
    clock,
    retry: { maxAttempts: 1 },
    timeoutMs: options.timeoutMs,
  });
  const sent: string[] = [];
  const http = {
    call: ((name: string, input: never) => {
      if (name === 'transfers.send') sent.push(name);
      return (real.call as (n: string, i: never) => unknown)(name, input);
    }) as HttpClient['call'],
  };
  const bus = createEventBus<AppEventMap>();
  const storage = withJson(createMemoryBackend());
  const ledger = createLedger({ http, storage, bus, clock, userId: PRIMARY });
  ledger.start();
  const transfers = createTransferService({
    http,
    storage,
    ledger,
    bus,
    clock,
    userId: PRIMARY,
    retry: { maxAttempts: 1, baseDelayMs: 10, maxDelayMs: 10, jitter: 0 },
    ...options.deps,
  });
  server.admin.credit(PRIMARY, 500_000);
  return { clock, server, bus, storage, ledger, transfers, http, sent };
}

export const pay = (amount: number) => ({
  to: { phone: DIYA_PHONE as never },
  amount: paise(amount),
});
