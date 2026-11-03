import type { MoneyRequest, SplitBill, UserId } from '@pp/contracts-domain';
import { DAY_MS, notificationId, requestId, splitId, paise, type Database } from '@pp/mock-db';
import { fail } from '../errors';
import type { Registry } from '../context';
import { contactsOf, transferFunds, userByPhone } from '../transfer-core';
import { balanceView, newestFirst } from './shared';

const REQUEST_TTL_MS = 7 * DAY_MS;

function expireStale(db: Database, now: number): void {
  for (const request of db.t.requests) {
    if (request.status === 'pending' && now > request.expiresAt) {
      request.status = 'expired';
      request.updatedAt = db.stamp(now);
    }
  }
}

function findRequest(db: Database, id: string): MoneyRequest {
  const request = db.t.requests.find((q) => q.id === id);
  if (!request) throw fail('not_found', 'Request not found');
  return request;
}

function settle(
  db: Database,
  now: number,
  request: MoneyRequest,
  status: MoneyRequest['status'],
): void {
  request.status = status;
  request.updatedAt = db.stamp(now);
}

function requirePending(request: MoneyRequest): void {
  if (request.status !== 'pending') {
    throw fail('request_not_pending', 'This request is no longer pending', {
      status: request.status,
    });
  }
}

function openRequest(
  db: Database,
  now: number,
  requester: UserId,
  payer: UserId,
  amount: number,
  note: string | undefined,
  split?: SplitBill,
): MoneyRequest {
  const stamp = db.stamp(now);
  const request: MoneyRequest = {
    id: requestId(db.nextId('req')),
    requesterId: requester,
    payerId: payer,
    amount: paise(amount),
    note,
    status: 'pending',
    splitId: split?.id,
    createdAt: stamp,
    updatedAt: stamp,
    expiresAt: now + REQUEST_TTL_MS,
  };
  db.t.requests.push(request);
  const requesterName = db.t.users.get(requester)?.user.name ?? 'Someone';
  db.t.notifications.push({
    ownerId: payer,
    notification: {
      id: notificationId(db.nextId('nt')),
      kind: 'request',
      title: 'Payment request',
      body: `${requesterName} requested ₹${(amount / 100).toFixed(2)}`,
      read: false,
      createdAt: now,
      route: { name: 'request-detail', params: { id: request.id } },
    },
  });
  return request;
}

function payerFor(db: Database, owner: UserId, contactId: string): UserId {
  const contact = contactsOf(db, owner).find((c) => c.id === contactId);
  if (!contact) throw fail('not_found', 'Contact not found');
  const user = userByPhone(db, contact.phone);
  if (!user) throw fail('invalid_request', `${contact.name} is not on PaisaPe`, { contactId });
  if (user.id === owner) throw fail('invalid_request', 'You cannot request money from yourself');
  return user.id;
}

export function registerRequests(r: Registry): void {
  r.auth('requests.list', ({ db, now, userId, query }) => {
    expireStale(db, now);
    const mine = db.t.requests.filter((q) => {
      if (query.direction === 'incoming') return q.payerId === userId;
      if (query.direction === 'outgoing') return q.requesterId === userId;
      return q.payerId === userId || q.requesterId === userId;
    });
    return { items: newestFirst(mine) };
  });

  r.auth('requests.create', ({ db, now, userId, body }) => {
    if (body.amount <= 0) throw fail('invalid_request', 'Amount must be positive');
    const payer = payerFor(db, userId, body.from);
    return { request: openRequest(db, now, userId, payer, body.amount, body.note) };
  });

  r.auth('requests.pay', ({ db, now, userId, params, idempotencyKey }) => {
    expireStale(db, now);
    const request = findRequest(db, params.id);
    if (request.payerId !== userId) throw fail('not_found', 'Request not found');
    requirePending(request);
    const requester = db.t.users.get(request.requesterId);
    if (!requester) throw fail('not_found', 'Requester not found');
    const txn = transferFunds(db, now, {
      from: userId,
      to: { phone: requester.user.phone, userId: requester.user.id, name: requester.user.name },
      amount: request.amount,
      note: request.note,
      idempotencyKey,
    });
    settle(db, now, request, 'paid');
    return { request, txn, balance: balanceView(db, userId, now) };
  });

  r.auth('requests.decline', ({ db, now, userId, params }) => {
    expireStale(db, now);
    const request = findRequest(db, params.id);
    if (request.payerId !== userId) throw fail('not_found', 'Request not found');
    requirePending(request);
    settle(db, now, request, 'declined');
    return { request };
  });

  r.auth('requests.cancel', ({ db, now, userId, params }) => {
    expireStale(db, now);
    const request = findRequest(db, params.id);
    if (request.requesterId !== userId) throw fail('not_found', 'Request not found');
    requirePending(request);
    settle(db, now, request, 'cancelled');
    return { request };
  });

  r.auth('splits.create', ({ db, now, userId, body }) => {
    const ids = body.shares.map((s) => s.contactId);
    if (new Set(ids).size !== ids.length) throw fail('invalid_request', 'Duplicate participant');
    const sum = body.shares.reduce((acc, s) => acc + s.share, 0);
    if (body.total <= 0 || body.shares.some((s) => s.share <= 0) || sum > body.total) {
      throw fail('invalid_request', 'Shares must be positive and cannot exceed the total', {
        total: body.total,
        shares: sum,
      });
    }
    const payers = body.shares.map((s) => payerFor(db, userId, s.contactId));
    const split: SplitBill = {
      id: splitId(db.nextId('spl')),
      createdBy: userId,
      total: body.total,
      shares: body.shares,
      note: body.note,
      createdAt: db.stamp(now),
    };
    db.t.splits.push(split);
    const requests = body.shares.map((s, i) =>
      openRequest(db, now, userId, payers[i] as UserId, s.share, body.note, split),
    );
    return { split, requests };
  });
}
