import type { Device, Session, UserId } from '@pp/contracts-domain';
import type { Database } from '../database';
import { deviceId, sessionId } from '../ids';
import type { SessionRecord } from '../types';

export const ACCESS_TTL_MS = 15 * 60_000;
export const REFRESH_TTL_MS = 30 * 86_400_000;

export interface DeviceInfo {
  id?: string;
  name?: string;
  platform?: Device['platform'];
}

function mint(
  db: Database,
  now: number,
  base: Omit<Session, 'accessToken' | 'refreshToken' | 'accessExpiresAt'>,
) {
  const session: Session = {
    ...base,
    accessToken: `at_${db.randomHex(24)}`,
    refreshToken: `rt_${db.randomHex(32)}`,
    accessExpiresAt: now + ACCESS_TTL_MS,
  };
  return session;
}

function index(db: Database, record: SessionRecord): void {
  db.t.accessIndex.set(record.session.accessToken, record.session.sessionId);
  db.t.refreshIndex.set(record.session.refreshToken, record.session.sessionId);
}

export function issueSession(
  db: Database,
  now: number,
  userId: UserId,
  info: DeviceInfo = {},
): Session {
  const id = deviceId(info.id ?? db.nextId('dev'));
  const known = db.t.devices.get(id);
  db.t.devices.set(id, {
    ownerId: userId,
    device: {
      id,
      name: info.name ?? known?.device.name ?? 'Unknown device',
      platform: info.platform ?? known?.device.platform ?? 'android',
      lastActiveAt: now,
    },
  });
  const session = mint(db, now, {
    sessionId: sessionId(db.nextId('ses')),
    userId,
    deviceId: id,
  });
  const record: SessionRecord = { session, revoked: false, refreshExpiresAt: now + REFRESH_TTL_MS };
  db.t.sessions.set(session.sessionId, record);
  index(db, record);
  return session;
}

/** Replaces both tokens. The previous refresh token is remembered so reuse can be detected. */
export function rotateSession(db: Database, now: number, record: SessionRecord): Session {
  const previous = record.session;
  db.t.accessIndex.delete(previous.accessToken);
  db.t.refreshIndex.delete(previous.refreshToken);
  db.t.usedRefresh.set(previous.refreshToken, previous.sessionId);
  record.session = mint(db, now, {
    sessionId: previous.sessionId,
    userId: previous.userId,
    deviceId: previous.deviceId,
  });
  record.refreshExpiresAt = now + REFRESH_TTL_MS;
  index(db, record);
  return record.session;
}

export function revokeSession(db: Database, record: SessionRecord): void {
  record.revoked = true;
  db.t.accessIndex.delete(record.session.accessToken);
  db.t.refreshIndex.delete(record.session.refreshToken);
}
