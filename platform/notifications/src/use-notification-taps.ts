import { useEffect, useRef } from 'react';
import { expoNotifications, type NotificationsAdapter } from './adapter';
import { handleNotificationTap, type NavigateFn } from './tap';

/** Routes live taps and the tap that launched the app, once each, and unsubscribes on unmount. */
export function useNotificationTaps(
  navigate: NavigateFn,
  adapter: NotificationsAdapter = expoNotifications,
): void {
  const navigateRef = useRef(navigate);
  useEffect(() => {
    navigateRef.current = navigate;
  }, [navigate]);

  useEffect(() => {
    const handled = new Set<string>();
    const route = (response: Parameters<typeof handleNotificationTap>[0]): void => {
      const id = response.notification.request.identifier;
      if (handled.has(id)) return;
      handled.add(id);
      handleNotificationTap(response, (name, params) => navigateRef.current(name, params));
    };

    const subscription = adapter.addTapListener(route);
    const launch = adapter.getLastTap();
    if (launch) route(launch);
    return () => subscription.remove();
  }, [adapter]);
}
