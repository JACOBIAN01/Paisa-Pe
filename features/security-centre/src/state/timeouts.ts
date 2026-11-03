import type { MessageKey } from '@pp/core-i18n';
import type { Preferences } from '@pp/contracts-domain';

export const TIMEOUT_OPTIONS: ReadonlyArray<{
  seconds: Preferences['lockTimeoutSec'];
  label: MessageKey;
}> = [
  { seconds: 0, label: 'security.timeout.immediate' },
  { seconds: 30, label: 'security.timeout.30s' },
  { seconds: 60, label: 'security.timeout.1m' },
  { seconds: 300, label: 'security.timeout.5m' },
];
