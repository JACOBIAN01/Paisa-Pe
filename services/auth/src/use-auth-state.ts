import { useEffect, useState } from 'react';
import { useService } from '@pp/core-di';
import type { AuthSnapshot } from './types';
import { AUTH_SERVICE } from './token';

/** Live auth snapshot: ready flag, active user and known accounts. */
export function useAuthState(): AuthSnapshot {
  const auth = useService(AUTH_SERVICE);
  const [state, setState] = useState<AuthSnapshot>(() => auth.getState());

  useEffect(() => {
    setState(auth.getState());
    return auth.subscribe(setState);
  }, [auth]);

  return state;
}
