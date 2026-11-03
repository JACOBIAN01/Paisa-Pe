import { scopedSecureKey } from '@pp/core-storage';
import { ATTEMPTS_PER_LOCK, BASE_LOCK_MS, lockDurationFor } from '../lockout';
import { validatePinFormat } from '../pin-service';
import { createPinRig, nodeHasher } from './helpers';

const USER = 'usr_001';
const PIN = '2580';
const WRONG = '1357';

async function failTimes(pins: ReturnType<typeof createPinRig>['pins'], count: number) {
  for (let i = 0; i < count; i += 1) await pins.verifyPin(USER, WRONG);
}

describe('pin format', () => {
  it.each(['123', '12345', 'abcd', ''])('rejects %p', (pin) => {
    expect(() => validatePinFormat(pin)).toThrow();
  });
  it.each(['0000', '7777', '1234', '4321', '5678'])('rejects easy pin %s', (pin) => {
    expect(() => validatePinFormat(pin)).toThrow('too easy');
  });
  it('accepts a reasonable pin', () => {
    expect(() => validatePinFormat(PIN)).not.toThrow();
  });
});

describe('pin storage', () => {
  it('never stores the pin and uses a per-user random salt', async () => {
    const rig = createPinRig();
    await rig.pins.setPin(USER, PIN);
    await rig.pins.setPin('usr_002', PIN);
    const dump = rig.secureDump();
    const serialized = JSON.stringify(dump);
    expect(serialized).not.toContain(PIN);
    const a = JSON.parse(dump[scopedSecureKey(USER, 'pin')] as string);
    const b = JSON.parse(dump[scopedSecureKey('usr_002', 'pin')] as string);
    expect(a.salt).not.toBe(b.salt);
    expect(a.hash).not.toBe(b.hash);
    expect(a.rounds).toBe(4);
    expect(await rig.storage.keys()).toEqual([]);
  });

  it('reports pinSet and notifies subscribers', async () => {
    const rig = createPinRig();
    const seen: string[] = [];
    const off = rig.pins.subscribe((id) => seen.push(id));
    expect(await rig.pins.isPinSet(USER)).toBe(false);
    await rig.pins.setPin(USER, PIN);
    expect(await rig.pins.isPinSet(USER)).toBe(true);
    await rig.pins.clearPin(USER);
    expect(await rig.pins.isPinSet(USER)).toBe(false);
    off();
    await rig.pins.setPin(USER, PIN);
    expect(seen).toEqual([USER, USER]);
  });

  it('verifies the right pin and rejects a wrong one', async () => {
    const { pins } = createPinRig();
    await pins.setPin(USER, PIN);
    expect(await pins.verifyPin(USER, PIN)).toEqual({ ok: true });
    expect(await pins.verifyPin(USER, WRONG)).toEqual({
      ok: false,
      reason: 'wrong',
      attemptsLeft: 4,
    });
  });

  it('refuses to verify when no pin exists', async () => {
    const { pins } = createPinRig();
    await expect(pins.verifyPin(USER, PIN)).rejects.toThrow('No PIN set');
  });

  it('changes the pin only after verifying the current one', async () => {
    const { pins } = createPinRig();
    await pins.setPin(USER, PIN);
    expect((await pins.changePin(USER, WRONG, '8642')).ok).toBe(false);
    expect((await pins.changePin(USER, PIN, '8642')).ok).toBe(true);
    expect((await pins.verifyPin(USER, '8642')).ok).toBe(true);
    expect((await pins.verifyPin(USER, PIN)).ok).toBe(false);
  });
});

