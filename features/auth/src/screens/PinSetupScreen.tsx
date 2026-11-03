import { useState } from 'react';
import { useRouter } from 'expo-router';
import { ErrorBanner, PinPad, Screen, Stack, Text } from '@pp/design-system';
import { t } from '@pp/core-i18n';
import { useService } from '@pp/core-di';
import { lockStore } from '@pp/platform-lifecycle';
import { PIN_SERVICE, useAuthState } from '@pp/svc-auth';
import { messageFor } from '../state/errors';

export function PinSetupScreen() {
  const pins = useService(PIN_SERVICE);
  const { activeUserId } = useAuthState();
  const router = useRouter();
  const [firstEntry, setFirstEntry] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleComplete = async (pin: string): Promise<void> => {
    if (firstEntry === null) {
      setFirstEntry(pin);
      setError(null);
      return;
    }
    if (pin !== firstEntry) {
      setFirstEntry(null);
      setError(t('auth.pinMismatch'));
      return;
    }
    if (!activeUserId) return;
    setBusy(true);
    try {
      await pins.setPin(activeUserId, pin);
      lockStore.getState().setPinSet(true);
      lockStore.getState().unlock('pin');
      router.replace('/home');
    } catch (e) {
      setFirstEntry(null);
      setError(messageFor(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen testID="pin-setup-screen">
      <Stack gap="lg" align="center" style={{ flex: 1, justifyContent: 'center' }}>
        <Text variant="title">{firstEntry === null ? t('auth.setPin') : t('auth.confirmPin')}</Text>
        <Text color="textMuted" style={{ textAlign: 'center' }}>
          You will use this PIN to unlock the app and approve payments.
        </Text>
        {error ? <ErrorBanner message={error} /> : null}
        <PinPad onComplete={(pin) => void handleComplete(pin)} disabled={busy} />
      </Stack>
    </Screen>
  );
}
