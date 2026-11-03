import { useCallback, useRef } from 'react';
import { createIntentId } from '@pp/svc-goals';

/**
 * Hands out one intent id per user action. Retrying the same action returns the same id;
 * `renew` starts a new action after it has been settled.
 */
export function useIntentId() {
  const ref = useRef<string | null>(null);
  const current = useCallback(() => {
    ref.current ??= createIntentId();
    return ref.current;
  }, []);
  const renew = useCallback(() => {
    ref.current = null;
  }, []);
  return { current, renew };
}
