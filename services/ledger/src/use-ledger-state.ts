import { useEffect, useState } from 'react';
import { useService } from '@pp/core-di';
import type { LedgerState } from './types';
import { LEDGER } from './token';

/** Live ledger state; re-renders on every change. */
export function useLedgerState(): LedgerState {
  const ledger = useService(LEDGER);
  const [state, setState] = useState<LedgerState>(() => ledger.getState());

  useEffect(() => {
    setState(ledger.getState());
    return ledger.subscribe(() => setState(ledger.getState()));
  }, [ledger]);

  return state;
}
