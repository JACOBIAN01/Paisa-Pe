import type { Registry } from '../context';
import { resolveRecipient, transferFunds } from '../transfer-core';
import { balanceView } from './shared';

export function registerTransfers(r: Registry): void {
  r.auth('transfers.send', ({ db, now, userId, body, idempotencyKey }) => {
    const to = resolveRecipient(db, userId, body.to);
    const txn = transferFunds(db, now, {
      from: userId,
      to,
      amount: body.amount,
      note: body.note,
      idempotencyKey,
    });
    return { txn, balance: balanceView(db, userId, now) };
  });
}
