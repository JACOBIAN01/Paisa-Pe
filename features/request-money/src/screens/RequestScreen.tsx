import { useCallback, useRef, useState } from 'react';
import { FlatList } from 'react-native';
import type { MoneyRequest } from '@pp/contracts-domain';
import { useService } from '@pp/core-di';
import {
  Button,
  EmptyState,
  ErrorBanner,
  Screen,
  Skeleton,
  Stack,
  Text,
  useToast,
} from '@pp/design-system';
import { useRouter } from 'expo-router';
import { useAuthState } from '@pp/svc-auth';
import { REQUESTS_SERVICE } from '@pp/svc-requests';
import { CreateRequestForm } from '../components/CreateRequestForm';
import { PaySheet } from '../components/PaySheet';
import { RequestRow } from '../components/RequestRow';
import { copy } from '../copy';
import { useContacts } from '../hooks/useContacts';
import { useInbox } from '../hooks/useInbox';
import { counterpartyName } from '../state/names';

type Tab = 'incoming' | 'outgoing';

export function RequestScreen() {
  const router = useRouter();
  const requests = useService(REQUESTS_SERVICE);
  const toast = useToast();
  const { activeUserId } = useAuthState();
  const inbox = useInbox();
  const { contacts } = useContacts();
  const [tab, setTab] = useState<Tab>('incoming');
  const [payTargetId, setPayTargetId] = useState<MoneyRequest['id'] | null>(null);
  const [paying, setPaying] = useState(false);
  const payGuard = useRef(false);

  const list = tab === 'incoming' ? inbox.incoming : inbox.outgoing;
  const target = payTargetId ? (inbox.incoming.find((r) => r.id === payTargetId) ?? null) : null;

  const open = useCallback(
    (id: MoneyRequest['id']) => {
      if (tab === 'incoming') setPayTargetId(id);
      else router.push({ pathname: '/request-detail', params: { id } });
    },
    [tab, router],
  );

  const pay = useCallback(
    (id: MoneyRequest['id']) => {
      if (payGuard.current) return;
      payGuard.current = true;
      setPaying(true);
      requests
        .pay(id)
        .then(() => {
          toast.show(copy.paid, 'success');
          setPayTargetId(null);
        })
        .catch(() => toast.show(copy.payFailed, 'error'))
        .finally(() => {
          payGuard.current = false;
          setPaying(false);
        });
    },
    [requests, toast],
  );

  return (
    <Screen testID="request-screen">
      <Stack gap="md">
        <Text variant="title" accessibilityRole="header">
          {copy.title}
        </Text>
        <Stack direction="row" gap="sm">
          <Button
            title={copy.incoming}
            variant={tab === 'incoming' ? 'primary' : 'secondary'}
            onPress={() => setTab('incoming')}
            testID="tab-incoming"
          />
          <Button
            title={copy.outgoing}
            variant={tab === 'outgoing' ? 'primary' : 'secondary'}
            onPress={() => setTab('outgoing')}
            testID="tab-outgoing"
          />
        </Stack>

        {inbox.status === 'error' && list.length === 0 ? (
          <ErrorBanner message={copy.loadFailed} onRetry={inbox.refresh} />
        ) : inbox.status === 'loading' && list.length === 0 ? (
          <Skeleton height={64} />
        ) : (
          <FlatList
            testID="request-list"
            data={list}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            ListEmptyComponent={
              <EmptyState
                title={tab === 'incoming' ? copy.emptyIncoming : copy.emptyOutgoing}
                message={tab === 'incoming' ? copy.emptyIncomingHint : copy.emptyOutgoingHint}
              />
            }
            renderItem={({ item }) => (
              <RequestRow
                request={item}
                name={counterpartyName(item, activeUserId, contacts)}
                onPress={open}
              />
            )}
          />
        )}

        <CreateRequestForm contacts={contacts} onCreated={inbox.refresh} />
      </Stack>
      <PaySheet
        request={target}
        name={target ? counterpartyName(target, activeUserId, contacts) : ''}
        busy={paying}
        onPay={pay}
        onClose={() => setPayTargetId(null)}
      />
    </Screen>
  );
}
