import { StyleSheet, View } from 'react-native';
import { useTheme } from '../theme';
import { radii, spacing } from '../tokens/layout';
import { Button } from '../primitives/Button';
import { Text } from '../primitives/Text';

export interface ErrorBannerProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorBanner({ message, onRetry }: ErrorBannerProps) {
  const { colors } = useTheme();
  return (
    <View
      accessibilityRole="alert"
      style={[styles.wrap, { borderColor: colors.danger, backgroundColor: colors.surface }]}
    >
      <Text variant="body" color="danger" style={styles.message}>
        {message}
      </Text>
      {onRetry ? <Button title="Retry" variant="ghost" onPress={onRetry} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  message: { flex: 1 },
});
