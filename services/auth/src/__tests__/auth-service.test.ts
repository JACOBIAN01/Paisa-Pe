import { scopedSecureKey } from '@pp/core-storage';
import { EXPIRY_SKEW_MS } from '../auth-service';
import { createAuthRig, OTHER_PHONE, PHONE, signIn } from './helpers';

const ACCESS_TTL_MS = 15 * 60_000;

describe('sign in', () => {
  it('requests and verifies an OTP, then reports the active account', async () => {
    const rig = createAuthRig();
    expect(rig.auth.getState()).toMatchObject({ ready: false, activeUserId: null });
    const userId = await signIn(rig);
    const state = rig.auth.getState();
    expect(state.activeUserId).toBe(userId);
    expect(state.accounts).toHaveLength(1);
    expect(state.accounts[0]).toMatchObject({ phone: PHONE });
    expect(rig.events.map((e) => e.name)).toEqual(['auth.sessionStarted']);
  });

  it('rejects a wrong code without creating a session', async () => {
    const rig = createAuthRig();
    const challenge = await rig.auth.requestOtp(PHONE);
    await expect(rig.auth.verifyOtp(challenge.otpId, '000000')).rejects.toMatchObject({
      code: 'otp_invalid',
    });
    expect(rig.auth.getState().accounts).toEqual([]);
  });

  it('keeps the refresh token in secure storage only', async () => {
    const rig = createAuthRig();
    const userId = await signIn(rig);
    const refresh = rig.secureDump()[scopedSecureKey(userId, 'refresh')];
    expect(refresh).toMatch(/^rt_/);
    const stored = JSON.stringify(
      await Promise.all((await rig.storage.keys()).map((k) => rig.storage.getItem(k))),
    );
    expect(stored).not.toContain(refresh as string);
    expect(stored).not.toContain('accessToken');
  });

  it('notifies subscribers and stops after unsubscribe', async () => {
    const rig = createAuthRig();
    const states: number[] = [];
    const off = rig.auth.subscribe((s) => states.push(s.accounts.length));
    await signIn(rig);
    off();
    await signIn(rig, OTHER_PHONE);
    expect(states).toEqual([1]);
  });
});

describe('restore', () => {
  it('brings accounts back after a restart but needs a refresh for the access token', async () => {
    const rig = createAuthRig();
    const userId = await signIn(rig);
    const restarted = rig.restart();
    const state = await restarted.restore();
    expect(state).toMatchObject({ ready: true, activeUserId: userId });
    expect(state.accounts).toHaveLength(1);
    expect(await restarted.getAccessToken()).not.toBeNull();
    expect(rig.events.filter((e) => e.name === 'auth.tokenRefreshed')).toHaveLength(1);
  });

  it('ignores a corrupt account list', async () => {
    const rig = createAuthRig();
    await rig.storage.setItem('auth.accounts', '{not json');
    const state = await rig.auth.restore();
    expect(state).toMatchObject({ ready: true, activeUserId: null, accounts: [] });
  });
});

