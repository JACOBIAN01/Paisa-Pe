import { useState } from 'react';
import type { Biller, BillerId, Paise } from '@pp/contracts-domain';
import { t } from '@pp/core-i18n';
import { AmountInput, Button, Input, Stack, Text } from '@pp/design-system';
import { isValidAccountRef } from '../state/bill-view';

export interface RechargeFormProps {
  billers: readonly Biller[];
  busy: boolean;
  onSubmit: (input: { billerId: BillerId; accountRef: string; amount: Paise }) => void;
}

export function RechargeForm({ billers, busy, onSubmit }: RechargeFormProps) {
  const [billerId, setBillerId] = useState<BillerId | undefined>(billers[0]?.id);
  const [account, setAccount] = useState('');
  const [amountText, setAmountText] = useState('');
  const [amount, setAmount] = useState<Paise | null>(null);

  const ready =
    billerId !== undefined && isValidAccountRef(account) && amount !== null && amount > 0;

  return (
    <Stack gap="md">
      <Text variant="heading">{t('bills.recharge')}</Text>
      <Stack direction="row" gap="sm">
        {billers.map((biller) => (
          <Button
            key={biller.id}
            title={biller.name}
            testID={`recharge-biller-${biller.id}`}
            variant={biller.id === billerId ? 'primary' : 'ghost'}
            onPress={() => setBillerId(biller.id)}
          />
        ))}
      </Stack>
      <Input
        label={t('bills.account')}
        value={account}
        onChangeText={setAccount}
        autoCapitalize="characters"
      />
      <AmountInput
        label={t('bills.rechargeAmount')}
        value={amountText}
        onChangeValue={(raw, parsed) => {
          setAmountText(raw);
          setAmount(parsed);
        }}
      />
      <Button
        title={t('bills.recharge')}
        testID="recharge-submit"
        disabled={!ready}
        loading={busy}
        onPress={() => {
          if (ready) onSubmit({ billerId, accountRef: account, amount });
        }}
      />
    </Stack>
  );
}
