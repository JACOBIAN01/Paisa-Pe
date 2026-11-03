import { createContext, useContext, type ReactNode } from 'react';
import type { Container, Token } from './container';

const ContainerContext = createContext<Container | null>(null);

export interface ContainerProviderProps {
  container: Container;
  children?: ReactNode;
}

export function ContainerProvider({ container, children }: ContainerProviderProps) {
  return <ContainerContext.Provider value={container}>{children}</ContainerContext.Provider>;
}

export function useContainer(): Container {
  const container = useContext(ContainerContext);
  if (!container) throw new Error('useContainer must be used inside a ContainerProvider');
  return container;
}

export function useService<T>(token: Token<T>): T {
  const container = useContainer();
  if (!container.has(token)) throw new Error(`No provider for token: ${token.name}`);
  return container.resolve(token);
}
