import type { Contact } from '@pp/contracts-domain';

/** Favourites first, then alphabetical, so the list order is the same on every render. */
export const sortContacts = (contacts: Contact[]): Contact[] =>
  [...contacts].sort(
    (a, b) => Number(b.favourite) - Number(a.favourite) || a.name.localeCompare(b.name),
  );
