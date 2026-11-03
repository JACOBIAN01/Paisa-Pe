import { StyleSheet } from 'react-native';
import { Stack, Text } from '@pp/design-system';
import type { Slide } from '../state/slides';

export function SlideView({ slide }: { slide: Slide }) {
  return (
    <Stack gap="md" align="center" style={styles.slide} testID={`slide-${slide.id}`}>
      <Text variant="display" accessibilityElementsHidden>
        {slide.glyph}
      </Text>
      <Text variant="title" style={styles.centered}>
        {slide.title}
      </Text>
      <Text color="textMuted" style={styles.centered}>
        {slide.body}
      </Text>
    </Stack>
  );
}

const styles = StyleSheet.create({
  slide: { paddingVertical: 32, paddingHorizontal: 16 },
  centered: { textAlign: 'center' },
});
