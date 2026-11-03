import type { BillLineItem } from '@pp/contracts-domain';
import { DAY_MS, postTxn, walletOf } from '@pp/mock-db';
import { fail } from '../errors';
import type { Registry } from '../context';
import { assertCanSpend } from '../limits';
import { bpsOf } from '../util';
import { balanceView } from './shared';

const sameItems = (a: BillLineItem[], b: BillLineItem[]): boolean =>
  a.length === b.length &&
  a.every(
    (x, i) => x.label === b[i]?.label && x.amount === b[i]?.amount && x.feeBps === b[i]?.feeBps,
  );

/** Fee is charged per line and rounded half up on each line. */
export const feeFor = (items: BillLineItem[]): number =>
  items.reduce((sum, item) => sum + bpsOf(item.amount, item.feeBps), 0);

export function registerBills(r: Registry): void {
  r.auth('bills.billers', ({ db }) => ({ items: db.t.billers }));

  r.auth('bills.dues', ({ db, userId }) => ({
    items: db.t.dues.filter((d) => d.ownerId === userId).map((d) => d.due),
  }));

  r.auth('bills.pay', ({ db, now, userId, body, idempotencyKey }) => {
    const biller = db.t.billers.find((b) => b.id === body.billerId);
    const record = db.t.dues.find(
      (d) =>
        d.ownerId === userId &&
        d.due.billerId === body.billerId &&
        d.due.accountRef === body.accountRef,
    );
    if (!biller || !record) throw fail('not_found', 'No bill found for this account');
    if (!sameItems(record.due.items, body.items)) {
      throw fail('conflict', 'The bill amount has changed', { items: record.due.items });
    }
    const amount = body.items.reduce((sum, item) => sum + item.amount, 0);
    const fee = feeFor(body.items);
    assertCanSpend(db, userId, now, amount + fee);
    const balance = walletOf(db, userId).balance;
    if (balance < amount + fee) {
      throw fail('insufficient_funds', 'Insufficient balance', { balance, required: amount + fee });
    }
    const txn = postTxn(db, now, {
      ownerId: userId,
      type: 'bill_pay',
      amount,
      fee,
      counterparty: { name: biller.name },
      idempotencyKey,
    });
    record.due.dueAt += 30 * DAY_MS;
    return { txn, balance: balanceView(db, userId, now) };
  });

  r.auth('bills.recharge', ({ db, now, userId, body, idempotencyKey }) => {
    const biller = db.t.billers.find((b) => b.id === body.billerId);
    if (!biller) throw fail('not_found', 'Biller not found');
    if (biller.category !== 'mobile' && biller.category !== 'dth') {
      throw fail('invalid_request', 'This biller does not support recharge');
    }
    if (body.amount <= 0 || body.accountRef.trim() === '')
      throw fail('invalid_request', 'Invalid recharge request');
    assertCanSpend(db, userId, now, body.amount);
    const balance = walletOf(db, userId).balance;
    if (balance < body.amount) {
      throw fail('insufficient_funds', 'Insufficient balance', { balance, required: body.amount });
    }
    const txn = postTxn(db, now, {
      ownerId: userId,
      type: 'recharge',
      amount: body.amount,
      counterparty: { name: biller.name },
      idempotencyKey,
    });
    return { txn, balance: balanceView(db, userId, now) };
  });

  r.auth('bills.setAutopay', ({ db, userId, body }) => {
    if (!db.t.billers.some((b) => b.id === body.billerId))
      throw fail('not_found', 'Biller not found');
    if (body.maxAmount <= 0) throw fail('invalid_request', 'Maximum amount must be positive');
    const existing = db.t.autopay.find(
      (a) =>
        a.ownerId === userId &&
        a.autopay.billerId === body.billerId &&
        a.autopay.accountRef === body.accountRef,
    );
    if (existing) existing.autopay = body;
    else db.t.autopay.push({ ownerId: userId, autopay: body });
    return { autopay: body };
  });
}
