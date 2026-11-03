import { StyleSheet, View } from 'react-native';
import type { Card } from '@pp/contracts-domain';
import { t } from '@pp/core-i18n';
import { Badge, Text, useTheme } from '@pp/design-system';
import { maskedPan, NETWORK_LABEL } from '../state/card-format';

export interface CardFaceProps {
  card: Card;
  pan?: string;
}

export function CardFace({ card, pan }: CardFaceProps) {
  const { colors } = useTheme();
  const frozen = card.status === 'frozen';
  return (
    <View
      testID={`card-face-${card.id}`}
      accessibilityLabel={`${NETWORK_LABEL[card.network]} ${maskedPan(card.last4)}`}
      style={[
        styles.face,
        { backgroundColor: frozen ? colors.surfaceAlt : colors.primary, opacity: frozen ? 0.7 : 1 },
      ]}
    >
      <View style={styles.row}>
        <Text variant="heading" color={frozen ? 'text' : 'textInverse'}>
          {NETWORK_LABEL[card.network]}
        </Text>
        {frozen ? <Badge label={t('cards.frozen')} tone="warning" /> : null}
      </View>
      <Text variant="mono" color={frozen ? 'text' : 'textInverse'} testID="card-pan">
        {pan ?? maskedPan(card.last4)}
      </Text>
      <View style={styles.row}>
        <Text variant="caption" color={frozen ? 'text' : 'textInverse'}>
          {card.holder}
        </Text>
        <Text variant="caption" color={frozen ? 'text' : 'textInverse'}>
          {t('cards.expiry')} {card.expiry}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  face: { borderRadius: 20, padding: 20, gap: 24, minHeight: 180, justifyContent: 'space-between' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
