import { useEffect, useState } from 'react';
import { appFlags, type AppFlagValues } from '@pp/core-flags';

export function useFlagSnapshot(): AppFlagValues {
  const [snapshot, setSnapshot] = useState<AppFlagValues>(() => appFlags.snapshot());
  useEffect(() => {
    setSnapshot(appFlags.snapshot());
    return appFlags.subscribe(() => setSnapshot(appFlags.snapshot()));
  }, []);
  return snapshot;
}
