import { createToken } from '@pp/core-di';
import type { SyncService } from './types';

export const SYNC_SERVICE = createToken<SyncService>('sync-service');
