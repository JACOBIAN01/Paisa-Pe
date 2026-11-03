import { useCallback, useEffect, useRef, useState } from 'react';
import { useService } from '@pp/core-di';
import { appAnalytics } from '@pp/core-analytics';
import { authenticateBiometric, isBiometricAvailable } from '@pp/platform-biometrics';
import { lockStore } from '@pp/platform-lifecycle';
import { PROFILE_SERVICE } from '@pp/svc-profile';

/**
 * Offers biometric unlock when the user enabled it and the device supports it.
 * Only a `success` outcome unlocks; every other outcome leaves the PIN pad as the way in.
 */
export function useBiometricUnlock(userId: string | null) {
  const profile = useService(PROFILE_SERVICE);
  const [available, setAvailable] = useState(false);
  const attempted = useRef(false);

  const prompt = useCallback(async (): Promise<boolean> => {
    const outcome = await authenticateBiometric({
      message: 'Unlock PaisaPe',
      cancelLabel: 'Use PIN',
    });
    if (outcome !== 'success') return false;
    lockStore.getState().unlock('biometric');
    appAnalytics.track('lock_unlocked', { method: 'biometric' });
    return true;
  }, []);

  useEffect(() => {
    if (!userId) return undefined;
    let cancelled = false;
    void (async () => {
      const [prefs, supported] = await Promise.all([
        profile.getCachedPreferences(),
        isBiometricAvailable(),
      ]);
      if (cancelled) return;
      const enabled = prefs.biometricsEnabled && supported;
      setAvailable(enabled);
      if (enabled && !attempted.current) {
        attempted.current = true;
        await prompt();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [profile, userId, prompt]);

  return { available, prompt };
}
