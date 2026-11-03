import type { Contact, IdempotencyKey, Phone, UserId } from '@pp/contracts-domain';
import type { Recipient } from '@pp/contracts-api';
import { notificationId, postTxn, walletOf, type Database, type TxnRecord } from '@pp/mock-db';
import { fail } from './errors';
import { assertCanHold, assertCanSpend } from './limits';

export interface ResolvedRecipient {
  phone: Phone;
  userId?: UserId;
  name: string;
}

export function contactsOf(db: Database, ownerId: UserId): Contact[] {
  return db.t.contacts.filter((c) => c.ownerId === ownerId).map((c) => c.contact);
}

export function userByPhone(db: Database, phone: string): { id: UserId; name: string } | undefined {
  for (const record of db.t.users.values()) {
    if (record.user.phone === phone) return { id: record.user.id, name: record.user.name };
  }
  return undefined;
}

export function resolveRecipient(db: Database, ownerId: UserId, to: Recipient): ResolvedRecipient {
  let phone: Phone;
  if ('contactId' in to) {
    const contact = contactsOf(db, ownerId).find((c) => c.id === to.contactId);
    if (!contact) throw fail('not_found', 'Contact not found');
    phone = contact.phone;
  } else {
    phone = to.phone;
  }
  const contact = contactsOf(db, ownerId).find((c) => c.phone === phone);
  const user = userByPhone(db, phone);
  if (user?.id === ownerId) throw fail('invalid_request', 'You cannot send money to yourself');
  return { phone, userId: user?.id, name: contact?.name ?? user?.name ?? phone };
}

export interface TransferInput {
  from: UserId;
  to: ResolvedRecipient;
  amount: number;
  note?: string;
  idempotencyKey?: IdempotencyKey;
}

/** Debits the sender and credits the recipient (when registered) in one synchronous step. */
export function transferFunds(db: Database, now: number, input: TransferInput): TxnRecord {
  if (!Number.isInteger(input.amount) || input.amount <= 0)
    throw fail('invalid_request', 'Amount must be positive');
  assertCanSpend(db, input.from, now, input.amount);
  const balance = walletOf(db, input.from).balance;
  if (balance < input.amount) {
    throw fail('insufficient_funds', 'Insufficient balance', { balance, required: input.amount });
  }
  if (input.to.userId) assertCanHold(db, input.to.userId, input.amount, true);

  const sender = db.t.users.get(input.from);
  const debit = postTxn(db, now, {
    ownerId: input.from,
    type: 'p2p_send',
    amount: input.amount,
    counterparty: { userId: input.to.userId, name: input.to.name, phone: input.to.phone },
    note: input.note,
    idempotencyKey: input.idempotencyKey,
  });
  if (input.to.userId && sender) {
    const credit = postTxn(db, now, {
      ownerId: input.to.userId,
      type: 'p2p_receive',
      amount: input.amount,
      counterparty: { userId: input.from, name: sender.user.name, phone: sender.user.phone },
      note: input.note,
    });
    db.t.notifications.push({
      ownerId: input.to.userId,
      notification: {
        id: notificationId(db.nextId('nt')),
        kind: 'payment',
        title: 'Money received',
        body: `${sender.user.name} sent you ₹${(input.amount / 100).toFixed(2)}`,
        read: false,
        createdAt: now,
        route: { name: 'txn-detail', params: { id: credit.id } },
      },
    });
  }
  return debit;
}
