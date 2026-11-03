import { useCallback, useRef } from 'react';
import { createIntentId } from '@pp/svc-bills';

/**
 * One intent id per payment the user is working on, keyed by what is being paid.
 * Retrying the same payment reuses its id; `settle` forgets it once the payment is done.
 */
export function useIntentIds() {
  const ids = useRef(new Map<string, string>());
  const idFor = useCallback((signature: string) => {
    const existing = ids.current.get(signature);
    if (existing) return existing;
    const created = createIntentId();
    ids.current.set(signature, created);
    return created;
  }, []);
  const settle = useCallback((signature: string) => {
    ids.current.delete(signature);
  }, []);
  return { idFor, settle };
}
