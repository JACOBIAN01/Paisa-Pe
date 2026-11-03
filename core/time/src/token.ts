import { createToken } from '@pp/core-di';
import type { Clock } from './clock';

export const CLOCK = createToken<Clock>('clock');
