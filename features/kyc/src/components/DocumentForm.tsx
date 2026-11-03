import { useState } from 'react';
import { Button, Input, Stack, Text } from '@pp/design-system';
import { t } from '@pp/core-i18n';
import type { DocType } from '../hooks/useKyc';
import { isLast4 } from '../state/tiers';

interface Props {
  busy: boolean;
  onSubmit: (docType: DocType, last4: string) => void;
}

export function DocumentForm({ busy, onSubmit }: Props) {
  const [docType, setDocType] = useState<DocType>('aadhaar');
  const [last4, setLast4] = useState('');

  return (
    <Stack gap="md">
      <Text variant="heading">{t('kyc.docType')}</Text>
      <Stack direction="row" gap="sm">
        <Button
          title={t('kyc.aadhaar')}
          variant={docType === 'aadhaar' ? 'primary' : 'secondary'}
          onPress={() => setDocType('aadhaar')}
        />
        <Button
          title={t('kyc.pan')}
          variant={docType === 'pan' ? 'primary' : 'secondary'}
          onPress={() => setDocType('pan')}
        />
      </Stack>
      <Input
        label={t('kyc.last4')}
        value={last4}
        onChangeText={(v) => setLast4(v.replace(/\D/g, '').slice(0, 4))}
        keyboardType="number-pad"
        maxLength={4}
        testID="kyc-last4"
      />
      <Button
        testID="kyc-submit"
        title={t('kyc.submit')}
        disabled={!isLast4(last4)}
        loading={busy}
        onPress={() => onSubmit(docType, last4)}
      />
    </Stack>
  );
}
