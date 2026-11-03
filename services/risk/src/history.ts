import type { Contact, Paise, Phone, Txn } from '@pp/contracts-domain';
import { paise } from '@pp/core-money';

const successfulSends = (history: readonly Txn[]): Txn[] =>
  history.filter((t) => t.type === 'p2p_send' && t.status === 'success');

export function hasPaidBefore(
  phone: Phone,
  history: readonly Txn[],
  contacts: readonly Contact[] = [],
): boolean {
  const paidInHistory = successfulSends(history).some((t) => t.counterparty?.phone === phone);
  const paidContact = contacts.some((c) => c.phone === phone && c.lastPaidAt !== undefined);
  return paidInHistory || paidContact;
}

/** Median of the most recent successful sends; null when there are fewer than `minSamples`. */
export function medianRecentSend(
  history: readonly Txn[],
  sampleSize: number,
  minSamples: number,
): Paise | null {
  const recent = successfulSends(history)
    .sort((a, b) => b.createdAt - a.createdAt || (a.id < b.id ? 1 : -1))
    .slice(0, sampleSize)
    .map((t) => t.amount)
    .sort((a, b) => a - b);
  if (recent.length < Math.max(minSamples, 1)) return null;
  const mid = Math.floor(recent.length / 2);
  if (recent.length % 2 === 1) return recent[mid] as Paise;
  return paise(Math.floor(((recent[mid - 1] as number) + (recent[mid] as number)) / 2));
}
