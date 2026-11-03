import { scopedSecureKey, type SecureStorage } from '@pp/core-storage';
import { constantTimeEqual, DEFAULT_PIN_ROUNDS, hashPin, type PinHasher } from './hasher';

interface PinRecord {
  v: 1;
  salt: string;
  hash: string;
  rounds: number;
}

export interface PinVault {
  has(userId: string): Promise<boolean>;
  set(userId: string, pin: string): Promise<void>;
  matches(userId: string, pin: string): Promise<boolean>;
  clear(userId: string): Promise<void>;
}

export interface PinVaultDeps {
  secure: SecureStorage;
  hasher: PinHasher;
  rounds?: number;
}

const keyFor = (userId: string): string => scopedSecureKey(userId, 'pin');

function parseRecord(raw: string | null): PinRecord | null {
  if (raw === null) return null;
  try {
    const value = JSON.parse(raw) as Partial<PinRecord>;
    if (
      value.v === 1 &&
      typeof value.salt === 'string' &&
      typeof value.hash === 'string' &&
      typeof value.rounds === 'number'
    ) {
      return value as PinRecord;
    }
  } catch {
    // corrupt record: treated as no PIN
  }
  return null;
}

/** Stores only a salted slow hash of the PIN, inside secure storage. */
export function createPinVault({
  secure,
  hasher,
  rounds = DEFAULT_PIN_ROUNDS,
}: PinVaultDeps): PinVault {
  const read = async (userId: string): Promise<PinRecord | null> =>
    parseRecord(await secure.get(keyFor(userId)));

  return {
    has: async (userId) => (await read(userId)) !== null,
    async set(userId, pin) {
      const salt = await hasher.randomHex(16);
      const hash = await hashPin(hasher, pin, salt, rounds);
      const record: PinRecord = { v: 1, salt, hash, rounds };
      await secure.set(keyFor(userId), JSON.stringify(record));
    },
    async matches(userId, pin) {
      const record = await read(userId);
      if (!record) return false;
      const candidate = await hashPin(hasher, pin, record.salt, record.rounds);
      return constantTimeEqual(candidate, record.hash);
    },
    clear: (userId) => secure.remove(keyFor(userId)),
  };
}
