import { Badge, Button, ErrorBanner, Screen, Skeleton, Stack, Text } from '@pp/design-system';
import { t } from '@pp/core-i18n';
import { DocumentForm } from '../components/DocumentForm';
import { TierProgress } from '../components/TierProgress';
import { useKyc } from '../hooks/useKyc';
import { TIERS, tierIndex } from '../state/tiers';

export function KycScreen() {
  const { status, error, busy, submit, refresh } = useKyc();
  const maxed = status ? tierIndex(status.tier) === TIERS.length - 1 : false;

  return (
    <Screen scroll testID="kyc-screen">
      <Stack gap="lg">
        <Text variant="title">{t('kyc.title')}</Text>
        <Text color="textMuted">{t('kyc.upgrade')}</Text>
        {error ? <ErrorBanner message={error} onRetry={() => void refresh()} /> : null}
        {status === null ? (
          <Skeleton height={160} />
        ) : (
          <>
            <TierProgress tier={status.tier} />
            {status.state === 'in_review' ? (
              <Stack gap="sm">
                <Badge label={t('kyc.inReview')} tone="warning" />
                <Text color="textMuted">
                  We are checking your document. This usually takes a minute.
                </Text>
                <Button title="Check status" variant="secondary" onPress={() => void refresh()} />
              </Stack>
            ) : maxed ? (
              <Badge label={t('kyc.approved')} tone="success" />
            ) : (
              <DocumentForm
                busy={busy}
                onSubmit={(docType, last4) => void submit(docType, last4)}
              />
            )}
          </>
        )}
      </Stack>
    </Screen>
  );
}
