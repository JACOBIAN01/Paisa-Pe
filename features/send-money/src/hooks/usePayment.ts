import { useCallback, useEffect, useRef, useState } from 'react';
import { useService } from '@pp/core-di';
import { TRANSFER_SERVICE, type TransferIntent, type TransferParams } from '@pp/svc-transfers';
import { fromOutcome, type PaymentState } from '../state/outcome';

export interface Payment {
  state: PaymentState;
  /** True from the first tap until the outcome is known. */
  busy: boolean;
  pay: () => void;
}

/**
 * Drives one payment from the confirm screen. One intent (and so one idempotency key) is created
 * per user decision; extra taps while a request is in flight are ignored synchronously.
 */
export function usePayment(params: TransferParams | null): Payment {
  const transfers = useService(TRANSFER_SERVICE);
  const [state, setState] = useState<PaymentState>({ phase: 'idle' });
  const guard = useRef(false);
  const intent = useRef<TransferIntent | null>(null);
  const controller = useRef<AbortController | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      controller.current?.abort();
    };
  }, []);

  const pay = useCallback(() => {
    if (!params || guard.current) return;
    guard.current = true;
    setState({ phase: 'sending' });
    const abort = new AbortController();
    controller.current = abort;

    const run = async (): Promise<PaymentState> => {
      if (!intent.current) {
        intent.current = await transfers.createIntent({
          to: { phone: params.to },
          amount: params.amount,
          ...(params.note ? { note: params.note } : {}),
        });
      }
      const outcome = await transfers.send(intent.current.id, { signal: abort.signal });
      return fromOutcome(outcome);
    };

    run()
      .catch((): PaymentState => ({ phase: 'failed', code: 'unknown' }))
      .then((next) => {
        if (next.phase === 'failed') intent.current = null;
        if (next.phase !== 'sent') guard.current = false;
        if (mounted.current) setState(next);
      });
  }, [params, transfers]);

  return { state, busy: state.phase === 'sending', pay };
}
