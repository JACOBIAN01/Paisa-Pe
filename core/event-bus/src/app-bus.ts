import type { AppEventMap } from '@pp/contracts-events';
import { createEventBus } from './bus';

export const appBus = createEventBus<AppEventMap>();
