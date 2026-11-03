import { createToken } from '@pp/core-di';
import type { BillsService } from './service';

export const BILLS_SERVICE = createToken<BillsService>('bills-service');
