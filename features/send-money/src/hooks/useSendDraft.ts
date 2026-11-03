import { useEffect, useMemo, useState } from 'react';
import type { Contact, Limits, Paise, Phone, RiskPrompt, Txn } from '@pp/contracts-domain';
import { PhoneSchema } from '@pp/contracts-domain';
import { useService } from '@pp/core-di';
import { LEDGER, useLedgerState } from '@pp/svc-ledger';
import { LIMITS_SERVICE } from '@pp/svc-limits';
import { assessTransfer, hasBlocker } from '@pp/svc-risk';
import { SYNC_SERVICE } from '@pp/svc-sync';
import { toPhone } from '../state/amount';

export interface SendDraft {
  phone: Phone | null;
  prompts: RiskPrompt[];
  /** A hard stop: a risk blocker, a limit breach or an amount above the balance. */
  blocked: boolean;
  overBalance: boolean;
}

/** Derives risk and limit feedback for the amount and recipient currently entered. */
export function useSendDraft(digits: string, amount: Paise | null, contacts: Contact[]): SendDraft {
  const sync = useService(SYNC_SERVICE);
  const limits = useService(LIMITS_SERVICE);
  const ledger = useService(LEDGER);
  const ledgerState = useLedgerState();
  const [history, setHistory] = useState<Txn[]>(() => sync.getTxns());
  const [snapshot, setSnapshot] = useState<Limits | null>(null);

  useEffect(() => {
    let live = true;
    sync
      .syncNow()
      .then(() => {
        if (live) setHistory(sync.getTxns());
      })
      .catch(() => undefined);
    ledger.ensureFresh(30_000).catch(() => undefined);
    limits
      .refresh()
      .catch(() => limits.getSnapshot())
      .then((value) => {
        if (live && value) setSnapshot(value);
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [sync, limits, ledger]);

  const phone = useMemo(() => {
    const parsed = PhoneSchema.safeParse(toPhone(digits));
    return parsed.success ? parsed.data : null;
  }, [digits]);

  const balance = ledger.projectedBalance();

  return useMemo(() => {
    if (!phone || amount === null) {
      return { phone, prompts: [], blocked: false, overBalance: false };
    }
    const prompts = assessTransfer({
      amount,
      recipient: { phone },
      history,
      contacts,
      ...(snapshot ? { limits: snapshot } : {}),
    });
    const overBalance = ledgerState.fetchedAt > 0 && amount > balance;
    const limitCheck = limits.checkAmount({ amount, kind: 'send', balance });
    return {
      phone,
      prompts,
      blocked: hasBlocker(prompts) || overBalance || !limitCheck.ok,
      overBalance,
    };
  }, [phone, amount, history, contacts, snapshot, balance, ledgerState.fetchedAt, limits]);
}
