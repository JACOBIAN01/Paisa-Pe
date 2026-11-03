import type { EndpointName } from '@pp/contracts-api';
import { endpoints } from '@pp/contracts-api';
import { createRegistry, type HandlerEntry, type HandlerTable } from '../context';
import { registerAuth } from './auth';
import { registerBills } from './bills';
import { registerCards } from './cards';
import { registerGoals } from './goals';
import { registerProfile } from './profile';
import { registerRequests } from './requests';
import { registerRewards } from './rewards';
import { registerSync } from './sync';
import { registerTransfers } from './transfers';
import { registerWallet } from './wallet';

export { feeFor } from './bills';

export function buildHandlers(): HandlerTable {
  const registry = createRegistry();
  for (const register of [
    registerAuth,
    registerWallet,
    registerTransfers,
    registerRequests,
    registerRewards,
    registerGoals,
    registerCards,
    registerBills,
    registerProfile,
    registerSync,
  ]) {
    register(registry);
  }
  const entries = registry.entries();
  const table = {} as Record<EndpointName, HandlerEntry>;
  for (const name of Object.keys(endpoints) as EndpointName[]) {
    const entry = entries.get(name);
    if (!entry) throw new Error(`missing handler for ${name}`);
    if (entry.auth !== endpoints[name].auth) throw new Error(`auth mismatch for ${name}`);
    table[name] = entry;
  }
  return table;
}
