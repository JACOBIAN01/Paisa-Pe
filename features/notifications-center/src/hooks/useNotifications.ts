import { useCallback } from 'react';
import type { AppNotification } from '@pp/contracts-domain';
import { useService } from '@pp/core-di';
import { HTTP_CLIENT } from '@pp/core-net';
import { keys, useQuery, useQueryClient } from '@pp/core-query';

export interface NotificationsState {
  items: AppNotification[];
  loading: boolean;
  failed: boolean;
  refetch: () => Promise<void>;
  markRead: (ids: string[]) => Promise<void>;
}

export function useNotifications(userId: string | null): NotificationsState {
  const http = useService(HTTP_CLIENT);
  const client = useQueryClient();
  const key = keys.notifications(userId ?? '');
  const query = useQuery({
    key,
    fn: async () => (await http.call('notifications.list')).items,
    enabled: userId !== null,
  });

  const markRead = useCallback(
    async (ids: string[]) => {
      if (ids.length === 0) return;
      const wanted = new Set(ids);
      const rollback = client.optimisticUpdate<AppNotification[]>(key, (old) =>
        (old ?? []).map((n) => (wanted.has(n.id) ? { ...n, read: true } : n)),
      );
      try {
        await http.call('notifications.markRead', { body: { ids } });
        rollback.commit();
      } catch {
        rollback();
      }
    },
    // The key is derived from the user id only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [client, http, userId],
  );

  return {
    items: query.data ?? [],
    loading: query.status === 'loading' || query.status === 'idle',
    failed: query.status === 'error',
    refetch: query.refetch,
    markRead,
  };
}
