import { createToken } from '@pp/core-di';
import type { RequestsService } from './service';

export const REQUESTS_SERVICE = createToken<RequestsService>('requests-service');
