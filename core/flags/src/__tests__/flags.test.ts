import { appFlags, FLAG_DEFAULTS, resetFlags } from '../app-flags';
import { createFlags } from '../flags';

describe('flags', () => {
  it('prefers override over remote over default', () => {
    const flags = createFlags<{ a: boolean; b: boolean }>({ a: false, b: true });
    expect(flags.get('a')).toBe(false);
    flags.applyRemote({ a: true });
    expect(flags.get('a')).toBe(true);
    flags.set('a', false);
    expect(flags.get('a')).toBe(false);
    flags.clearOverrides();
    expect(flags.get('a')).toBe(true);
  });

  it('notifies only on effective changes and supports unsubscribe', () => {
    const flags = createFlags<{ a: boolean; b: boolean }>({ a: false, b: true });
    const listener = jest.fn();
    const off = flags.subscribe(listener);
    flags.set('a', false);
    expect(listener).not.toHaveBeenCalled();
    flags.set('a', true);
    expect(listener).toHaveBeenCalledWith(['a']);
    off();
    flags.set('b', false);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('ignores unknown remote keys and returns a snapshot copy', () => {
    const flags = createFlags<{ a: boolean }>({ a: false });
    flags.applyRemote({ zzz: true } as never);
    const snap = flags.snapshot();
    snap.a = true;
    expect(flags.get('a')).toBe(false);
    expect(flags.snapshot()).toEqual({ a: false });
  });
});

describe('appFlags', () => {
  afterEach(resetFlags);

  it('starts from defaults with the debug menu off', () => {
    expect(appFlags.snapshot()).toEqual(FLAG_DEFAULTS);
    expect(appFlags.get('debugMenu')).toBe(false);
  });

  it('resetFlags restores defaults', () => {
    appFlags.set('debugMenu', true);
    appFlags.applyRemote({ newSplitUi: true });
    resetFlags();
    expect(appFlags.snapshot()).toEqual(FLAG_DEFAULTS);
  });
});
