import {
  DEMO_OTP,
  defaultPreferences,
  issueSession,
  rotateSession,
  revokeSession,
  paise,
  userId,
  phone,
} from '@pp/mock-db';
import type { DeviceInfo } from '@pp/mock-db';
import { fail } from '../errors';
import type { Registry } from '../context';

const OTP_TTL_SEC = 300;
const OTP_RESEND_SEC = 30;
const OTP_MAX_ATTEMPTS = 5;

function deviceInfo(headers: Record<string, string>): DeviceInfo {
  const platform = headers['x-device-platform'];
  return {
    id: headers['x-device-id'],
    name: headers['x-device-name'],
    platform: platform === 'ios' || platform === 'android' ? platform : undefined,
  };
}

export function registerAuth(r: Registry): void {
  r.open('auth.requestOtp', ({ db, now, body }) => {
    const recent = [...db.t.otps.values()].find(
      (o) => o.phone === body.phone && !o.consumed && now - o.createdAt < OTP_RESEND_SEC * 1000,
    );
    if (recent) {
      const retryAfterSec = Math.ceil((recent.createdAt + OTP_RESEND_SEC * 1000 - now) / 1000);
      throw fail('rate_limited', 'Please wait before requesting another code', { retryAfterSec });
    }
    const otpId = db.nextId('otp');
    db.t.otps.set(otpId, {
      otpId,
      phone: body.phone,
      code: DEMO_OTP,
      createdAt: now,
      expiresAt: now + OTP_TTL_SEC * 1000,
      attempts: 0,
      consumed: false,
    });
    return { otpId, expiresInSec: OTP_TTL_SEC, resendAfterSec: OTP_RESEND_SEC };
  });

  r.open('auth.verifyOtp', ({ db, now, body, req }) => {
    const otp = db.t.otps.get(body.otpId);
    if (!otp || otp.consumed) throw fail('otp_invalid', 'Invalid code');
    if (now > otp.expiresAt) throw fail('otp_expired', 'This code has expired');
    if (otp.attempts >= OTP_MAX_ATTEMPTS)
      throw fail('rate_limited', 'Too many attempts. Request a new code');
    if (otp.code !== body.code) {
      otp.attempts += 1;
      throw fail('otp_invalid', 'Invalid code', { attemptsLeft: OTP_MAX_ATTEMPTS - otp.attempts });
    }
    otp.consumed = true;
    let record = [...db.t.users.values()].find((u) => u.user.phone === otp.phone);
    const isNewUser = !record;
    if (!record) {
      const id = userId(db.nextId('usr'));
      record = {
        user: {
          id,
          phone: phone(otp.phone),
          name: 'New user',
          kycTier: 'min',
          language: 'en',
          createdAt: now,
        },
        referral: { code: `NEW${db.randomHex(5).toUpperCase()}`, invited: 0, earned: paise(0) },
        kycState: 'none',
      };
      db.t.users.set(id, record);
      db.t.wallets.set(id, { balance: paise(0), version: 0 });
      db.t.preferences.set(id, defaultPreferences('en'));
    }
    const session = issueSession(db, now, record.user.id, deviceInfo(req.headers));
    return { session, user: record.user, isNewUser };
  });

  r.open('auth.refresh', ({ db, now, body }) => {
    const sid = db.t.refreshIndex.get(body.refreshToken);
    if (!sid) {
      const reused = db.t.usedRefresh.get(body.refreshToken);
      const stale = reused ? db.t.sessions.get(reused) : undefined;
      if (stale) revokeSession(db, stale);
      throw fail('unauthorized', stale ? 'Refresh token reuse detected' : 'Invalid refresh token');
    }
    const record = db.t.sessions.get(sid);
    if (!record || record.revoked) throw fail('unauthorized', 'Session revoked');
    if (now > record.refreshExpiresAt) throw fail('unauthorized', 'Refresh token expired');
    return { session: rotateSession(db, now, record) };
  });

  r.auth('auth.logout', ({ db, sessionId }) => {
    const record = db.t.sessions.get(sessionId);
    if (record) revokeSession(db, record);
    return { ok: true };
  });

  r.auth('auth.listSessions', ({ db, userId: me, sessionId }) => {
    const current = db.t.sessions.get(sessionId)?.session.deviceId;
    const active = new Set(
      [...db.t.sessions.values()]
        .filter((s) => !s.revoked && s.session.userId === me)
        .map((s) => s.session.deviceId),
    );
    const devices = [...db.t.devices.values()]
      .filter((d) => d.ownerId === me && active.has(d.device.id))
      .map((d) => ({ ...d.device, current: d.device.id === current }))
      .sort((a, b) => b.lastActiveAt - a.lastActiveAt);
    return { devices };
  });

  r.auth('auth.revokeSession', ({ db, userId: me, sessionId, params }) => {
    const current = db.t.sessions.get(sessionId)?.session.deviceId;
    if (params.id === current) throw fail('forbidden', 'Use logout to end the current session');
    const targets = [...db.t.sessions.values()].filter(
      (s) => !s.revoked && s.session.userId === me && s.session.deviceId === params.id,
    );
    if (targets.length === 0) throw fail('not_found', 'Device not found');
    for (const target of targets) revokeSession(db, target);
    return { ok: true };
  });
}
