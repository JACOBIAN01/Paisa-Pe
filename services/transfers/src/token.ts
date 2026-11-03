import { createToken } from '@pp/core-di';
import type { TransferService } from './service';

export const TRANSFER_SERVICE = createToken<TransferService>('transfer-service');
