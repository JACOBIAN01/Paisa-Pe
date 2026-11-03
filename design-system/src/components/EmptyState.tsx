import { StyleSheet, View } from 'react-native';
import { spacing } from '../tokens/layout';
import { Button } from '../primitives/Button';
import { Text } from '../primitives/Text';

export interface EmptyStateProps {
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ title, message, actionLabel, onAction }: EmptyStateProps) {
  return (
    <View style={styles.wrap} testID="empty-state">
      <Text variant="heading">{title}</Text>
      {message ? (
        <Text variant="body" color="textMuted">
          {message}
        </Text>
      ) : null}
      {actionLabel && onAction ? <Button title={actionLabel} onPress={onAction} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: spacing.md, padding: spacing.xxl },
});
