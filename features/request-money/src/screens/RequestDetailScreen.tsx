import { useRef, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { RequestIdSchema } from '@pp/contracts-domain';
import { useService } from '@pp/core-di';
import { formatPaise } from '@pp/core-money';
import {
  Button,
  Card,
  EmptyState,
  Screen,
  Skeleton,
  Stack,
  Text,
  useToast,
} from '@pp/design-system';
import { useAuthState } from '@pp/svc-auth';
import { REQUESTS_SERVICE } from '@pp/svc-requests';
import { copy } from '../copy';
import { useContacts } from '../hooks/useContacts';
import { useInbox } from '../hooks/useInbox';
import { counterpartyName, isIncoming } from '../state/names';

type Action = 'pay' | 'decline' | 'cancel';

export function RequestDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const requests = useService(REQUESTS_SERVICE);
  const toast = useToast();
  const { activeUserId } = useAuthState();
  const inbox = useInbox();
  const { contacts } = useContacts();
  const [busy, setBusy] = useState<Action | null>(null);
  const guard = useRef(false);

  const id = RequestIdSchema.safeParse(params.id);
  const request = id.success
    ? [...inbox.incoming, ...inbox.outgoing].find((r) => r.id === id.data)
    : undefined;

  if (!request) {
    if (inbox.status === 'loading') return <Skeleton height={120} />;
    return (
      <Screen testID="request-not-found">
        <EmptyState title={copy.notFound} actionLabel="Back" onAction={() => router.back()} />
      </Screen>
    );
  }

  const incoming = isIncoming(request, activeUserId);
  const name = counterpartyName(request, activeUserId, contacts);
  const pending = request.status === 'pending';

  const run = (action: Action) => {
    if (guard.current) return;
    guard.current = true;
    setBusy(action);
    const task =
      action === 'pay'
        ? requests.pay(request.id)
        : action === 'decline'
          ? requests.decline(request.id)
          : requests.cancel(request.id);
    const done =
      action === 'pay' ? copy.paid : action === 'decline' ? copy.declined : copy.cancelled;
    task
      .then(() => toast.show(done, 'success'))
      .catch(() => toast.show(action === 'pay' ? copy.payFailed : copy.actionFailed, 'error'))
      .finally(() => {
        guard.current = false;
        setBusy(null);
      });
  };

  return (
    <Screen testID="request-detail">
      <Stack gap="md">
        <Card>
          <Stack gap="sm">
            <Text variant="caption" color="textMuted">
              {incoming ? 'From' : 'To'}
            </Text>
            <Text variant="heading">{name}</Text>
            <Text variant="display" testID="detail-amount">
              {formatPaise(request.amount)}
            </Text>
            {request.note ? <Text color="textMuted">{request.note}</Text> : null}
            <Text variant="caption" testID="detail-status">
              {copy.status[request.status]}
            </Text>
          </Stack>
        </Card>
        {pending && incoming ? (
          <>
            <Button
              testID="detail-pay"
              title="Pay now"
              loading={busy === 'pay'}
              disabled={busy !== null}
              onPress={() => run('pay')}
            />
            <Button
              testID="detail-decline"
              title={copy.decline}
              variant="secondary"
              disabled={busy !== null}
              onPress={() => run('decline')}
            />
          </>
        ) : null}
        {pending && !incoming ? (
          <Button
            testID="detail-cancel"
            title={copy.cancel}
            variant="danger"
            loading={busy === 'cancel'}
            disabled={busy !== null}
            onPress={() => run('cancel')}
          />
        ) : null}
      </Stack>
    </Screen>
  );
}
