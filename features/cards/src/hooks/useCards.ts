import { useCallback, useEffect, useState } from 'react';
import type { Card } from '@pp/contracts-domain';
import { useService } from '@pp/core-di';
import { CARDS_SERVICE } from '@pp/svc-cards';

export type CardsStatus = 'loading' | 'ready' | 'error';

/** Live view of the signed-in user's cards, including in-flight optimistic changes. */
export function useCards() {
  const cards = useService(CARDS_SERVICE);
  const [list, setList] = useState<Card[]>(() => cards.getCards());
  const [status, setStatus] = useState<CardsStatus>('loading');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const unsubscribe = cards.subscribe(() => {
      if (!cancelled) setList(cards.getCards());
    });
    setStatus('loading');
    cards
      .hydrate()
      .then(() => cards.refresh())
      .then(() => {
        if (cancelled) return;
        setList(cards.getCards());
        setStatus('ready');
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [cards, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  return { cards, list, status, retry };
}
