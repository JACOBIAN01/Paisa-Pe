import { createToken } from '@pp/core-di';
import type { GoalsService } from './service';

export const GOALS_SERVICE = createToken<GoalsService>('goals-service');
