import type { AppEventMap } from '@pp/contracts-events';
import type { EventBus } from '@pp/core-event-bus';

export type ProfileBus = Pick<EventBus<AppEventMap>, 'emit'>;
