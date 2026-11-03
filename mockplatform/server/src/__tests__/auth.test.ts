import { DEMO_OTP } from '@pp/mock-db';
import { client, login, PRIMARY, PRIMARY_PHONE, setup } from './helpers';

const requestOtp = (api: ReturnType<typeof client>, phone = PRIMARY_PHONE) =>
  api.post('/auth/otp/request', { phone });

describe('otp login', () => {
  it('issues a session for an existing user', () => {
    const { server } = setup();
    const api = client(server);
    const otp = requestOtp(api);
    expect(otp.status).toBe(200);
    expect(otp.body).toMatchObject({ expiresInSec: 300, resendAfterSec: 30 });
    const verify = api.post('/auth/otp/verify', { otpId: otp.body.otpId, code: DEMO_OTP });
    expect(verify.status).toBe(200);
    expect(verify.body.isNewUser).toBe(false);
    expect(verify.body.user.id).toBe(PRIMARY);
    expect(verify.body.session.accessToken).toMatch(/^at_/);
  });

  it('creates a new user for an unknown phone', () => {
    const { server } = setup();
    const api = client(server);
    const phone = '+919711112222';
    const otp = requestOtp(api, phone);
    const verify = api.post('/auth/otp/verify', { otpId: otp.body.otpId, code: DEMO_OTP });
    expect(verify.body.isNewUser).toBe(true);
    const authed = client(server, verify.body.session.accessToken);
    expect(authed.get('/wallet/balance').body.balance).toBe(0);
    expect(authed.get('/limits').body.limits.tier).toBe('min');
  });

  it('rejects malformed phones and codes', () => {
    const { server } = setup();
    const api = client(server);
    expect(api.post('/auth/otp/request', { phone: '12345' }).status).toBe(400);
    const otp = requestOtp(api);
    expect(
      api.post('/auth/otp/verify', { otpId: otp.body.otpId, code: '12' }).body.error.code,
    ).toBe('invalid_request');
  });

  it('throttles repeat requests until the resend window passes', () => {
    const { server, clock } = setup();
    const api = client(server);
    requestOtp(api);
    const again = requestOtp(api);
    expect(again.status).toBe(429);
    expect(again.body.error).toMatchObject({ code: 'rate_limited', retryable: true });
    clock.advance(31_000);
    expect(requestOtp(api).status).toBe(200);
  });

  it('counts wrong codes and locks after five attempts', () => {
    const { server } = setup();
    const api = client(server);
    const { otpId } = requestOtp(api).body;
    for (let i = 1; i <= 5; i += 1) {
      const wrong = api.post('/auth/otp/verify', { otpId, code: '000000' });
      expect(wrong.body.error.code).toBe('otp_invalid');
      expect(wrong.body.error.details.attemptsLeft).toBe(5 - i);
    }
    const locked = api.post('/auth/otp/verify', { otpId, code: DEMO_OTP });
    expect(locked.body.error.code).toBe('rate_limited');
  });

  it('expires codes and rejects reuse', () => {
    const { server, clock } = setup();
    const api = client(server);
    const { otpId } = requestOtp(api).body;
    clock.advance(301_000);
    expect(api.post('/auth/otp/verify', { otpId, code: DEMO_OTP }).body.error.code).toBe(
      'otp_expired',
    );
    const fresh = requestOtp(api).body.otpId;
    expect(api.post('/auth/otp/verify', { otpId: fresh, code: DEMO_OTP }).status).toBe(200);
    expect(api.post('/auth/otp/verify', { otpId: fresh, code: DEMO_OTP }).body.error.code).toBe(
      'otp_invalid',
    );
  });
});

describe('tokens', () => {
  it('requires a bearer token and rejects bad ones', () => {
    const { server } = setup();
    expect(client(server).get('/wallet/balance').body.error.code).toBe('unauthorized');
    expect(client(server, 'at_nope').get('/wallet/balance').status).toBe(401);
  });

  it('reports token_expired after the access TTL', () => {
    const { server, clock } = setup();
    const { api } = login(server);
    expect(api.get('/wallet/balance').status).toBe(200);
    clock.advance(15 * 60_000 + 1);
    const res = api.get('/wallet/balance');
    expect(res.status).toBe(401);
    expect(res.body.error).toMatchObject({ code: 'token_expired', retryable: false });
  });

  it('rotates refresh tokens and keeps the session id', () => {
    const { server, clock } = setup();
    const { session, api } = login(server);
    clock.advance(16 * 60_000);
    const refreshed = client(server).post('/auth/refresh', { refreshToken: session.refreshToken });
    expect(refreshed.status).toBe(200);
    const next = refreshed.body.session;
    expect(next.sessionId).toBe(session.sessionId);
    expect(next.refreshToken).not.toBe(session.refreshToken);
    expect(api.get('/wallet/balance').status).toBe(401);
    expect(client(server, next.accessToken).get('/wallet/balance').status).toBe(200);
  });

  it('treats refresh token reuse as theft and revokes the session', () => {
    const { server } = setup();
    const { session } = login(server);
    const open = client(server);
    const first = open.post('/auth/refresh', { refreshToken: session.refreshToken });
    const second = open.post('/auth/refresh', { refreshToken: session.refreshToken });
    expect(second.status).toBe(401);
    expect(second.body.error.message).toMatch(/reuse/);
    expect(client(server, first.body.session.accessToken).get('/wallet/balance').status).toBe(401);
    expect(
      open.post('/auth/refresh', { refreshToken: first.body.session.refreshToken }).status,
    ).toBe(401);
  });

  it('rejects unknown and expired refresh tokens', () => {
    const { server, clock } = setup();
    const { session } = login(server);
    expect(client(server).post('/auth/refresh', { refreshToken: 'rt_x' }).status).toBe(401);
    clock.advance(31 * 86_400_000);
    expect(
      client(server).post('/auth/refresh', { refreshToken: session.refreshToken }).body.error
        .message,
    ).toMatch(/expired/);
  });

  it('logs out and revokes other devices', () => {
    const { server } = setup();
    const a = login(server);
    const b = server.admin.loginAs(PRIMARY, {
      id: 'dev_tablet',
      name: 'Tablet',
      platform: 'android',
    });
    const list = a.api.get('/auth/sessions');
    expect(list.body.devices).toHaveLength(2);
    expect(list.body.devices.filter((d: { current: boolean }) => d.current)).toHaveLength(1);
    expect(a.api.del(`/auth/sessions/${a.session.deviceId}`).body.error.code).toBe('forbidden');
    expect(a.api.del('/auth/sessions/dev_missing').status).toBe(404);
    expect(a.api.del('/auth/sessions/dev_tablet').status).toBe(200);
    expect(client(server, b.accessToken).get('/wallet/balance').status).toBe(401);
    expect(a.api.post('/auth/logout', {}).status).toBe(200);
    expect(a.api.get('/wallet/balance').status).toBe(401);
  });
});
