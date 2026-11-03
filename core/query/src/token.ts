import { createToken } from '@pp/core-di';
import type { QueryClient } from './client';

export const QUERY_CLIENT = createToken<QueryClient>('query-client');
