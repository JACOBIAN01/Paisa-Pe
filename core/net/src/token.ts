import { createToken } from '@pp/core-di';
import type { HttpClient } from './client';

export const HTTP_CLIENT = createToken<HttpClient>('http-client');
