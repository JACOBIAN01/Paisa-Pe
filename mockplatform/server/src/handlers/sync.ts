import { touchTxn, type TxnRecord } from '@pp/mock-db';
import type { Registry } from '../context';
import { compareStamped, decodeCursor, encodeCursor } from '../util';

const DEFAULT_LIMIT = 50;

export function registerSync(r: Registry): void {
  /**
   * Rows are ordered by (updatedAt, id) and the cursor is that pair, so rows that share
   * an updatedAt are never skipped across a page boundary. `nextCursor` is null only when
   * no rows were returned; the client keeps the cursor it already holds.
   */
  r.auth('sync.delta', ({ db, now, userId, query }) => {
    const limit = query.limit ?? DEFAULT_LIMIT;
    const after = query.cursor ? decodeCursor(query.cursor) : undefined;
    const rows = db.t.txns
      .filter((t) => t.ownerId === userId)
      .filter(
        (t) =>
          !after ||
          compareStamped({ time: t.updatedAt, id: t.id }, { time: after.stamp, id: after.id }) > 0,
      )
      .sort((a, b) =>
        compareStamped({ time: a.updatedAt, id: a.id }, { time: b.updatedAt, id: b.id }),
      );
    const items = rows.slice(0, limit);
    const last = items[items.length - 1];
    return {
      items,
      nextCursor: last ? encodeCursor(last.updatedAt, last.id) : null,
      hasMore: rows.length > limit,
      serverTime: now,
    };
  });

  /**
   * Last write wins by server receipt order: edits are applied in the order they arrive
   * (and in array order within a batch). Client timestamps are never used for ordering,
   * so a skewed device clock cannot reorder or drop edits.
   */
  r.auth('sync.push', ({ db, now, userId, body }) => {
    const applied = new Map<string, TxnRecord>();
    const rejected: string[] = [];
    for (const edit of body.edits) {
      const txn = db.t.txns.find((t) => t.id === edit.txnId && t.ownerId === userId);
      if (!txn) {
        rejected.push(edit.txnId);
        continue;
      }
      if (txn.note !== edit.note) {
        txn.note = edit.note;
        touchTxn(db, now, txn);
      }
      applied.set(txn.id, txn);
    }
    return { applied: [...applied.values()], rejected };
  });
}
