import type { Database } from '../database';
import { createRng } from '../rng';
import { seedContacts } from './contacts';
import { DEMO_USERS, PRIMARY_USER_ID } from './data';
import { seedBilling, seedGoalsAndCards, seedNotifications } from './misc';
import { seedRewards } from './rewards';
import { OTHER_TXN_COUNT, PRIMARY_TXN_COUNT, seedTxns } from './txns';
import { seedUsers } from './users';

export { CLUSTER_LENGTH, CLUSTER_PERIOD, CLUSTER_START, PRIMARY_TXN_COUNT } from './txns';
export { AVATAR_COLORS, DEMO_OTP, DEMO_USERS, PRIMARY_USER_ID } from './data';
export type { DemoUser } from './data';
export { BILLERS } from './misc';
export { defaultPreferences } from './users';

const WALLET_CEILING = { min: 800_000, basic: 8_000_000, full: 20_000_000 } as const;

/** Fills an empty database with deterministic fixtures. `now` anchors all relative dates. */
export function seedDatabase(db: Database, now: number): void {
  const rng = createRng(db.meta.seed);
  seedUsers(db, now);
  seedContacts(db, rng, now);
  for (const demo of DEMO_USERS) {
    const primary = demo.id === PRIMARY_USER_ID;
    seedTxns(db, rng, {
      ownerId: demo.id,
      count: primary ? PRIMARY_TXN_COUNT : OTHER_TXN_COUNT,
      spanDays: primary ? 270 : 60,
      now,
      ceiling: WALLET_CEILING[demo.tier],
      contacts: db.t.contacts.filter((c) => c.ownerId === demo.id).map((c) => c.contact),
    });
  }
  seedRewards(db, rng, now);
  seedBilling(db, rng, now);
  seedGoalsAndCards(db, rng, now);
  seedNotifications(db, rng, now);
}
