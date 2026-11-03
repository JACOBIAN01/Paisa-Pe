import { View, type ViewProps } from 'react-native';
import { spacing, type SpacingKey } from '../tokens/layout';

export interface StackProps extends ViewProps {
  direction?: 'row' | 'column';
  gap?: SpacingKey;
  align?: 'flex-start' | 'center' | 'flex-end' | 'stretch';
  justify?: 'flex-start' | 'center' | 'flex-end' | 'space-between';
}

export function Stack({
  direction = 'column',
  gap = 'md',
  align,
  justify,
  style,
  ...rest
}: StackProps) {
  return (
    <View
      {...rest}
      style={[
        { flexDirection: direction, gap: spacing[gap], alignItems: align, justifyContent: justify },
        style,
      ]}
    />
  );
}
