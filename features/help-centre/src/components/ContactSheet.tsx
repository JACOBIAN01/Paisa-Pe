import { t } from '@pp/core-i18n';
import { Button, Sheet, Stack, Text } from '@pp/design-system';
import { SUPPORT_TOPICS, type SupportTopic } from '../state/help-content';

interface Props {
  visible: boolean;
  initialTopic: SupportTopic | null;
  onSelect(topic: SupportTopic): void;
  onClose(): void;
}

export function ContactSheet({ visible, initialTopic, onSelect, onClose }: Props) {
  return (
    <Sheet visible={visible} onClose={onClose} title={t('help.contact')}>
      <Stack gap="sm">
        <Text variant="body">{t('help.contact.title')}</Text>
        {SUPPORT_TOPICS.map(({ topic, label }) => (
          <Button
            key={topic}
            testID={`support-topic-${topic}`}
            title={t(label)}
            variant={topic === initialTopic ? 'primary' : 'secondary'}
            onPress={() => onSelect(topic)}
          />
        ))}
      </Stack>
    </Sheet>
  );
}
