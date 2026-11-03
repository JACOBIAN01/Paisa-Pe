import type { Contact } from '@pp/contracts-domain';
import type { Database } from '../database';
import { contactId, phone as asPhone, userId } from '../ids';
import type { Rng } from '../rng';
import { AVATAR_COLORS, DEMO_USERS, EXTERNAL_NAMES, phoneOf } from './data';

export const CONTACTS_PER_USER = 20;

export function seedContacts(db: Database, rng: Rng, now: number): void {
  for (const [ownerIndex, owner] of DEMO_USERS.entries()) {
    const ownerId = userId(owner.id);
    const others = DEMO_USERS.filter((u) => u.id !== owner.id);
    const names = [...EXTERNAL_NAMES];
    const contacts: Contact[] = [];
    const push = (name: string, phone: string, linked?: string) => {
      const seq = contacts.length + 1;
      contacts.push({
        id: contactId(`ct_${owner.id.slice(4)}_${String(seq).padStart(2, '0')}`),
        userId: linked ? userId(linked) : undefined,
        name,
        phone: asPhone(phone),
        favourite: seq <= 4,
        avatarColor: AVATAR_COLORS[(seq + ownerIndex) % AVATAR_COLORS.length] as string,
        lastPaidAt: rng.chance(0.5) ? now - rng.int(2, 120) * 86_400_000 : undefined,
      });
    };
    for (const other of others) push(other.name, other.phone, other.id);
    while (contacts.length < CONTACTS_PER_USER) {
      const name = names.splice(rng.int(0, names.length - 1), 1)[0] as string;
      push(name, phoneOf(ownerIndex * 100 + contacts.length, '99'));
    }
    for (const contact of contacts) db.t.contacts.push({ ownerId, contact });
  }
}
