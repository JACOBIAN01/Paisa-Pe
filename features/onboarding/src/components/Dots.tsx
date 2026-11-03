import { StyleSheet, View } from 'react-native';
import { Stack, useTheme } from '@pp/design-system';

export function Dots({ count, active }: { count: number; active: number }) {
  const { colors } = useTheme();
  return (
    <Stack
      direction="row"
      gap="sm"
      justify="center"
      accessibilityLabel={`Step ${active + 1} of ${count}`}
    >
      {Array.from({ length: count }, (_, index) => (
        <View
          key={index}
          style={[
            styles.dot,
            { backgroundColor: index === active ? colors.primary : colors.border },
          ]}
        />
      ))}
    </Stack>
  );
}

const styles = StyleSheet.create({ dot: { width: 8, height: 8, borderRadius: 4 } });
