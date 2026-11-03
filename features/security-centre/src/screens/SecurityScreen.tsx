import { useEffect, useState } from 'react';
import { Switch } from 'react-native';
import { Button, ErrorBanner, ListRow, Screen, Stack, Text, useToast } from '@pp/design-system';
import { t } from '@pp/core-i18n';
import { isBiometricAvailable } from '@pp/platform-biometrics';
import { lockStore } from '@pp/platform-lifecycle';
import { ChangePinSheet } from '../components/ChangePinSheet';
import { DeviceList } from '../components/DeviceList';
import { LockTimeoutPicker } from '../components/LockTimeoutPicker';
import { useDevices } from '../hooks/useDevices';
import { usePreferences } from '../hooks/usePreferences';

export function SecurityScreen() {
  const { devices, error: deviceError, revoke } = useDevices();
  const { prefs, error: prefsError, update } = usePreferences();
  const toast = useToast();
  const [biometricsSupported, setBiometricsSupported] = useState(false);
  const [changingPin, setChangingPin] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void isBiometricAvailable().then((ok) => {
      if (!cancelled) setBiometricsSupported(ok);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const error = deviceError ?? prefsError;

  return (
    <Screen scroll testID="security-screen">
      <Stack gap="lg">
        <Text variant="title">{t('security.title')}</Text>
        {error ? <ErrorBanner message={error} /> : null}
        <ListRow
          title={t('auth.useBiometrics')}
          subtitle={
            biometricsSupported
              ? 'Unlock with your fingerprint or face'
              : 'Not available on this device'
          }
          right={
            <Switch
              testID="biometrics-switch"
              accessibilityLabel={t('auth.useBiometrics')}
              disabled={!biometricsSupported || !prefs}
              value={Boolean(prefs?.biometricsEnabled && biometricsSupported)}
              onValueChange={(value) => void update('biometricsEnabled', value)}
            />
          }
        />
        <LockTimeoutPicker
          value={prefs?.lockTimeoutSec}
          onChange={(s) => void update('lockTimeoutSec', s)}
        />
        <ListRow title="Change PIN" onPress={() => setChangingPin(true)} testID="change-pin-row" />
        <DeviceList devices={devices} onRevoke={revoke} />
        <Button
          variant="secondary"
          title={t('security.lockNow')}
          onPress={() => lockStore.getState().lock('manual')}
        />
      </Stack>
      <ChangePinSheet
        visible={changingPin}
        onClose={() => setChangingPin(false)}
        onChanged={() => {
          setChangingPin(false);
          toast.show('Your PIN was updated', 'success');
        }}
      />
    </Screen>
  );
}
