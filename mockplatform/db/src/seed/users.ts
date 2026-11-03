import type { Language, Preferences } from '@pp/contracts-domain';
import type { Database } from '../database';
import { paise, phone, userId } from '../ids';
import { DEMO_USERS, LOCK_TIMEOUT_DEFAULT } from './data';

export const defaultPreferences = (language: Language): Preferences => ({
  language,
  lockTimeoutSec: LOCK_TIMEOUT_DEFAULT,
  biometricsEnabled: true,
  hideBalance: false,
  pushEnabled: true,
});

export function seedUsers(db: Database, now: number): void {
  for (const [index, demo] of DEMO_USERS.entries()) {
    const id = userId(demo.id);
    db.t.users.set(id, {
      user: {
        id,
        phone: phone(demo.phone),
        name: demo.name,
        kycTier: demo.tier,
        language: demo.language,
        createdAt: now - (400 - index * 10) * 86_400_000,
      },
      referral: {
        code: `${demo.name.split(' ')[0]?.toUpperCase().slice(0, 5)}${100 + index * 7}`,
        invited: index % 4,
        earned: paise((index % 4) * 5000),
      },
      kycState: demo.tier === 'min' ? 'none' : 'approved',
    });
    db.t.wallets.set(id, { balance: paise(0), version: 0 });
    db.t.preferences.set(id, defaultPreferences(demo.language));
  }
}
