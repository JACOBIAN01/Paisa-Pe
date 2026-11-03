import type { AppEventMap } from '@pp/contracts-events';
import type { UserId } from '@pp/contracts-domain';
import { createContainer, type Container } from '@pp/core-di';
import type { EventBus } from '@pp/core-event-bus';
import type { HttpClient } from '@pp/core-net';
import { createUserStorage, USER_STORAGE, type JsonStore } from '@pp/core-storage';
import { after, type Clock } from '@pp/core-time';
import { createBillsService, BILLS_SERVICE } from '@pp/svc-bills';
import { createCardsService, CARDS_SERVICE } from '@pp/svc-cards';
import { createGoalsService, GOALS_SERVICE } from '@pp/svc-goals';
import { createLedger, LEDGER } from '@pp/svc-ledger';
import { createRequestsService, REQUESTS_SERVICE } from '@pp/svc-requests';
import { createRewardsService, REWARDS_SERVICE } from '@pp/svc-rewards';
import { createSyncService, SYNC_SERVICE } from '@pp/svc-sync';
import { createTransferService, TRANSFER_SERVICE } from '@pp/svc-transfers';

export interface UserWiringDeps {
  root: Container;
  userId: string;
  http: HttpClient;
  deviceStorage: JsonStore;
  bus: EventBus<AppEventMap>;
  clock: Clock;
  isOnline(): boolean;
  onOnlineChange(listener: (online: boolean) => void): () => void;
}

export interface UserServices {
  container: Container;
  dispose(): void;
}

/** Builds and hydrates every per-user service, then exposes them through a child container. */
export async function wireUserServices(deps: UserWiringDeps): Promise<UserServices> {
  const { root, http, bus, clock } = deps;
  const userId = deps.userId as UserId;
  const storage = createUserStorage(deps.userId, deps.deviceStorage);

  const ledger = createLedger({ http, storage, bus, clock, userId: deps.userId });
  const transfers = createTransferService({
    http,
    storage,
    ledger,
    bus,
    clock,
    userId: deps.userId,
    isOnline: deps.isOnline,
    onOnlineChange: deps.onOnlineChange,
    schedule: after,
  });
  const sync = createSyncService({ http, storage, bus, clock, userId: deps.userId, ledger });
  const cards = createCardsService({ http, storage, clock, userId: deps.userId, schedule: after });

  await Promise.all([ledger.hydrate(), transfers.hydrate(), sync.hydrate(), cards.hydrate()]);
  ledger.start();
  transfers.start();

  const container = createContainer(root);
  container.registerValue(USER_STORAGE, storage);
  container.registerValue(LEDGER, ledger);
  container.registerValue(TRANSFER_SERVICE, transfers);
  container.registerValue(SYNC_SERVICE, sync);
  container.registerValue(CARDS_SERVICE, cards);
  container.registerValue(REQUESTS_SERVICE, createRequestsService({ http, storage, bus, userId }));
  container.registerValue(
    REWARDS_SERVICE,
    createRewardsService({ http, storage, bus, userId, clock }),
  );
  container.registerValue(GOALS_SERVICE, createGoalsService({ http, storage, bus, userId }));
  container.registerValue(BILLS_SERVICE, createBillsService({ http, storage, bus, userId }));

  return {
    container,
    dispose() {
      transfers.stop();
      ledger.dispose();
      cards.dispose();
    },
  };
}
