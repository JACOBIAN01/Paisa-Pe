import { postTxn } from '@pp/mock-db';
import { fail } from '../errors';
import type { Registry } from '../context';
import { assertCanHold, assertWithinPerTxn } from '../limits';
import { compareStamped, decodeCursor, encodeCursor } from '../util';
import { balanceView, newestFirst, ownTxn } from './shared';

const DEFAULT_PAGE = 20;
const SOURCE_LABEL = { upi: 'UPI', card: 'Debit card', netbanking: 'Net banking' } as const;

export function registerWallet(r: Registry): void {
  r.auth('wallet.balance', ({ db, now, userId }) => balanceView(db, userId, now));

  r.auth('wallet.addMoney', ({ db, now, userId, body, idempotencyKey }) => {
    if (body.amount <= 0) throw fail('invalid_request', 'Amount must be positive');
    assertWithinPerTxn(db, userId, body.amount);
    assertCanHold(db, userId, body.amount);
    const txn = postTxn(db, now, {
      ownerId: userId,
      type: 'add_money',
      amount: body.amount,
      counterparty: { name: SOURCE_LABEL[body.source] },
      idempotencyKey,
    });
    return { txn, balance: balanceView(db, userId, now) };
  });

  r.auth('wallet.transactions', ({ db, userId, query }) => {
    const limit = query.limit ?? DEFAULT_PAGE;
    let items = newestFirst(db.t.txns.filter((t) => t.ownerId === userId));
    if (query.cursor) {
      const after = decodeCursor(query.cursor);
      items = items.filter(
        (t) =>
          compareStamped({ time: t.createdAt, id: t.id }, { time: after.stamp, id: after.id }) < 0,
      );
    }
    const page = items.slice(0, limit);
    const last = page[page.length - 1];
    const nextCursor = items.length > limit && last ? encodeCursor(last.createdAt, last.id) : null;
    return { items: page, nextCursor };
  });

  r.auth('wallet.transaction', ({ db, userId, params }) => ({
    txn: ownTxn(db, userId, params.id),
  }));
}
