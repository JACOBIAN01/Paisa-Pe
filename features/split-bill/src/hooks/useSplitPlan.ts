import { useMemo } from 'react';
import type { Contact, Paise } from '@pp/contracts-domain';
import { parseAmount } from '@pp/core-money';
import { useService } from '@pp/core-di';
import {
  REQUESTS_SERVICE,
  type ParticipantRef,
  type SplitMode,
  type SplitParticipant,
  type SplitPlan,
} from '@pp/svc-requests';
import { parsePercentBps } from '../state/percent';

export interface SplitInputs {
  total: Paise | null;
  mode: SplitMode;
  includeSelf: boolean;
  selected: Contact['id'][];
  values: Record<string, string>;
}

export interface SplitView {
  participants: SplitParticipant[];
  plan: SplitPlan | null;
  /** First reason the current inputs cannot be split, if any. */
  problem: string | null;
}

/** Recomputes from the inputs every time they change, so callbacks never see stale people. */
export function useSplitPlan({
  total,
  mode,
  includeSelf,
  selected,
  values,
}: SplitInputs): SplitView {
  const requests = useService(REQUESTS_SERVICE);

  const participants = useMemo<SplitParticipant[]>(() => {
    const refs: ParticipantRef[] = [...(includeSelf ? (['self'] as const) : []), ...selected];
    return refs.map((ref) => {
      const text = values[ref] ?? '';
      if (mode === 'custom') {
        const amount = parseAmount(text, { allowZero: true });
        return amount === null ? { ref } : { ref, amount };
      }
      if (mode === 'percent') {
        const percentBps = parsePercentBps(text);
        return percentBps === null ? { ref } : { ref, percentBps };
      }
      return { ref };
    });
  }, [includeSelf, selected, values, mode]);

  return useMemo(() => {
    if (total === null || participants.length === 0) {
      return { participants, plan: null, problem: null };
    }
    const result = requests.planSplit(total, participants, mode);
    return result.ok
      ? { participants, plan: result.value, problem: null }
      : { participants, plan: null, problem: result.error.message };
  }, [requests, total, participants, mode]);
}
