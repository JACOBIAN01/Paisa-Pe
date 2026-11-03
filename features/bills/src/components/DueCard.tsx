import { Switch } from 'react-native';
import type { BillDue } from '@pp/contracts-domain';
import { formatDate, getLanguage, t } from '@pp/core-i18n';
import { formatPaise } from '@pp/core-money';
import { Button, Card, Divider, Stack, Text } from '@pp/design-system';
import type { BillTotal } from '@pp/svc-bills';
import { dueKey } from '../state/bill-view';

export interface DueCardProps {
  due: BillDue;
  billerName: string;
  total: BillTotal;
  autopay: boolean;
  onPay: (due: BillDue) => void;
  onToggleAutopay: (due: BillDue, enabled: boolean) => void;
}

export function DueCard({ due, billerName, total, autopay, onPay, onToggleAutopay }: DueCardProps) {
  const key = dueKey(due);
  return (
    <Card>
      <Stack gap="sm" testID={`due-${key}`}>
        <Text variant="heading">{billerName}</Text>
        <Text variant="caption" color="textMuted">
          {due.accountRef} · {t('bills.dueOn', { date: formatDate(due.dueAt, getLanguage()) })}
        </Text>
        <Divider />
        {total.lines.map((line) => (
          <Stack key={line.label} direction="row" justify="space-between">
            <Text>{line.label}</Text>
            <Text>{formatPaise(line.amount)}</Text>
          </Stack>
        ))}
        <Stack direction="row" justify="space-between">
          <Text color="textMuted">{t('bills.fee')}</Text>
          <Text color="textMuted">{formatPaise(total.fee)}</Text>
        </Stack>
        <Stack direction="row" justify="space-between">
          <Text variant="heading">{t('bills.total')}</Text>
          <Text variant="heading" testID={`due-total-${key}`}>
            {formatPaise(total.total)}
          </Text>
        </Stack>
        <Stack direction="row" justify="space-between" align="center">
          <Text>{t('bills.autopay')}</Text>
          <Switch
            testID={`autopay-${key}`}
            accessibilityLabel={`${t('bills.autopay')} ${billerName}`}
            value={autopay}
            onValueChange={(next) => onToggleAutopay(due, next)}
          />
        </Stack>
        <Button title={t('bills.pay')} testID={`pay-${key}`} onPress={() => onPay(due)} />
      </Stack>
    </Card>
  );
}
