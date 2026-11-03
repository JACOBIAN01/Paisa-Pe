import { createHash, randomBytes } from 'node:crypto';
import type { PinHasher } from '@pp/svc-auth';

/** Node-backed PIN hasher; the Expo implementation needs native modules. */
export const nodePinHasher: PinHasher = {
  digest: async (data) => createHash('sha256').update(data).digest('hex'),
  randomHex: async (bytes) => randomBytes(bytes).toString('hex'),
};
