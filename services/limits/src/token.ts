import { createToken } from '@pp/core-di';
import type { LimitsService } from './limits-service';

export const LIMITS_SERVICE = createToken<LimitsService>('limits-service');
