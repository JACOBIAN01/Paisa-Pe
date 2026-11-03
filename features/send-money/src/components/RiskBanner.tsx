import { View } from 'react-native';
import type { RiskPrompt } from '@pp/contracts-domain';
import { Badge, Text } from '@pp/design-system';

export function RiskBanner({ prompts }: { prompts: RiskPrompt[] }) {
  if (prompts.length === 0) return null;
  return (
    <View accessibilityRole="alert" style={{ gap: 8 }} testID="risk-banner">
      {prompts.map((prompt) => (
        <View key={`${prompt.kind}-${prompt.message}`} style={{ gap: 4 }}>
          <Badge
            label={prompt.severity === 'block' ? 'Not allowed' : 'Heads up'}
            tone={prompt.severity === 'block' ? 'danger' : 'warning'}
          />
          <Text variant="caption">{prompt.message}</Text>
        </View>
      ))}
    </View>
  );
}
