import { useCallback, useEffect, useState } from 'react';
import { useService } from '@pp/core-di';
import { appAnalytics } from '@pp/core-analytics';
import { lockStore } from '@pp/platform-lifecycle';
import { PIN_SERVICE } from '@pp/svc-auth';

export interface PinUnlockState {
  attemptsLeft: number | null;
  lockedSeconds: number;
  wrong: boolean;
  busy: boolean;
  submit: (pin: string) => Promise<void>;
}

/** PIN verification for the lock gate, including lockout state reported by the PIN service. */
export function usePinUnlock(userId: string | null): PinUnlockState {
  const pins = useService(PIN_SERVICE);
  const [attemptsLeft, setAttemptsLeft] = useState<number | null>(null);
  const [lockedMs, setLockedMs] = useState(0);
  const [wrong, setWrong] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!userId) return undefined;
    let cancelled = false;
    void pins.getStatus(userId).then((status) => {
      if (cancelled) return;
      setAttemptsLeft(status.attemptsLeft);
      setLockedMs(status.locked ? status.remainingMs : 0);
    });
    return () => {
      cancelled = true;
    };
  }, [pins, userId]);

  const submit = useCallback(
    async (pin: string) => {
      if (!userId) return;
      setBusy(true);
      try {
        const result = await pins.verifyPin(userId, pin);
        if (result.ok) {
          setWrong(false);
          lockStore.getState().unlock('pin');
          appAnalytics.track('lock_unlocked', { method: 'pin' });
        } else if (result.reason === 'wrong') {
          setWrong(true);
          setAttemptsLeft(result.attemptsLeft);
        } else {
          setLockedMs(result.remainingMs);
        }
      } finally {
        setBusy(false);
      }
    },
    [pins, userId],
  );

  return { attemptsLeft, lockedSeconds: Math.ceil(lockedMs / 1000), wrong, busy, submit };
}
