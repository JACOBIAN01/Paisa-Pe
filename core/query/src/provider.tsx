import { createContext, createElement, useContext, type ReactNode } from 'react';
import type { QueryClient } from './client';

const QueryClientContext = createContext<QueryClient | null>(null);

export interface QueryClientProviderProps {
  client: QueryClient;
  children?: ReactNode;
}

export function QueryClientProvider({ client, children }: QueryClientProviderProps) {
  return createElement(QueryClientContext.Provider, { value: client }, children);
}

export function useQueryClient(): QueryClient {
  const client = useContext(QueryClientContext);
  if (!client) throw new Error('useQueryClient must be used inside a QueryClientProvider');
  return client;
}
