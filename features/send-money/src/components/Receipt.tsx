import type { Txn } from '@pp/contracts-domain';
import { formatPaise } from '@pp/core-money';
import { t } from '@pp/core-i18n';
import { Card, Stack, Text } from '@pp/design-system';
import { copy } from '../copy';

export interface ReceiptProps {
  txn: Txn;
  recipientName: string;
}

export function Receipt({ txn, recipientName }: ReceiptProps) {
  return (
    <Card>
      <Stack gap="sm">
        <Text variant="heading" accessibilityRole="header">
          {copy.receiptTitle}
        </Text>
        <Text testID="receipt-summary">
          {t('send.success', { amount: formatPaise(txn.amount), name: recipientName })}
        </Text>
        {txn.fee > 0 ? (
          <Text variant="caption" color="textMuted">
            {copy.fee}: {formatPaise(txn.fee)}
          </Text>
        ) : null}
        {txn.note ? (
          <Text variant="caption" color="textMuted">
            {copy.note}: {txn.note}
          </Text>
        ) : null}
        <Text variant="caption" color="textMuted">
          {copy.reference}: {txn.id}
        </Text>
      </Stack>
    </Card>
  );
}
