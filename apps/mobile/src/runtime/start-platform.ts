import type { RouteName } from '@pp/contracts-domain';
import { appBus } from '@pp/core-event-bus';
import { systemClock } from '@pp/core-time';
import { createDeepLinkRouter, type DeepLinkRouter } from '@pp/platform-deeplink';
import {
  appStateObserver,
  createLockController,
  lockStore,
  type LockController,
} from '@pp/platform-lifecycle';
import type { AppRuntime } from './create-runtime';

export const DEFAULT_LOCK_TIMEOUT_MS = 60_000;

export interface PlatformHandle {
  deepLinks: DeepLinkRouter;
  dispose(): void;
}

export interface StartPlatformOptions {
  navigate(route: RouteName, params: Record<string, string>): void;
}

/**
 * Starts the long-lived platform pieces: connectivity probing, the app-lock timer
 * and the deep-link router. Notification taps are wired by `useNotificationTaps`
 * in the root layout because they need React.
 */
export function startPlatform(runtime: AppRuntime, options: StartPlatformOptions): PlatformHandle {
  let timeoutMs = DEFAULT_LOCK_TIMEOUT_MS;
  const refreshTimeout = (): void => {
    void runtime.readPreferences().then((prefs) => {
      if (prefs) timeoutMs = prefs.lockTimeoutSec * 1000;
    });
  };
  refreshTimeout();
  const offProfile = appBus.on('profile.changed', refreshTimeout);
  const offSession = appBus.on('auth.sessionStarted', refreshTimeout);

  const lockController: LockController = createLockController({
    observer: appStateObserver,
    lockStore,
    getTimeoutMs: () => timeoutMs,
    clock: systemClock,
  });

  const deepLinks = createDeepLinkRouter({
    navigate: options.navigate,
    isReady: () => lockStore.getState().hydrated,
    isLocked: () => lockStore.getState().isLocked,
    subscribeUnlock(onChange) {
      const offStore = lockStore.subscribe(onChange);
      const offHydrated = lockStore.onRehydrated(onChange);
      return () => {
        offStore();
        offHydrated();
      };
    },
  });
  void deepLinks.start();
  runtime.connectivity.start();

  return {
    deepLinks,
    dispose() {
      offProfile();
      offSession();
      deepLinks.dispose();
      lockController.dispose();
      runtime.connectivity.stop();
    },
  };
}
