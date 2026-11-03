import { Text } from '@pp/design-system';
import { t } from '@pp/core-i18n';
import { useCountdown } from '../hooks/useCountdown';

/** Shows how long the PIN stays locked. Remount with a new `key` to restart. */
export function LockoutNotice({ seconds }: { seconds: number }) {
  const [remaining] = useCountdown(seconds);
  return (
    <Text color="danger" accessibilityLiveRegion="polite" testID="lockout-notice">
      {remaining > 0 ? t('auth.lockedOut', { seconds: remaining }) : t('auth.enterPin')}
    </Text>
  );
}
