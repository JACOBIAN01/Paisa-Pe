import { StyleSheet, View } from 'react-native';
import { useTheme } from '@pp/design-system';

export interface ScratchProgressProps {
  /** A CSS-style percentage such as "60%". Display only. */
  percent: string;
}

export function ScratchProgress({ percent }: ScratchProgressProps) {
  const { colors } = useTheme();
  const width = Math.min(100, Math.max(0, parseFloat(percent) || 0));
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: width }}
      style={[styles.track, { backgroundColor: colors.surfaceAlt }]}
    >
      <View style={[styles.fill, { width: `${width}%`, backgroundColor: colors.primary }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { height: 8, borderRadius: 4, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4 },
});
