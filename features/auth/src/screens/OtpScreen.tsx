import { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Button, ErrorBanner, OtpInput, Screen, Stack, Text } from '@pp/design-system';
import { t } from '@pp/core-i18n';
import { useService } from '@pp/core-di';
import { appAnalytics } from '@pp/core-analytics';
import { useClipboardOtp } from '@pp/platform-clipboard-otp';
import { AUTH_SERVICE, PIN_SERVICE } from '@pp/svc-auth';
import { useCountdown } from '../hooks/useCountdown';
import { maskPhone } from '../state/phone';
import { messageFor } from '../state/errors';

const first = (value: string | string[] | undefined): string =>
  (Array.isArray(value) ? value[0] : value) ?? '';

export function OtpScreen() {
  const params = useLocalSearchParams<{
    otpId?: string;
    phone?: string;
    resendAfterSec?: string;
  }>();
  const auth = useService(AUTH_SERVICE);
  const pins = useService(PIN_SERVICE);
  const router = useRouter();
  const phone = first(params.phone);
  const [otpId, setOtpId] = useState(first(params.otpId));
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seconds, restart] = useCountdown(Number(first(params.resendAfterSec)) || 30);

  // The clipboard hint only fills the field; the user still confirms with Verify.
  useClipboardOtp({ onOtp: setCode, enabled: !busy });

  const verify = async (): Promise<void> => {
    if (code.length !== 6 || busy) return;
    setBusy(true);
    setError(null);
    try {
      const { user, isNewUser } = await auth.verifyOtp(otpId, code);
      appAnalytics.track('login_succeeded', { method: 'otp' });
      const hasPin = !isNewUser && (await pins.isPinSet(user.id));
      router.replace(hasPin ? '/home' : '/pin-setup');
    } catch (e) {
      setError(messageFor(e));
      setCode('');
    } finally {
      setBusy(false);
    }
  };

  const resend = async (): Promise<void> => {
    setError(null);
    try {
      const challenge = await auth.requestOtp(phone);
      setOtpId(challenge.otpId);
      setCode('');
      restart(challenge.resendAfterSec);
    } catch (e) {
      setError(messageFor(e));
    }
  };

  return (
    <Screen testID="otp-screen">
      <Stack gap="lg" style={{ flex: 1, justifyContent: 'center' }}>
        <Text variant="title">{t('auth.enterOtp')}</Text>
        <Text color="textMuted">{t('auth.otpSent', { phone: maskPhone(phone) })}</Text>
        <OtpInput value={code} onChange={setCode} autoFocus />
        {error ? <ErrorBanner message={error} /> : null}
        <Button
          testID="otp-verify"
          title={t('auth.verify')}
          onPress={() => void verify()}
          disabled={code.length !== 6}
          loading={busy}
        />
        <Button
          testID="otp-resend"
          variant="ghost"
          title={seconds > 0 ? t('auth.resendIn', { seconds }) : t('auth.resend')}
          disabled={seconds > 0}
          onPress={() => void resend()}
        />
      </Stack>
    </Screen>
  );
}
