import type { JsonStore } from '@pp/core-storage';
import type { Mutex } from './mutex';

export interface QueueItem {
  intentId: string;
  attempts: number;
  nextAttemptAt: number;
}

export interface OfflineQueue {
  list(): Promise<QueueItem[]>;
  upsert(item: QueueItem): Promise<void>;
  remove(intentId: string): Promise<void>;
}

const QUEUE_KEY = 'transfers.queue';

const parse = (raw: unknown): QueueItem[] => (Array.isArray(raw) ? (raw as QueueItem[]) : []);

/** Persisted queue. Every change is a read-modify-write that runs inside the mutex. */
export function createOfflineQueue(storage: JsonStore, mutex: Mutex): OfflineQueue {
  const read = async (): Promise<QueueItem[]> => parse(await storage.getJSON(QUEUE_KEY));
  const mutate = (change: (items: QueueItem[]) => QueueItem[]): Promise<void> =>
    mutex.runExclusive(async () => {
      await storage.setJSON(QUEUE_KEY, change(await read()));
    });

  return {
    list: () => mutex.runExclusive(read),
    upsert: (item) =>
      mutate((items) => [...items.filter((i) => i.intentId !== item.intentId), item]),
    remove: (intentId) => mutate((items) => items.filter((i) => i.intentId !== intentId)),
  };
}
