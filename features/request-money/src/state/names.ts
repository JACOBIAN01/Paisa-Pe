import type { Contact, MoneyRequest, UserId } from '@pp/contracts-domain';
import { copy } from '../copy';

/** Name of the other party in a request, as seen by `me`. */
export function counterpartyName(request: MoneyRequest, me: string | null, contacts: Contact[]) {
  const otherId: UserId = request.payerId === me ? request.requesterId : request.payerId;
  return contacts.find((c) => c.userId === otherId)?.name ?? copy.someone;
}

export const isIncoming = (request: MoneyRequest, me: string | null): boolean =>
  request.payerId === me;
