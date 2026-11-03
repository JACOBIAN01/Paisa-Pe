import { useCallback, useEffect, useState } from 'react';
import type { Contact } from '@pp/contracts-domain';
import { useService } from '@pp/core-di';
import { PROFILE_SERVICE } from '@pp/svc-profile';

export interface ContactsState {
  contacts: Contact[];
  loading: boolean;
  failed: boolean;
  reload: () => void;
}

export function useContacts(): ContactsState {
  const profile = useService(PROFILE_SERVICE);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let live = true;
    setLoading(true);
    profile
      .getContacts()
      .then((items) => {
        if (!live) return;
        setContacts(items);
        setFailed(false);
      })
      .catch(() => {
        if (live) setFailed(true);
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [profile, attempt]);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);
  return { contacts, loading, failed, reload };
}
