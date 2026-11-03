import { resetFlags } from '@pp/core-flags';
import { appBus } from '@pp/core-event-bus';
import { setLanguage } from '@pp/core-i18n';
import { resetSink } from '@pp/core-logging';
import { resetClock } from '@pp/core-time';
import { lockStore } from '@pp/platform-lifecycle';
import { resetStorageBackend } from '@pp/core-storage';

/**
 * Puts every process-wide singleton back to a known state. Call from `beforeEach`
 * (renderWithApp and createTestApp call it for you).
 */
export function resetTestEnvironment(): void {
  appBus.clear();
  resetFlags();
  setLanguage('en');
  resetSink();
  resetClock();
  resetStorageBackend();
  lockStore.setState({ isLocked: false, pinSet: false, hydrated: true });
}
