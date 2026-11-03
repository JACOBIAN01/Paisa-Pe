import { StyleSheet, View, type ViewProps } from 'react-native';
import { useTheme } from '../theme';
import { radii, spacing } from '../tokens/layout';

export function Card({ style, ...rest }: ViewProps) {
  const { colors } = useTheme();
  return (
    <View
      {...rest}
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, style]}
    />
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: radii.lg, padding: spacing.lg },
});
