import { t } from '@pp/core-i18n';
import { Card, EmptyState, Stack, Text } from '@pp/design-system';
import { FAQ } from '../state/help-content';

export function FaqList({ offline }: { offline: boolean }) {
  return (
    <Stack gap="md" testID="help-faq">
      {offline ? (
        <EmptyState title={t('help.offlineTitle')} message={t('help.offlineMessage')} />
      ) : null}
      <Text variant="heading">{t('help.faq.title')}</Text>
      {FAQ.map((item) => (
        <Card key={item.id}>
          <Text variant="body" accessibilityRole="header">
            {t(item.question)}
          </Text>
          <Text variant="caption" color="textMuted">
            {t(item.answer)}
          </Text>
        </Card>
      ))}
    </Stack>
  );
}
