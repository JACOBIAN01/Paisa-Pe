import { View } from 'react-native';
import type { MoneyRequest } from '@pp/contracts-domain';
import { t } from '@pp/core-i18n';
import { formatPaise } from '@pp/core-money';
import { Button, Sheet, Text } from '@pp/design-system';
import { copy } from '../copy';

export interface PaySheetProps {
  request: MoneyRequest | null;
  name: string;
  busy: boolean;
  onPay: (id: MoneyRequest['id']) => void;
  onClose: () => void;
}

export function PaySheet({ request, name, busy, onPay, onClose }: PaySheetProps) {
  return (
    <Sheet visible={request !== null} onClose={onClose} title={copy.payTitle}>
      {request ? (
        <View style={{ gap: 12 }}>
          <Text testID="pay-sheet-summary">
            {copy.payConfirm
              .replace('{amount}', formatPaise(request.amount))
              .replace('{name}', name)}
          </Text>
          {request.note ? (
            <Text variant="caption" color="textMuted">
              {request.note}
            </Text>
          ) : null}
          <Button
            testID="pay-sheet-confirm"
            title={busy ? t('send.paying') : t('send.pay', { amount: formatPaise(request.amount) })}
            loading={busy}
            disabled={busy}
            onPress={() => onPay(request.id)}
          />
          <Button title={t('common.cancel')} variant="ghost" onPress={onClose} />
        </View>
      ) : null}
    </Sheet>
  );
}
