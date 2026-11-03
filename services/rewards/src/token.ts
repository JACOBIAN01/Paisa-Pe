import { createToken } from '@pp/core-di';
import type { RewardsService } from './service';

export const REWARDS_SERVICE = createToken<RewardsService>('rewards-service');
