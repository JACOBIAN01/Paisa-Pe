import type { UserId } from '@pp/contracts-domain';
import type { CardRecord, Database } from '@pp/mock-db';
import { fail } from '../errors';
import type { Registry } from '../context';

const REVEAL_TTL_SEC = 30;

function findCard(db: Database, userId: UserId, id: string): CardRecord {
  const record = db.t.cards.find((c) => c.ownerId === userId && c.card.id === id);
  if (!record) throw fail('not_found', 'Card not found');
  return record;
}

export function registerCards(r: Registry): void {
  r.auth('cards.list', ({ db, userId }) => ({
    items: db.t.cards.filter((c) => c.ownerId === userId).map((c) => c.card),
  }));

  r.auth('cards.freeze', ({ db, userId, params }) => {
    const record = findCard(db, userId, params.id);
    record.card.status = 'frozen';
    return { card: record.card };
  });

  r.auth('cards.unfreeze', ({ db, userId, params }) => {
    const record = findCard(db, userId, params.id);
    record.card.status = 'active';
    return { card: record.card };
  });

  r.auth('cards.reveal', ({ db, userId, params }) => {
    const record = findCard(db, userId, params.id);
    if (record.card.status === 'frozen')
      throw fail('card_frozen', 'Unfreeze the card to view its details');
    return { reveal: { pan: record.pan, cvv: record.cvv, expiresInSec: REVEAL_TTL_SEC } };
  });
}
