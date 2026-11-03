import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useTheme } from '../theme';
import { spacing } from '../tokens/layout';

export interface ScreenProps {
  children: ReactNode;
  scroll?: boolean;
  testID?: string;
}

export function Screen({ children, scroll = false, testID }: ScreenProps) {
  const { colors } = useTheme();
  const base = { backgroundColor: colors.background };
  if (scroll) {
    return (
      <ScrollView testID={testID} style={base} contentContainerStyle={styles.content}>
        {children}
      </ScrollView>
    );
  }
  return (
    <View testID={testID} style={[styles.fill, styles.content, base]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.lg },
});