describe('lockout', () => {
  it('locks after five wrong attempts, even for the right pin', async () => {
    const { pins } = createPinRig();
    await pins.setPin(USER, PIN);
    await failTimes(pins, ATTEMPTS_PER_LOCK - 1);
    const fifth = await pins.verifyPin(USER, WRONG);
    expect(fifth).toEqual({ ok: false, reason: 'locked', remainingMs: BASE_LOCK_MS });
    expect(await pins.verifyPin(USER, PIN)).toMatchObject({ ok: false, reason: 'locked' });
    expect(await pins.getStatus(USER)).toMatchObject({ locked: true, attemptsLeft: 0 });
  });

  it('unlocks after the duration using the monotonic clock', async () => {
    const rig = createPinRig();
    await rig.pins.setPin(USER, PIN);
    await failTimes(rig.pins, 5);
    rig.clock.advance(BASE_LOCK_MS - 1);
    expect((await rig.pins.verifyPin(USER, PIN)).ok).toBe(false);
    rig.clock.advance(1);
    expect(await rig.pins.verifyPin(USER, PIN)).toEqual({ ok: true });
  });

  it('is not shortened by moving the wall clock forward in the same process', async () => {
    const rig = createPinRig();
    await rig.pins.setPin(USER, PIN);
    await failTimes(rig.pins, 5);
    rig.clock.setWall(rig.clock.now() + 24 * 3_600_000);
    expect(await rig.pins.verifyPin(USER, PIN)).toMatchObject({ ok: false, reason: 'locked' });
  });

  it('is not extended or shortened by moving the wall clock back in the same process', async () => {
    const rig = createPinRig();
    await rig.pins.setPin(USER, PIN);
    await failTimes(rig.pins, 5);
    rig.clock.setWall(rig.clock.now() - 3_600_000);
    rig.clock.advance(BASE_LOCK_MS);
    expect((await rig.pins.verifyPin(USER, PIN)).ok).toBe(true);
  });

  it('survives a restart and falls back to wall time', async () => {
    const rig = createPinRig();
    await rig.pins.setPin(USER, PIN);
    await failTimes(rig.pins, 5);
    rig.clock.advance(10_000);
    const restarted = rig.restart();
    expect(await restarted.getStatus(USER)).toMatchObject({ locked: true, remainingMs: 20_000 });
    rig.clock.advance(20_000);
    expect((await restarted.verifyPin(USER, PIN)).ok).toBe(true);
  });

  it('keeps the full lock after a restart when the wall clock went backwards', async () => {
    const rig = createPinRig();
    await rig.pins.setPin(USER, PIN);
    await failTimes(rig.pins, 5);
    rig.clock.setWall(rig.clock.now() - 3_600_000);
    const restarted = rig.restart();
    expect(await restarted.getStatus(USER)).toMatchObject({
      locked: true,
      remainingMs: BASE_LOCK_MS,
    });
  });

  it('escalates the lock duration and resets on success', async () => {
    expect([5, 10, 15, 20, 100].map(lockDurationFor)).toEqual([
      30_000, 60_000, 120_000, 240_000, 3_600_000,
    ]);
    const rig = createPinRig();
    await rig.pins.setPin(USER, PIN);
    await failTimes(rig.pins, 5);
    rig.clock.advance(BASE_LOCK_MS);
    await failTimes(rig.pins, 4);
    const tenth = await rig.pins.verifyPin(USER, WRONG);
    expect(tenth).toEqual({ ok: false, reason: 'locked', remainingMs: 60_000 });
    rig.clock.advance(60_000);
    expect(await rig.pins.verifyPin(USER, PIN)).toEqual({ ok: true });
    expect(await rig.pins.getStatus(USER)).toMatchObject({ locked: false, attemptsLeft: 5 });
  });

  it('counts an attempt even if the process dies during the compare', async () => {
    const rig = createPinRig();
    await rig.pins.setPin(USER, PIN);
    let calls = 0;
    const dying = rig.restart('boot-dead', {
      randomHex: nodeHasher.randomHex,
      digest: async () => {
        calls += 1;
        throw new Error('process killed');
      },
    });
    await expect(dying.verifyPin(USER, PIN)).rejects.toThrow('process killed');
    expect(calls).toBe(1);
    const afterRestart = rig.restart('boot-3');
    expect(await afterRestart.getStatus(USER)).toMatchObject({ attemptsLeft: 4 });
  });

  it('does not let parallel guesses beat the counter', async () => {
    const { pins } = createPinRig();
    await pins.setPin(USER, PIN);
    const results = await Promise.all(Array.from({ length: 8 }, () => pins.verifyPin(USER, WRONG)));
    expect(results.filter((r) => !r.ok && r.reason === 'wrong')).toHaveLength(4);
    expect(results.filter((r) => !r.ok && r.reason === 'locked')).toHaveLength(4);
  });

  it('keeps counters per user', async () => {
    const { pins } = createPinRig();
    await pins.setPin(USER, PIN);
    await pins.setPin('usr_002', PIN);
    await failTimes(pins, 5);
    expect(await pins.verifyPin('usr_002', PIN)).toEqual({ ok: true });
  });
});
