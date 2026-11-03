import { useCallback, useState } from 'react';
import { useRouter } from 'expo-router';
import { Button, Screen, Stack, Text } from '@pp/design-system';
import { ManualEntry } from '../components/ManualEntry';
import { MyQrPanel } from '../components/MyQrPanel';
import { copy } from '../copy';
import { parseQrPayload } from '../state/payload';
import { setLastScanned } from '../state/qrState';

type Tab = 'scan' | 'mine';

export function QrScanScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('scan');

  /** Returns false when the code is not a payment link, so the form can say so. */
  const handleCode = useCallback(
    (code: string): boolean => {
      const target = parseQrPayload(code);
      if (!target) return false;
      setLastScanned(code);
      router.push({ pathname: `/${target.route}`, params: target.params });
      return true;
    },
    [router],
  );

  return (
    <Screen scroll testID="qr-screen">
      <Stack gap="md">
        <Text variant="title" accessibilityRole="header">
          {copy.title}
        </Text>
        <Stack direction="row" gap="sm">
          <Button
            testID="qr-tab-scan"
            title={copy.scanTab}
            variant={tab === 'scan' ? 'primary' : 'secondary'}
            onPress={() => setTab('scan')}
          />
          <Button
            testID="qr-tab-mine"
            title={copy.myQrTab}
            variant={tab === 'mine' ? 'primary' : 'secondary'}
            onPress={() => setTab('mine')}
          />
        </Stack>
        {tab === 'scan' ? <ManualEntry onSubmit={handleCode} /> : <MyQrPanel />}
      </Stack>
    </Screen>
  );
}
