import type { SessionId, UserId } from '@pp/contracts-domain';
import type { Database } from '@pp/mock-db';
import { fail } from './errors';

export interface Authenticated {
  userId: UserId;
  sessionId: SessionId;
}

export function authenticate(
  db: Database,
  now: number,
  headers: Record<string, string>,
): Authenticated {
  const header = headers['authorization'] ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (token === '') throw fail('unauthorized', 'Missing access token');
  const sid = db.t.accessIndex.get(token);
  const record = sid ? db.t.sessions.get(sid) : undefined;
  if (!record || record.revoked) throw fail('unauthorized', 'Invalid access token');
  if (now > record.session.accessExpiresAt) throw fail('token_expired', 'Access token expired');
  const device = db.t.devices.get(record.session.deviceId);
  if (device) device.device.lastActiveAt = now;
  return { userId: record.session.userId, sessionId: record.session.sessionId };
}