describe('token refresh', () => {
  it('shares one refresh between parallel calls when the token is about to expire', async () => {
    const rig = createAuthRig();
    await signIn(rig);
    rig.clock.advance(ACCESS_TTL_MS - EXPIRY_SKEW_MS + 1);
    const results = await Promise.all(
      Array.from({ length: 6 }, () => rig.http.call('wallet.balance')),
    );
    expect(results).toHaveLength(6);
    expect(rig.events.filter((e) => e.name === 'auth.tokenRefreshed')).toHaveLength(1);
  });

  it('shares one refresh between parallel 401s', async () => {
    const rig = createAuthRig();
    await signIn(rig);
    rig.server.admin.setClockSkew(ACCESS_TTL_MS + 60_000);
    const results = await Promise.all(
      Array.from({ length: 5 }, () =>
        rig.http.call('wallet.transactions', { query: { limit: 5 } }),
      ),
    );
    expect(results.every((page) => page.items.length > 0)).toBe(true);
    expect(rig.events.filter((e) => e.name === 'auth.tokenRefreshed')).toHaveLength(1);
    // The rotated refresh token still works.
    rig.server.admin.setClockSkew(2 * (ACCESS_TTL_MS + 60_000));
    await expect(rig.http.call('wallet.balance')).resolves.toBeDefined();
  });

  it('rotates the stored refresh token', async () => {
    const rig = createAuthRig();
    const userId = await signIn(rig);
    const key = scopedSecureKey(userId, 'refresh');
    const before = rig.secureDump()[key];
    rig.clock.advance(ACCESS_TTL_MS);
    await rig.http.call('wallet.balance');
    expect(rig.secureDump()[key]).not.toBe(before);
  });

  it('ends the session when the server rejects the refresh token', async () => {
    const rig = createAuthRig();
    const userId = await signIn(rig);
    rig.clock.advance(31 * 86_400_000);
    await expect(rig.http.call('wallet.balance')).rejects.toBeDefined();
    expect(rig.auth.getState()).toMatchObject({ activeUserId: null, accounts: [] });
    expect(rig.secureDump()[scopedSecureKey(userId, 'refresh')]).toBeUndefined();
    expect(rig.events.at(-1)).toMatchObject({
      name: 'auth.sessionEnded',
      payload: { reason: 'refresh_failed' },
    });
  });

  it('keeps the session when the refresh fails because of the network', async () => {
    const rig = createAuthRig();
    await signIn(rig);
    rig.clock.advance(ACCESS_TTL_MS);
    rig.server.chaos.failNext({ endpoint: 'auth.refresh' }, 2);
    await expect(rig.http.call('wallet.balance')).rejects.toBeDefined();
    expect(rig.auth.getState().accounts).toHaveLength(1);
    await expect(rig.http.call('wallet.balance')).resolves.toBeDefined();
  });

  it('returns no token when nobody is signed in', async () => {
    const rig = createAuthRig();
    expect(await rig.auth.getAccessToken()).toBeNull();
    expect(await rig.auth.onUnauthorized()).toBe(false);
  });
});

describe('multiple accounts', () => {
  it('switches the active account and announces it', async () => {
    const rig = createAuthRig();
    const first = await signIn(rig);
    const second = await signIn(rig, OTHER_PHONE);
    expect(rig.auth.getState().activeUserId).toBe(second);
    await rig.auth.switchAccount(first);
    expect(rig.auth.getState().activeUserId).toBe(first);
    const profile = await rig.http.call('profile.get');
    expect(profile.user.id).toBe(first);
    expect(
      rig.events.filter((e) => e.name === 'auth.sessionStarted').at(-1)?.payload,
    ).toMatchObject({
      userId: first,
    });
    await expect(rig.auth.switchAccount('usr_999')).rejects.toThrow('unknown account');
  });

  it('persists the active account across restarts', async () => {
    const rig = createAuthRig();
    const first = await signIn(rig);
    await signIn(rig, OTHER_PHONE);
    await rig.auth.switchAccount(first);
    const state = await rig.restart().restore();
    expect(state.activeUserId).toBe(first);
    expect(state.accounts).toHaveLength(2);
  });

  it('falls back to the remaining account on logout', async () => {
    const rig = createAuthRig();
    const first = await signIn(rig);
    const second = await signIn(rig, OTHER_PHONE);
    await rig.auth.logout(second);
    expect(rig.auth.getState()).toMatchObject({ activeUserId: first });
    expect(rig.secureDump()[scopedSecureKey(second, 'refresh')]).toBeUndefined();
    expect(rig.events.map((e) => e.name).slice(-2)).toEqual([
      'auth.sessionEnded',
      'auth.sessionStarted',
    ]);
    await rig.auth.logout();
    expect(rig.auth.getState()).toMatchObject({ activeUserId: null, accounts: [] });
  });

  it('logout of the active account invalidates its session on the server', async () => {
    const rig = createAuthRig();
    const userId = await signIn(rig);
    const token = rig.secureDump()[scopedSecureKey(userId, 'refresh')] as string;
    await rig.auth.logout();
    const result = await rig.http.callResult('auth.refresh', { body: { refreshToken: token } });
    expect(result.ok).toBe(false);
  });
});

describe('devices', () => {
  it('lists devices and revokes one', async () => {
    const rig = createAuthRig();
    await signIn(rig);
    rig.server.admin.loginAs('usr_001', { name: 'Old phone', platform: 'android' });
    const before = await rig.auth.listDevices();
    expect(before.length).toBeGreaterThanOrEqual(2);
    const other = before.find((d) => !d.current);
    await rig.auth.revokeDevice(other?.id as string);
    const after = await rig.auth.listDevices();
    expect(after.some((d) => d.id === other?.id)).toBe(false);
  });
});
