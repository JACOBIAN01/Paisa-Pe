import { Button, ErrorBanner, PinPad, Screen, Stack, Text } from '@pp/design-system';
import { t } from '@pp/core-i18n';
import { useService } from '@pp/core-di';
import { AUTH_SERVICE, useAuthState } from '@pp/svc-auth';
import { useBiometricUnlock } from '../hooks/useBiometricUnlock';
import { usePinUnlock } from '../hooks/usePinUnlock';
import { LockoutNotice } from '../components/LockoutNotice';

/** Gate rendered by the app shell while the app is locked. It is not a pushed route. */
export function LockScreen() {
  const auth = useService(AUTH_SERVICE);
  const { activeUserId, accounts } = useAuthState();
  const pin = usePinUnlock(activeUserId);
  const biometric = useBiometricUnlock(activeUserId);
  const name = accounts.find((a) => a.userId === activeUserId)?.name;

  return (
    <Screen testID="lock-screen">
      <Stack gap="lg" align="center" style={{ flex: 1, justifyContent: 'center' }}>
        <Text variant="title">{t('auth.unlockTitle')}</Text>
        {name ? <Text color="textMuted">{t('home.greeting', { name })}</Text> : null}
        {pin.lockedSeconds > 0 ? (
          <LockoutNotice key={pin.lockedSeconds} seconds={pin.lockedSeconds} />
        ) : (
          <>
            <Text>{t('auth.enterPin')}</Text>
            {pin.wrong && pin.attemptsLeft !== null ? (
              <ErrorBanner message={t('auth.wrongPin', { remaining: pin.attemptsLeft })} />
            ) : null}
            <PinPad onComplete={(value) => void pin.submit(value)} disabled={pin.busy} />
          </>
        )}
        {biometric.available ? (
          <Button
            variant="secondary"
            title={t('auth.useBiometrics')}
            onPress={() => void biometric.prompt()}
          />
        ) : null}
        <Button variant="ghost" title={t('auth.logout')} onPress={() => void auth.logout()} />
      </Stack>
    </Screen>
  );
}
