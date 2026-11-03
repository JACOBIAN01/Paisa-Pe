import { useSyncExternalStore } from 'react';
import { appStateObserver, type AppStateObserver } from './app-state';

/** True whenever the app is not fully active: covers iOS `inactive` and Android task switching. */
export function usePrivacyShield(observer: AppStateObserver = appStateObserver): boolean {
  return useSyncExternalStore(
    (onChange) => observer.subscribe(onChange),
    () => observer.current() !== 'active',
  );
}
