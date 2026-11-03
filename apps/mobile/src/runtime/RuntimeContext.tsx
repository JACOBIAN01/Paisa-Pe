import { createContext, useContext, type ReactNode } from 'react';
import type { AppRuntime } from './create-runtime';

const RuntimeContext = createContext<AppRuntime | null>(null);

export function RuntimeProvider({
  runtime,
  children,
}: {
  runtime: AppRuntime;
  children: ReactNode;
}) {
  return <RuntimeContext.Provider value={runtime}>{children}</RuntimeContext.Provider>;
}

export function useRuntime(): AppRuntime {
  const runtime = useContext(RuntimeContext);
  if (!runtime) throw new Error('useRuntime must be used inside RuntimeProvider');
  return runtime;
}
