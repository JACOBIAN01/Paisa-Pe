import { useSyncExternalStore } from 'react';
import { appConnectivity, type Connectivity } from './connectivity';

export function useIsOnline(connectivity: Connectivity = appConnectivity): boolean {
  return useSyncExternalStore(
    (onChange) => connectivity.subscribe(onChange),
    () => connectivity.isOnline(),
  );
}
