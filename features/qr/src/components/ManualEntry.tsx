import { useState } from 'react';
import { Button, ErrorBanner, Input, Stack, Text } from '@pp/design-system';
import { copy } from '../copy';

export interface ManualEntryProps {
  onSubmit: (code: string) => boolean;
}

export function ManualEntry({ onSubmit }: ManualEntryProps) {
  const [code, setCode] = useState('');
  const [rejected, setRejected] = useState(false);

  return (
    <Stack gap="md">
      <Text variant="caption" color="textMuted">
        {copy.cameraNote}
      </Text>
      <Input
        testID="qr-code-input"
        label={copy.codeLabel}
        value={code}
        placeholder={copy.codePlaceholder}
        autoCapitalize="none"
        autoCorrect={false}
        onChangeText={(text) => {
          setCode(text);
          setRejected(false);
        }}
      />
      {rejected ? <ErrorBanner message={copy.invalid} /> : null}
      <Button
        testID="qr-continue"
        title={copy.continue}
        disabled={code.trim() === ''}
        onPress={() => setRejected(!onSubmit(code.trim()))}
      />
    </Stack>
  );
}
