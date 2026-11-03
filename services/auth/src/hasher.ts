import * as Crypto from 'expo-crypto';

export interface PinHasher {
  /** Hex digest of `data`. */
  digest(data: string): Promise<string>;
  /** `bytes` random bytes as hex. */
  randomHex(bytes: number): Promise<string>;
}

const toHex = (bytes: Uint8Array): string =>
  [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');

export const expoHasher: PinHasher = {
  digest: (data) => Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, data),
  randomHex: async (bytes) => toHex(Crypto.getRandomBytes(bytes)),
};

export const DEFAULT_PIN_ROUNDS = 4096;

/** Salted, iterated SHA-256. Each round feeds the previous digest back in with the salt. */
export async function hashPin(
  hasher: PinHasher,
  pin: string,
  salt: string,
  rounds: number,
): Promise<string> {
  let state = await hasher.digest(`${salt}:${pin}`);
  for (let i = 1; i < rounds; i += 1) {
    state = await hasher.digest(`${state}:${salt}`);
  }
  return state;
}

export function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
