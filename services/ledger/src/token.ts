import { createToken } from '@pp/core-di';
import type { Ledger } from './types';

export const LEDGER = createToken<Ledger>('ledger');
