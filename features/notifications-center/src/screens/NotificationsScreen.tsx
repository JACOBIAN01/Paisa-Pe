import { useCallback } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import type { AppNotification } from '@pp/contracts-domain';
import { formatDate, getLanguage } from '@pp/core-i18n';
import {
  Badge,
  Button,
  EmptyState,
  ErrorBanner,
  ListRow,
  Skeleton,
  Text,
  useTheme,
} from '@pp/design-system';
import { useAuthState } from '@pp/svc-auth';
import { useNotifications } from '../hooks/useNotifications';
import { useT } from '../hooks/useT';
import { countUnread, targetFor } from '../state/target';

export function NotificationsScreen() {
  const t = useT();
  const router = useRouter();
  const { colors } = useTheme();
  const { activeUserId } = useAuthState();
  const { items, loading, failed, refetch, markRead } = useNotifications(activeUserId);
  const unread = countUnread(items);

  const open = useCallback(
    (notification: AppNotification) => {
      if (!notification.read) void markRead([notification.id]);
      const target = targetFor(notification);
      if (target) router.push({ pathname: target.pathname, params: target.params });
    },
    [markRead, router],
  );

  if (loading && items.length === 0) return <Skeleton height={200} />;

  return (
    <FlatList
      testID="notifications-screen"
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
      data={items}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={
        <View style={styles.header}>
          <Text variant="title">{t('notifications.title')}</Text>
          {failed ? (
            <ErrorBanner message={t('notifications.loadError')} onRetry={() => void refetch()} />
          ) : null}
          {unread > 0 ? (
            <Button
              title={t('notifications.markAllRead')}
              variant="ghost"
              testID="mark-all-read"
              onPress={() => void markRead(items.filter((n) => !n.read).map((n) => n.id))}
            />
          ) : null}
        </View>
      }
      ListEmptyComponent={failed ? null : <EmptyState title={t('notifications.empty')} />}
      renderItem={({ item }) => (
        <ListRow
          testID={`notification-${item.id}`}
          title={item.title}
          subtitle={`${item.body} · ${formatDate(item.createdAt, getLanguage(), 'Asia/Kolkata', { withTime: false })}`}
          onPress={() => open(item)}
          right={item.read ? null : <Badge label={t('notifications.unread')} tone="warning" />}
        />
      )}
    />
  );
}

const styles = StyleSheet.create({
  content: { padding: 16 },
  header: { gap: 8, paddingBottom: 8 },
});
