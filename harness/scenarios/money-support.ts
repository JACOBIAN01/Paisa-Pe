import type { MoneyRequest, Txn } from '@pp/contracts-domain';
import type { TestApp } from '../scenarios/test-app';

export const ME = 'usr_001';

export const balanceOf = (app: TestApp, userId: string = ME): number =>
  app.admin.getBalance(userId).balance;

export const txnsOf = (app: TestApp, userId: string = ME): Txn[] =>
  [...app.admin.listTxns(userId)].sort(
    (a, b) => b.createdAt - a.createdAt || b.updatedAt - a.updatedAt,
  );

export const sendsOf = (app: TestApp, userId: string = ME): Txn[] =>
  txnsOf(app, userId).filter((txn) => txn.type === 'p2p_send');

/** Makes sure the wallet can cover a scenario without crossing the tier's wallet cap. */
export function ensureBalance(app: TestApp, atLeast: number, userId: string = ME): void {
  const current = balanceOf(app, userId);
  if (current < atLeast) app.admin.credit(userId, atLeast - current);
}

/** Puts a pending request from another demo user into the server's tables. */
export function addIncomingRequest(
  app: TestApp,
  input: { id: string; amount: number; note?: string; from?: string; to?: string },
): MoneyRequest {
  const now = app.clock.now();
  const request = {
    id: input.id,
    requesterId: input.from ?? 'usr_002',
    payerId: input.to ?? ME,
    amount: input.amount,
    note: input.note,
    status: 'pending',
    createdAt: now,
    updatedAt: now,
    expiresAt: now + 86_400_000,
  } as unknown as MoneyRequest;
  (app.server.db.t.requests as MoneyRequest[]).push(request);
  return request;
}

export const requestRow = (app: TestApp, id: string): MoneyRequest | undefined =>
  (app.server.db.t.requests as MoneyRequest[]).find((request) => request.id === id);
