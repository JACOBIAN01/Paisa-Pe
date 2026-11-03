import { StyleSheet, View } from 'react-native';
import { Text, useTheme } from '@pp/design-system';
import { useT } from '../hooks/useT';

export function OfflineBanner() {
  const t = useT();
  const { colors } = useTheme();
  return (
    <View
      accessibilityRole="alert"
      testID="offline-banner"
      style={[styles.banner, { backgroundColor: colors.surfaceAlt }]}
    >
      <Text variant="caption" color="warning">
        {t('home.offline')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({ banner: { padding: 10, borderRadius: 8 } });
