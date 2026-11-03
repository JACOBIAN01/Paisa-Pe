import type { Clock } from '@pp/core-time';
import type { AppStateObserver, AppStateStatus } from './app-state';
import type { LockStore } from './lock-store';

export interface LockControllerDeps {
  observer: AppStateObserver;
  lockStore: LockStore;
  getTimeoutMs: () => number;
  clock: Clock;
}

export interface LockController {
  dispose(): void;
}

/**
 * Locks when the app returns from the background after the configured timeout.
 * Only a real background/active pair counts; `inactive` (system dialogs, biometric
 * prompt, share sheet) neither starts nor resets the timer.
 */
export function createLockController(deps: LockControllerDeps): LockController {
  const { observer, lockStore, getTimeoutMs, clock } = deps;
  let backgroundedAt: number | null = null;

  const onChange = (state: AppStateStatus): void => {
    if (state === 'background') {
      if (backgroundedAt === null) backgroundedAt = clock.monotonic();
      if (getTimeoutMs() === 0) lockStore.getState().lock('timeout');
      return;
    }
    if (state === 'active' && backgroundedAt !== null) {
      const elapsed = clock.monotonic() - backgroundedAt;
      backgroundedAt = null;
      if (elapsed >= getTimeoutMs()) lockStore.getState().lock('timeout');
    }
  };

  if (observer.current() === 'background') backgroundedAt = clock.monotonic();
  const unsubscribe = observer.subscribe(onChange);

  return {
    dispose() {
      unsubscribe();
      backgroundedAt = null;
    },
  };
}
