import { StyleSheet, View } from 'react-native';
import { Badge, Card, Stack, Text, useTheme } from '@pp/design-system';
import type { KycTier } from '@pp/contracts-domain';
import { TIERS, tierIndex } from '../state/tiers';

export function TierProgress({ tier }: { tier: KycTier }) {
  const { colors } = useTheme();
  const reached = tierIndex(tier);
  return (
    <Stack gap="sm" testID="tier-progress">
      {TIERS.map((entry, index) => (
        <Card key={entry.tier}>
          <Stack direction="row" gap="md" align="center">
            <View
              style={[
                styles.marker,
                { backgroundColor: index <= reached ? colors.success : colors.border },
              ]}
            />
            <Stack gap="xs" style={{ flex: 1 }}>
              <Text variant="heading">{entry.title}</Text>
              <Text variant="caption" color="textMuted">
                {entry.perks}
              </Text>
            </Stack>
            {index === reached ? <Badge label="Current" tone="success" /> : null}
          </Stack>
        </Card>
      ))}
    </Stack>
  );
}

const styles = StyleSheet.create({ marker: { width: 12, height: 12, borderRadius: 6 } });
