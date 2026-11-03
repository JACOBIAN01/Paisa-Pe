import { createContext, useContext, type ReactNode } from 'react';
import type { MemorySink } from '@pp/core-logging';

interface Matcher {
  endpoint?: string;
  method?: string;
  path?: string;
}

/** What the debug menu needs from the mock backend; the app passes the real chaos controls in. */
export interface ChaosHandle {
  setLatency(config: { uplinkMs?: number; downlinkMs?: number; jitterMs?: number }): void;
  failNext(matcher?: Matcher, count?: number): void;
  timeoutNext(matcher?: Matcher, count?: number): void;
  dropResponse(matcher?: Matcher, count?: number, mode?: 'error' | 'hang'): void;
  reset(): void;
}

export interface DebugTools {
  chaos?: ChaosHandle;
  logs?: MemorySink;
}

const DebugToolsContext = createContext<DebugTools | null>(null);

export function DebugToolsProvider({
  tools,
  children,
}: {
  tools: DebugTools;
  children: ReactNode;
}) {
  return <DebugToolsContext.Provider value={tools}>{children}</DebugToolsContext.Provider>;
}

/** Tools supplied by the host app, or null when none were provided. */
export const useDebugTools = (): DebugTools | null => useContext(DebugToolsContext);
