import { View } from 'react-native';
import { formatPaise } from '@pp/core-money';
import type { Paise } from '@pp/contracts-domain';
import type { SplitMode } from '@pp/svc-requests';
import { t } from '@pp/core-i18n';
import { Avatar, Input, Text } from '@pp/design-system';
import { copy } from '../copy';

export interface ParticipantRowProps {
  refId: string;
  name: string;
  mode: SplitMode;
  value: string;
  share: Paise | null;
  onChangeValue: (refId: string, text: string) => void;
}

export function ParticipantRow({
  refId,
  name,
  mode,
  value,
  share,
  onChangeValue,
}: ParticipantRowProps) {
  return (
    <View testID={`participant-${refId}`} style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Avatar name={name} />
        <Text style={{ flex: 1 }}>{name}</Text>
        <Text testID={`share-${refId}`}>
          {share === null ? '–' : t('split.perPerson', { amount: formatPaise(share) })}
        </Text>
      </View>
      {mode === 'equal' ? null : (
        <Input
          testID={`split-value-${refId}`}
          label={(mode === 'custom' ? copy.amountFor : copy.percentFor).replace('{name}', name)}
          value={value}
          keyboardType="decimal-pad"
          onChangeText={(text) => onChangeValue(refId, text)}
        />
      )}
    </View>
  );
}
