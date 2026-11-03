import { useCallback, useEffect, useState } from 'react';
import type { CardReveal } from '@pp/contracts-domain';
import { usePrivacyShield } from '@pp/platform-lifecycle';
import type { CardsService } from '@pp/svc-cards';

const TICK_MS = 1000;

/**
 * Shows full card details for a short time. Details are held in memory only, hidden when
 * the timer ends, when the app leaves the foreground and when the screen goes away.
 */
export function useCardReveal(cards: CardsService, cardId: string | undefined) {
  const shielded = usePrivacyShield();
  const [reveal, setReveal] = useState<CardReveal | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);

  const hide = useCallback(() => {
    if (cardId) cards.hideReveal(cardId);
    setReveal(null);
    setSecondsLeft(0);
  }, [cards, cardId]);

  const show = useCallback(async () => {
    if (!cardId) return;
    const details = await cards.reveal(cardId);
    setReveal(details);
    setSecondsLeft(details.expiresInSec);
  }, [cards, cardId]);

  useEffect(() => {
    if (reveal === null) return undefined;
    const timer = setInterval(() => {
      setSecondsLeft((s) => s - 1);
    }, TICK_MS);
    return () => clearInterval(timer);
  }, [reveal]);

  useEffect(() => {
    if (reveal !== null && (secondsLeft <= 0 || shielded)) hide();
  }, [reveal, secondsLeft, shielded, hide]);

  useEffect(() => hide, [hide]);

  return { reveal, secondsLeft, show, hide };
}
