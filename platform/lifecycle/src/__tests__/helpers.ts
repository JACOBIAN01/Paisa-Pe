import type { Clock } from '@pp/core-time';
import type {
  AppStateAdapter,
  AppStateListener,
  AppStateStatus,
  AppStateSubscription,
} from '../app-state';

export interface FakeAppState extends AppStateAdapter {
  set(state: AppStateStatus): void;
  listenerCount(): number;
}

export function createFakeAppState(initial: AppStateStatus = 'active'): FakeAppState {
  let state = initial;
  const listeners = new Set<AppStateListener>();
  return {
    get currentState() {
      return state;
    },
    addEventListener(_type, listener): AppStateSubscription {
      listeners.add(listener);
      return { remove: () => void listeners.delete(listener) };
    },
    set(next) {
      state = next;
      for (const l of [...listeners]) l(next);
    },
    listenerCount: () => listeners.size,
  };
}

export interface FakeClock extends Clock {
  advance(ms: number): void;
  jumpWall(ms: number): void;
}

export function createFakeClock(): FakeClock {
  let wall = 1_700_000_000_000;
  let mono = 1_000;
  return {
    now: () => wall,
    monotonic: () => mono,
    advance(ms) {
      wall += ms;
      mono += ms;
    },
    jumpWall(ms) {
      wall += ms;
    },
  };
}
