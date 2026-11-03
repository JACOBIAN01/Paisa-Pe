import * as ExpoNotifications from 'expo-notifications';

export interface TapResponse {
  notification: {
    request: {
      identifier: string;
      content: { data: Record<string, unknown> };
    };
  };
}

export interface ScheduleRequest {
  title: string;
  body: string;
  data: Record<string, unknown>;
  at: number;
}

export interface NotificationsAdapter {
  schedule(request: ScheduleRequest): Promise<string>;
  addTapListener(listener: (response: TapResponse) => void): { remove(): void };
  getLastTap(): TapResponse | null;
}

export const expoNotifications: NotificationsAdapter = {
  schedule: ({ title, body, data, at }) =>
    ExpoNotifications.scheduleNotificationAsync({
      content: { title, body, data },
      trigger: { type: ExpoNotifications.SchedulableTriggerInputTypes.DATE, date: new Date(at) },
    }),
  addTapListener: (listener) => ExpoNotifications.addNotificationResponseReceivedListener(listener),
  getLastTap: () => ExpoNotifications.getLastNotificationResponse(),
};
