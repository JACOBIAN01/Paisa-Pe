import { useCallback } from 'react';
import type { Contact } from '@pp/contracts-domain';
import { useService } from '@pp/core-di';
import { keys, useQuery, useQueryClient } from '@pp/core-query';
import { PROFILE_SERVICE } from '@pp/svc-profile';

export interface ContactsState {
  contacts: Contact[];
  loading: boolean;
  failed: boolean;
  refetch: () => Promise<void>;
  add: (input: { name: string; phone: string }) => Promise<Contact>;
}

export function useContacts(userId: string | null): ContactsState {
  const profile = useService(PROFILE_SERVICE);
  const client = useQueryClient();
  const key = keys.contacts(userId ?? '');
  const query = useQuery({
    key,
    fn: () => profile.getContacts(),
    staleMs: 30_000,
    enabled: userId !== null,
  });

  const add = useCallback(
    async (input: { name: string; phone: string }) => {
      const contact = await profile.addContact(input);
      client.setQueryData<Contact[]>(key, (old) => [
        ...(old ?? []).filter((c) => c.id !== contact.id),
        contact,
      ]);
      return contact;
    },
    // The key is derived from the user id only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [profile, client, userId],
  );

  return {
    contacts: query.data ?? [],
    loading: query.status === 'loading' || query.status === 'idle',
    failed: query.status === 'error',
    refetch: query.refetch,
    add,
  };
}
