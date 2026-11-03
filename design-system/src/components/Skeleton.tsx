import { View, type DimensionValue } from 'react-native';
import { useTheme } from '../theme';
import { radii } from '../tokens/layout';

export interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
}

export function Skeleton({ width = '100%', height = 16 }: SkeletonProps) {
  const { colors } = useTheme();
  return (
    <View
      accessibilityLabel="Loading content"
      style={{ width, height, borderRadius: radii.sm, backgroundColor: colors.surfaceAlt }}
    />
  );
}
