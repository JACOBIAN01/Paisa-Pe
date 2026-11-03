import type { EventBus } from '@pp/core-event-bus';
import type { AppEventMap } from '@pp/contracts-events';

export type AuthBus = Pick<EventBus<AppEventMap>, 'emit'>;

export interface AccountInfo {
  userId: string;
  sessionId: string;
  deviceId: string;
  name: string;
  phone: string;
}

export interface AuthSnapshot {
  /** False until `restore()` has finished reading storage. */
  ready: boolean;
  activeUserId: string | null;
  accounts: AccountInfo[];
}
