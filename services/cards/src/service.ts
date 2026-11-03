import type { Card, CardReveal } from '@pp/contracts-domain';
import type { HttpClient } from '@pp/core-net';
import type { JsonStore } from '@pp/core-storage';
import { after, type Cancel, type Clock } from '@pp/core-time';
import { createKeyedQueue } from './keyed-queue';
import type { CardsService, Layer } from './types';

export interface CardsServiceDeps {
  http: Pick<HttpClient, 'call'>;
  /** Already scoped to the signed-in user. Only non-secret card fields are written to it. */
  storage: JsonStore;
  clock: Clock;
  userId: string;
  revealTtlMs?: number;
  schedule?: (ms: number, fn: () => void) => Cancel;
}

interface Revealed {
  value: CardReveal;
  expiresAt: number;
  cancel: Cancel;
}

const CARDS_KEY = 'cards.list';
const DEFAULT_REVEAL_MS = 30_000;

export function createCardsService(deps: CardsServiceDeps): CardsService {
  const { http, storage, clock } = deps;
  const ttl = deps.revealTtlMs ?? DEFAULT_REVEAL_MS;
  const schedule = deps.schedule ?? after;
  const queue = createKeyedQueue();
  const listeners = new Set<() => void>();
  const revealed = new Map<string, Revealed>();
  let base: Card[] = [];
  let layers: Layer[] = [];
  let layerSeq = 0;
  let writes: Promise<void> = Promise.resolve();

  const notify = (): void => {
    for (const listener of [...listeners]) listener();
  };

  const view = (): Card[] =>
    base.map((card) => {
      const latest = [...layers].reverse().find((layer) => layer.cardId === card.id);
      return latest ? { ...card, status: latest.status } : card;
    });

  const setBase = (next: Card[]): void => {
    base = next;
    writes = writes.then(() => storage.setJSON(CARDS_KEY, next)).catch(() => undefined);
    notify();
  };

  const wipe = (cardId: string): void => {
    const entry = revealed.get(cardId);
    if (!entry) return;
    entry.cancel();
    revealed.delete(cardId);
  };

  /** Shows `status` immediately and returns a function that removes only this change. */
  const optimistic = (cardId: string, status: Card['status']): (() => void) => {
    layerSeq += 1;
    const layer: Layer = { id: layerSeq, cardId, status };
    layers = [...layers, layer];
    notify();
    return () => {
      layers = layers.filter((l) => l.id !== layer.id);
    };
  };

  function change(cardId: string, status: Card['status']): Promise<Card> {
    const drop = optimistic(cardId, status);
    if (status === 'frozen') wipe(cardId);
    return queue.run(cardId, async () => {
      try {
        const { card } = await http.call(status === 'frozen' ? 'cards.freeze' : 'cards.unfreeze', {
          params: { id: cardId },
        });
        drop();
        setBase(base.map((existing) => (existing.id === card.id ? card : existing)));
        return card;
      } catch (error) {
        drop();
        notify();
        throw error;
      }
    });
  }

  return {
    async hydrate() {
      const saved = await storage.getJSON<Card[]>(CARDS_KEY);
      if (Array.isArray(saved)) base = saved;
      notify();
    },
    async refresh() {
      const { items } = await http.call('cards.list');
      setBase(items);
      return view();
    },
    getCards: view,
    freeze: (cardId) => change(cardId, 'frozen'),
    unfreeze: (cardId) => change(cardId, 'active'),
    async reveal(cardId) {
      const { reveal } = await http.call('cards.reveal', { params: { id: cardId } });
      wipe(cardId);
      const lifetime = Math.min(ttl, reveal.expiresInSec * 1000);
      revealed.set(cardId, {
        value: reveal,
        expiresAt: clock.monotonic() + lifetime,
        cancel: schedule(lifetime, () => revealed.delete(cardId)),
      });
      return reveal;
    },
    getReveal(cardId) {
      const entry = revealed.get(cardId);
      if (!entry) return null;
      if (clock.monotonic() >= entry.expiresAt) {
        wipe(cardId);
        return null;
      }
      return entry.value;
    },
    hideReveal: wipe,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    dispose() {
      for (const id of [...revealed.keys()]) wipe(id);
      listeners.clear();
    },
  };
}
