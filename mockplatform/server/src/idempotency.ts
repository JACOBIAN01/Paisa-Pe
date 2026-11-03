import { IDEMPOTENCY_HEADER, IDEMPOTENCY_TTL_MS } from '@pp/contracts-api';
import type { IdempotencyKey, UserId } from '@pp/contracts-domain';
import { idempotencyKey as brandKey, type Database } from '@pp/mock-db';
import { fail } from './errors';
import { stableStringify } from './util';

export interface IdempotentOutcome {
  body: unknown;
  replayed: boolean;
}

export function readKey(headers: Record<string, string>): IdempotencyKey {
  const key = headers[IDEMPOTENCY_HEADER.toLowerCase()]?.trim();
  if (!key) throw fail('invalid_request', `${IDEMPOTENCY_HEADER} header is required`);
  return brandKey(key);
}

/**
 * A key replays the stored response while it is younger than the TTL. The same key with
 * different content inside that window is a conflict. Failed calls are never stored.
 */
export function runIdempotent(
  db: Database,
  now: number,
  scope: { userId: UserId; endpoint: string; key: IdempotencyKey; fingerprint: unknown },
  run: () => unknown,
): IdempotentOutcome {
  for (const [id, record] of db.t.idempotency) {
    if (record.expiresAt <= now) db.t.idempotency.delete(id);
  }
  const id = `${scope.userId}|${scope.endpoint}|${scope.key}`;
  const fingerprint = stableStringify(scope.fingerprint);
  const existing = db.t.idempotency.get(id);
  if (existing) {
    if (existing.bodyHash !== fingerprint) {
      throw fail('conflict', 'Idempotency key was already used with a different request');
    }
    return { body: existing.body, replayed: true };
  }
  const body = run();
  db.t.idempotency.set(id, {
    bodyHash: fingerprint,
    status: 200,
    body,
    expiresAt: now + IDEMPOTENCY_TTL_MS,
  });
  return { body, replayed: false };
}
