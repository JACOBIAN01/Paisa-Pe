import { createToken } from '@pp/core-di';
import type { CardsService } from './types';

export const CARDS_SERVICE = createToken<CardsService>('cards-service');
