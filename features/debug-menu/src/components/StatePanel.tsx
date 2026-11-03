import { ScrollView } from 'react-native';
import { redact } from '@pp/core-logging';
import { Card, Text } from '@pp/design-system';
import { useAuthState } from '@pp/svc-auth';
import { useFlagSnapshot } from '../hooks/useFlagSnapshot';

export function StatePanel() {
  const auth = useAuthState();
  const flags = useFlagSnapshot();
  const view = redact({
    activeUserId: auth.activeUserId,
    accounts: auth.accounts.map((a) => ({ userId: a.userId, deviceId: a.deviceId })),
    flags,
  });
  return (
    <Card>
      <ScrollView testID="panel-state" horizontal>
        <Text variant="mono">{JSON.stringify(view, null, 2)}</Text>
      </ScrollView>
    </Card>
  );
}
