import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Button, ErrorBanner, Input, Screen, Stack, Text } from '@pp/design-system';
import { t } from '@pp/core-i18n';
import { useService } from '@pp/core-di';
import { AUTH_SERVICE } from '@pp/svc-auth';
import { isValidMobile, toDigits, toE164 } from '../state/phone';
import { messageFor } from '../state/errors';

export function LoginScreen() {
  const auth = useService(AUTH_SERVICE);
  const router = useRouter();
  const [digits, setDigits] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const valid = isValidMobile(digits);

  const submit = async (): Promise<void> => {
    if (!valid || busy) return;
    setBusy(true);
    setError(null);
    try {
      const phone = toE164(digits);
      const challenge = await auth.requestOtp(phone);
      router.push({
        pathname: '/otp',
        params: {
          otpId: challenge.otpId,
          phone,
          resendAfterSec: String(challenge.resendAfterSec),
        },
      });
    } catch (e) {
      setError(messageFor(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen testID="login-screen">
      <Stack gap="lg" style={{ flex: 1, justifyContent: 'center' }}>
        <Text variant="title">{t('auth.enterPhone')}</Text>
        <Text color="textMuted">We will text you a one-time code to confirm it is you.</Text>
        <Input
          label={t('auth.phoneLabel')}
          value={digits}
          onChangeText={(v) => setDigits(toDigits(v))}
          keyboardType="number-pad"
          maxLength={10}
          placeholder="98765 43210"
          testID="login-phone"
          error={
            digits.length === 10 && !valid ? 'Enter a valid 10-digit mobile number' : undefined
          }
        />
        {error ? <ErrorBanner message={error} /> : null}
        <Button
          testID="login-submit"
          title={t('auth.sendOtp')}
          onPress={() => void submit()}
          disabled={!valid}
          loading={busy}
        />
      </Stack>
    </Screen>
  );
}
