import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  appStorage,
  createMemoryBackend,
  createSecureStorage,
  createStorage,
  createUserStorage,
  resetStorageBackend,
  runMigrations,
  scopedKey,
  scopedSecureKey,
  setStorageBackend,
  SCHEMA_VERSION_KEY,
  type SecureBackend,
} from '../index';

describe('createStorage', () => {
  it('namespaces keys and strips the prefix when listing', async () => {
    const backend = createMemoryBackend();
    const a = createStorage({ namespace: 'a', backend });
    const b = createStorage({ namespace: 'b', backend });
    await a.setItem('k', '1');
    await b.setItem('k', '2');
    expect(await a.getItem('k')).toBe('1');
    expect(await backend.keys()).toEqual(['a:k', 'b:k']);
    expect(await a.keys()).toEqual(['k']);
    await a.clear();
    expect(await a.getItem('k')).toBeNull();
    expect(await b.getItem('k')).toBe('2');
  });

  it('round-trips JSON and tolerates corrupt values', async () => {
    const backend = createMemoryBackend({ 'ns:bad': '{oops' });
    const s = createStorage({ namespace: 'ns', backend });
    await s.setJSON('good', { n: 1 });
    expect(await s.getJSON('good')).toEqual({ n: 1 });
    expect(await s.getJSON('bad')).toBeNull();
    expect(await s.getJSON('missing')).toBeNull();
  });

  it('returns null when a parser rejects the stored shape', async () => {
    const s = createStorage({ namespace: 'ns', backend: createMemoryBackend() });
    await s.setJSON('n', 'not a number');
    const parse = (raw: unknown): number => {
      if (typeof raw !== 'number') throw new Error('bad');
      return raw;
    };
    expect(await s.getJSON('n', parse)).toBeNull();
  });

  it('multiGet returns unprefixed keys', async () => {
    const s = createStorage({ namespace: 'ns', backend: createMemoryBackend() });
    await s.setItem('x', '1');
    expect(await s.multiGet(['x', 'y'])).toEqual([
      ['x', '1'],
      ['y', null],
    ]);
  });

  it('uses AsyncStorage by default', async () => {
    const s = createStorage({ namespace: 'real' });
    await s.setItem('k', 'v');
    expect(await AsyncStorage.getItem('real:k')).toBe('v');
    await s.clear();
    expect(await AsyncStorage.getItem('real:k')).toBeNull();
  });
});

describe('user scoping', () => {
  beforeEach(() => setStorageBackend(createMemoryBackend()));
  afterEach(resetStorageBackend);

  it('isolates users from each other and from app-level keys', async () => {
    const u1 = createUserStorage('u1');
    const u2 = createUserStorage('u2');
    await u1.setItem('limits', '100');
    await u2.setItem('limits', '900');
    await appStorage.setItem('limits', 'device');
    expect(await u1.getItem('limits')).toBe('100');
    expect(await u2.getItem('limits')).toBe('900');
    expect(await appStorage.getItem('limits')).toBe('device');
    await u1.clear();
    expect(await u2.getItem('limits')).toBe('900');
  });

  it('builds scoped keys and rejects bad user ids', () => {
    expect(scopedKey('u1', 'flags')).toBe('u:u1:flags');
    expect(() => createUserStorage('')).toThrow();
    expect(() => createUserStorage('a:b')).toThrow();
  });
});

describe('secure storage', () => {
  const makeBackend = (): SecureBackend => {
    const data = new Map<string, string>();
    return {
      getItemAsync: async (k) => data.get(k) ?? null,
      setItemAsync: async (k, v) => void data.set(k, v),
      deleteItemAsync: async (k) => void data.delete(k),
    };
  };

  it('stores, reads and removes', async () => {
    const s = createSecureStorage(makeBackend());
    await s.set('refresh', 'tok');
    expect(await s.get('refresh')).toBe('tok');
    await s.remove('refresh');
    expect(await s.get('refresh')).toBeNull();
  });

  it('rejects keys the platform store would refuse', async () => {
    const s = createSecureStorage(makeBackend());
    await expect(s.set('bad key!', 'x')).rejects.toThrow();
    expect(scopedSecureKey('user:1', 'pin')).toBe('u.user_1.pin');
  });
});

describe('runMigrations', () => {
  const log: number[] = [];
  const mig = (version: number) => ({
    version,
    up: async () => {
      log.push(version);
    },
  });
  beforeEach(() => {
    log.length = 0;
  });

  it('applies pending migrations once, in order, and persists the version', async () => {
    const s = createStorage({ namespace: 'm', backend: createMemoryBackend() });
    const first = await runMigrations(s, [mig(3), mig(1), mig(2)]);
    expect(first).toEqual({ from: 0, to: 3, applied: [1, 2, 3] });
    expect(await s.getJSON(SCHEMA_VERSION_KEY)).toBe(3);
    const second = await runMigrations(s, [mig(1), mig(2), mig(3), mig(4)]);
    expect(second).toEqual({ from: 3, to: 4, applied: [4] });
    expect(log).toEqual([1, 2, 3, 4]);
  });

  it('keeps the last good version when a migration fails', async () => {
    const s = createStorage({ namespace: 'm', backend: createMemoryBackend() });
    const boom = {
      version: 2,
      up: async () => {
        throw new Error('boom');
      },
    };
    await expect(runMigrations(s, [mig(1), boom])).rejects.toThrow('boom');
    expect(await s.getJSON(SCHEMA_VERSION_KEY)).toBe(1);
  });

  it('shares one run between concurrent callers', async () => {
    const s = createStorage({ namespace: 'm', backend: createMemoryBackend() });
    const [a, b] = await Promise.all([runMigrations(s, [mig(1)]), runMigrations(s, [mig(1)])]);
    expect(a).toBe(b);
    expect(log).toEqual([1]);
  });

  it('rejects duplicate versions', async () => {
    const s = createStorage({ namespace: 'm', backend: createMemoryBackend() });
    await expect(runMigrations(s, [mig(1), mig(1)])).rejects.toThrow('duplicate');
  });
});
