import { useCallback, useEffect, useState } from 'react';
import { useService } from '@pp/core-di';
import { PROFILE_SERVICE } from '@pp/svc-profile';
import type { Preferences } from '@pp/contracts-domain';
import { messageFor } from '../state/errors';

/** Loads preferences and applies single-field changes, restoring only that field if the save fails. */
export function usePreferences() {
  const profile = useService(PROFILE_SERVICE);
  const [prefs, setPrefs] = useState<Preferences | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    profile
      .getPreferences()
      .then((value) => {
        if (!cancelled) setPrefs(value);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(messageFor(e));
      });
    return () => {
      cancelled = true;
    };
  }, [profile]);

  const update = useCallback(
    async <K extends keyof Preferences>(key: K, value: Preferences[K]) => {
      let previous: Preferences[K] | undefined;
      setPrefs((current) => {
        if (!current) return current;
        previous = current[key];
        return { ...current, [key]: value };
      });
      try {
        await profile.updatePreferences({ [key]: value });
        setError(null);
      } catch (e) {
        setPrefs((current) =>
          current && previous !== undefined ? { ...current, [key]: previous } : current,
        );
        setError(messageFor(e));
      }
    },
    [profile],
  );

  return { prefs, error, update };
}
