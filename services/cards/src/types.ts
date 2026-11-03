import type { Card, CardReveal } from '@pp/contracts-domain';

export interface CardsService {
  hydrate(): Promise<void>;
  refresh(): Promise<Card[]>;
  /** Server cards with any in-flight optimistic changes applied. */
  getCards(): Card[];
  freeze(cardId: string): Promise<Card>;
  unfreeze(cardId: string): Promise<Card>;
  /** Fetches the full card details. They live in memory only and expire. */
  reveal(cardId: string): Promise<CardReveal>;
  getReveal(cardId: string): CardReveal | null;
  hideReveal(cardId: string): void;
  subscribe(listener: () => void): () => void;
  dispose(): void;
}

export interface Layer {
  id: number;
  cardId: string;
  status: Card['status'];
}
