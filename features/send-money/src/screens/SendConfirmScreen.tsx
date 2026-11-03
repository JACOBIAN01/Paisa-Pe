import { useMemo } from 'react';
import { useRouter } from 'expo-router';
import { t } from '@pp/core-i18n';
import { formatPaise } from '@pp/core-money';
import { Button, Card, ErrorBanner, Screen, Stack, Text } from '@pp/design-system';
import { Receipt } from '../components/Receipt';
import { copy } from '../copy';
import { useContacts } from '../hooks/useContacts';
import { usePayment } from '../hooks/usePayment';
import { useTransferParams } from '../hooks/useTransferParams';
import { failureMessageKey } from '../state/outcome';

export function SendConfirmScreen() {
  const router = useRouter();
  const parsed = useTransferParams();
  const params = parsed.ok ? parsed.value : null;
  const { contacts } = useContacts();
  const payment = usePayment(params);

  const recipientName = useMemo(
    () => contacts.find((c) => c.phone === params?.to)?.name ?? params?.to ?? '',
    [contacts, params],
  );

  if (!params) {
    return (
      <Screen testID="send-confirm-invalid">
        <Stack gap="md">
          <ErrorBanner message={copy.invalidLink} />
          <Button title={t('common.back')} variant="secondary" onPress={() => router.back()} />
        </Stack>
      </Screen>
    );
  }

  const { state } = payment;

  if (state.phase === 'sent') {
    return (
      <Screen testID="send-success">
        <Stack gap="md">
          <Receipt txn={state.txn} recipientName={recipientName} />
          <Button
            title={copy.backHome}
            onPress={() => router.replace('/home')}
            testID="done-button"
          />
        </Stack>
      </Screen>
    );
  }

  const amountLabel = formatPaise(params.amount);
  const waiting = state.phase === 'queued' || state.phase === 'unknown';

  return (
    <Screen testID="send-confirm">
      <Stack gap="md">
        <Text variant="title" accessibilityRole="header">
          {t('send.confirmTitle')}
        </Text>
        <Card>
          <Stack gap="sm">
            <Text variant="caption" color="textMuted">
              {t('send.to')}
            </Text>
            <Text variant="heading" testID="confirm-recipient">
              {recipientName}
            </Text>
            <Text variant="display" testID="confirm-amount">
              {amountLabel}
            </Text>
            {params.note ? (
              <Text variant="caption" color="textMuted" testID="confirm-note">
                {params.note}
              </Text>
            ) : null}
          </Stack>
        </Card>

        {state.phase === 'failed' ? (
          <ErrorBanner message={t(failureMessageKey(state.code))} />
        ) : null}
        {state.phase === 'queued' ? <ErrorBanner message={copy.queued} /> : null}
        {state.phase === 'unknown' ? (
          <Text accessibilityRole="alert" testID="processing-note">
            {copy.unknown}
          </Text>
        ) : null}

        <Button
          testID="pay-button"
          title={
            payment.busy
              ? t('send.paying')
              : waiting
                ? copy.checkStatus
                : state.phase === 'failed'
                  ? copy.tryAgain
                  : t('send.pay', { amount: amountLabel })
          }
          loading={payment.busy}
          disabled={payment.busy}
          onPress={payment.pay}
        />
        {payment.busy || waiting ? null : (
          <Button title={t('common.cancel')} variant="ghost" onPress={() => router.back()} />
        )}
      </Stack>
    </Screen>
  );
}
