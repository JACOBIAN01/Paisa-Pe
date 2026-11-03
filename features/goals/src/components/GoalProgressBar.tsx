import { StyleSheet, View } from 'react-native';
import { useTheme } from '@pp/design-system';

export interface GoalProgressBarProps {
  /** 0..10_000 basis points. */
  bps: number;
}

export function GoalProgressBar({ bps }: GoalProgressBarProps) {
  const { colors } = useTheme();
  const percent = Math.min(100, Math.max(0, bps / 100));
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(percent) }}
      style={[styles.track, { backgroundColor: colors.surfaceAlt }]}
    >
      <View style={[styles.fill, { width: `${percent}%`, backgroundColor: colors.success }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { height: 8, borderRadius: 4, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4 },
});
