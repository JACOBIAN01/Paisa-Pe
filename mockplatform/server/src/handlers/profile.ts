import type { Contact, KycTier, UserId } from '@pp/contracts-domain';
import { AVATAR_COLORS, contactId, type UserRecord } from '@pp/mock-db';
import { fail } from '../errors';
import type { Registry } from '../context';
import { computeLimits, NEXT_TIER } from '../limits';
import { userByPhone } from '../transfer-core';

const record = (users: Map<UserId, UserRecord>, id: UserId): UserRecord => {
  const found = users.get(id);
  if (!found) throw fail('unauthorized', 'Unknown user');
  return found;
};

export function registerProfile(r: Registry): void {
  r.auth('profile.get', ({ db, userId }) => ({ user: record(db.t.users, userId).user }));

  r.auth('profile.update', ({ db, userId, body }) => {
    const name = body.name.trim();
    if (name === '') throw fail('invalid_request', 'Name cannot be empty');
    const found = record(db.t.users, userId);
    found.user.name = name;
    return { user: found.user };
  });

  r.auth('profile.contacts', ({ db, userId }) => ({
    items: db.t.contacts
      .filter((c) => c.ownerId === userId)
      .map((c) => c.contact)
      .sort((a, b) => a.name.localeCompare(b.name)),
  }));

  r.auth('profile.addContact', ({ db, userId, body }) => {
    const mine = db.t.contacts.filter((c) => c.ownerId === userId);
    if (mine.some((c) => c.contact.phone === body.phone))
      throw fail('conflict', 'Contact already exists');
    const linked = userByPhone(db, body.phone);
    if (linked?.id === userId) throw fail('invalid_request', 'You cannot add yourself');
    const contact: Contact = {
      id: contactId(db.nextId('ct')),
      userId: linked?.id,
      name: body.name.trim(),
      phone: body.phone,
      favourite: false,
      avatarColor: AVATAR_COLORS[Math.floor(db.random() * AVATAR_COLORS.length)] as string,
    };
    db.t.contacts.push({ ownerId: userId, contact });
    return { contact };
  });

  r.auth('profile.preferences', ({ db, userId }) => {
    const preferences = db.t.preferences.get(userId);
    if (!preferences) throw fail('not_found', 'Preferences not found');
    return { preferences };
  });

  r.auth('profile.setPreferences', ({ db, userId, body }) => {
    db.t.preferences.set(userId, body);
    record(db.t.users, userId).user.language = body.language;
    return { preferences: body };
  });

  r.auth('limits.get', ({ db, now, userId }) => ({ limits: computeLimits(db, userId, now) }));

  r.auth('kyc.status', ({ db, userId }) => {
    const found = record(db.t.users, userId);
    if (found.kycState === 'in_review') {
      const next: KycTier | undefined = NEXT_TIER[found.user.kycTier];
      if (next) found.user.kycTier = next;
      found.kycState = 'approved';
    }
    return { status: { tier: found.user.kycTier, state: found.kycState } };
  });

  r.auth('kyc.submit', ({ db, userId }) => {
    const found = record(db.t.users, userId);
    if (found.user.kycTier === 'full') throw fail('conflict', 'KYC is already complete');
    if (found.kycState === 'in_review') throw fail('conflict', 'A submission is already in review');
    found.kycState = 'in_review';
    return { status: { tier: found.user.kycTier, state: found.kycState } };
  });

  r.auth('notifications.list', ({ db, userId }) => ({
    items: db.t.notifications
      .filter((n) => n.ownerId === userId)
      .map((n) => n.notification)
      .sort((a, b) => b.createdAt - a.createdAt || (a.id < b.id ? 1 : -1)),
  }));

  r.auth('notifications.markRead', ({ db, userId, body }) => {
    const ids = new Set(body.ids);
    for (const n of db.t.notifications) {
      if (n.ownerId === userId && ids.has(n.notification.id)) n.notification.read = true;
    }
    return { ok: true };
  });
}
