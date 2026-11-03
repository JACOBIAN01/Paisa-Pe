import type { Contact } from '@pp/contracts-domain';
import { PhoneSchema } from '@pp/contracts-domain';

const digitsOnly = (text: string): string => text.replace(/\D/g, '');

export function searchContacts(contacts: Contact[], query: string): Contact[] {
  const needle = query.trim().toLowerCase();
  if (needle === '') return contacts;
  const digits = digitsOnly(needle);
  return contacts.filter(
    (c) =>
      c.name.toLowerCase().includes(needle) ||
      (digits !== '' && digitsOnly(c.phone).includes(digits)),
  );
}

const byName = (a: Contact, b: Contact): number => a.name.localeCompare(b.name);

export interface ContactSection {
  key: 'favourites' | 'all';
  data: Contact[];
}

/** Favourites first, then everyone else, each sorted by name. */
export function sectionContacts(contacts: Contact[]): ContactSection[] {
  const favourites = contacts.filter((c) => c.favourite).sort(byName);
  const others = contacts.filter((c) => !c.favourite).sort(byName);
  const sections: ContactSection[] = [];
  if (favourites.length > 0) sections.push({ key: 'favourites', data: favourites });
  if (others.length > 0) sections.push({ key: 'all', data: others });
  return sections;
}

/** Accepts "98123 45678", "+91 98123-45678" or "919812345678"; returns +91XXXXXXXXXX or null. */
export function normalizePhone(input: string): string | null {
  const digits = digitsOnly(input);
  const national = digits.length === 12 && digits.startsWith('91') ? digits.slice(2) : digits;
  const parsed = PhoneSchema.safeParse(`+91${national}`);
  return parsed.success ? parsed.data : null;
}
