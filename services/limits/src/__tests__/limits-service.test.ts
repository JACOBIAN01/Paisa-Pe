import type { Paise } from '@pp/contracts-domain';
import { createLimitsRig } from './helpers';

const p = (n: number): Paise => n as Paise;

describe('refresh and cache', () => {
  it('requires an active session', async () => {
    const rig = createLimitsRig();
    await expect(rig.service.refresh()).rejects.toMatchObject({ code: 'unauthorized' });
    expect(await rig.service.getSnapshot()).toBeNull();
  });

  it('fetches limits and persists them under the user scope', async () => {
    const rig = createLimitsRig();
    rig.signInAs('usr_001');
    const limits = await rig.service.refresh();
    expect(limits.tier).toBe('basic');
    expect(await rig.service.getSnapshot()).toEqual(limits);
    expect(await rig.storage.keys()).toEqual(['u:usr_001:limits.snapshot']);
  });

  it('restores the snapshot from storage after a restart', async () => {
    const rig = createLimitsRig();
    rig.signInAs('usr_001');
    const limits = await rig.service.refresh();
    const restarted = rig.restart();
    expect(await restarted.getSnapshot()).toEqual(limits);
    expect(restarted.checkAmount(p(1))).toEqual({ ok: true });
  });

  it('does not let a slow, older response overwrite a newer one', async () => {
    const rig = createLimitsRig();
    rig.signInAs('usr_001');
    rig.server.chaos.setLatency({ downlinkMs: 50 });
    const older = rig.service.refresh();
    await new Promise((resolve) => setTimeout(resolve, 5));
    rig.server.chaos.setLatency({ downlinkMs: 0 });
    rig.clock.advance(10_000);
    const newer = await rig.service.refresh();
    await older;
    const snapshot = await rig.service.getSnapshot();
    expect(snapshot?.asOf).toBe(newer.asOf);
    expect(newer.asOf).toBeGreaterThan(1_800_000_000_000);
  });
});

describe('account switching', () => {
  it('never shows the previous user limits to the next user', async () => {
    const rig = createLimitsRig();
    rig.signInAs('usr_002');
    const rich = await rig.service.refresh();
    expect(rich.tier).toBe('full');
    rig.signInAs('usr_004');
    expect(await rig.service.getSnapshot()).toBeNull();
    expect(rig.service.checkAmount(p(rich.perTxn))).toEqual({ ok: true });
    const poor = await rig.service.refresh();
    expect(poor.tier).toBe('min');
    expect(rig.service.checkAmount(p(poor.perTxn + 1))).toEqual({
      ok: false,
      reason: 'kyc_required',
    });
  });

  it('drops other users from memory when a session starts', async () => {
    const rig = createLimitsRig();
    rig.signInAs('usr_002');
    await rig.service.refresh();
    rig.signInAs('usr_004');
    rig.bus.emit('auth.sessionStarted', { userId: 'usr_004' as never, sessionId: 's' as never });
    rig.signInAs('usr_002');
    // Loaded again from storage, not from stale memory.
    expect((await rig.service.getSnapshot())?.tier).toBe('full');
  });

  it('removes a user cache when their session ends', async () => {
    const rig = createLimitsRig();
    rig.signInAs('usr_001');
    await rig.service.refresh();
    rig.bus.emit('auth.sessionEnded', { userId: 'usr_001' as never, reason: 'logout' });
    await new Promise((resolve) => setImmediate(resolve));
    expect(await rig.storage.keys()).toEqual([]);
    expect(await rig.service.getSnapshot()).toBeNull();
  });

  it('clears one user explicitly', async () => {
    const rig = createLimitsRig();
    rig.signInAs('usr_001');
    await rig.service.refresh();
    await rig.service.clearUser('usr_001');
    expect(await rig.service.getSnapshot()).toBeNull();
  });
});

describe('checkAmount and noteSpent', () => {
  it('allows everything until a snapshot exists', () => {
    const rig = createLimitsRig();
    rig.signInAs('usr_001');
    expect(rig.service.checkAmount(p(999_999_999))).toEqual({ ok: true });
  });

  it('accepts a bare amount or a full input', async () => {
    const rig = createLimitsRig();
    rig.signInAs('usr_001');
    const limits = await rig.service.refresh();
    expect(rig.service.checkAmount(p(limits.perTxn + 1)).ok).toBe(false);
    expect(
      rig.service.checkAmount({ amount: p(100), kind: 'add_money', balance: p(limits.walletCap) }),
    ).toEqual({ ok: false, reason: 'wallet_cap' });
  });

  it('counts completed spends toward the daily limit', async () => {
    const rig = createLimitsRig();
    rig.signInAs('usr_001');
    const limits = await rig.service.refresh();
    const room = limits.daily.limit - limits.daily.used;
    expect(rig.service.checkAmount(p(11)).ok).toBe(true);
    await rig.service.noteSpent(p(room - 10));
    expect(rig.service.checkAmount(p(11))).toEqual({ ok: false, reason: 'daily' });
    expect(rig.service.checkAmount(p(10))).toEqual({ ok: true });
    expect((await rig.service.getSnapshot())?.daily.used).toBe(limits.daily.limit - 10);
  });

  it('stops reacting to events after dispose', async () => {
    const rig = createLimitsRig();
    rig.signInAs('usr_001');
    await rig.service.refresh();
    rig.service.dispose();
    expect(rig.bus.listenerCount('auth.sessionStarted')).toBe(0);
    expect(rig.bus.listenerCount('auth.sessionEnded')).toBe(0);
  });
});
