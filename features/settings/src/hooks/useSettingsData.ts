import { useCallback, useEffect, useRef, useState } from 'react';
import type { Preferences, User } from '@pp/contracts-domain';
import { useService } from '@pp/core-di';
import { setLanguage } from '@pp/core-i18n';
import { PROFILE_SERVICE } from '@pp/svc-profile';
import { applyPreferencePatch } from '../state/settings-model';

export type SettingsStatus = 'loading' | 'ready' | 'error';

export interface SettingsData {
  status: SettingsStatus;
  user: User | null;
  preferences: Preferences | null;
  saving: boolean;
  saveFailed: boolean;
  reload(): void;
  update(patch: Partial<Preferences>): Promise<void>;
}

export function useSettingsData(): SettingsData {
  const profile = useService(PROFILE_SERVICE);
  const [status, setStatus] = useState<SettingsStatus>('loading');
  const [user, setUser] = useState<User | null>(null);
  const [preferences, setPreferences] = useState<Preferences | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    Promise.all([profile.getProfile(), profile.getPreferences()])
      .then(([nextUser, nextPrefs]) => {
        if (cancelled) return;
        setUser(nextUser);
        setPreferences(nextPrefs);
        setStatus('ready');
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, [profile, attempt]);

  const update = useCallback(
    async (patch: Partial<Preferences>) => {
      const before = preferences;
      if (!before) return;
      setPreferences(applyPreferencePatch(before, patch));
      setSaving(true);
      setSaveFailed(false);
      try {
        const saved = await profile.updatePreferences(patch);
        if (!mounted.current) return;
        setPreferences(saved);
        if (patch.language) setLanguage(saved.language);
      } catch {
        if (!mounted.current) return;
        setPreferences(before);
        setSaveFailed(true);
      } finally {
        if (mounted.current) setSaving(false);
      }
    },
    [preferences, profile],
  );

  const reload = useCallback(() => setAttempt((n) => n + 1), []);

  return { status, user, preferences, saving, saveFailed, reload, update };
}
