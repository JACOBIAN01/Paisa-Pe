import { Card, ErrorBanner, Skeleton, Stack, Text } from '@pp/design-system';
import { copy } from '../copy';
import { useMyPayload } from '../hooks/useMyPayload';

export function MyQrPanel() {
  const { payload, name, failed } = useMyPayload();
  if (failed) return <ErrorBanner message={copy.profileFailed} />;
  if (!payload) return <Skeleton height={120} />;
  return (
    <Card>
      <Stack gap="sm">
        <Text variant="heading" accessibilityRole="header">
          {copy.myQrTitle}
        </Text>
        <Text>{name}</Text>
        <Text variant="mono" testID="my-qr-payload" selectable>
          {payload}
        </Text>
        <Text variant="caption" color="textMuted">
          {copy.myQrHint}
        </Text>
      </Stack>
    </Card>
  );
}
