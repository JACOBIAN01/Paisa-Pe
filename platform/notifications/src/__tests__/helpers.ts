import type { NotificationsAdapter, ScheduleRequest, TapResponse } from '../adapter';

export const tap = (id: string, route: unknown): TapResponse => ({
  notification: {
    request: { identifier: id, content: { data: { route } as Record<string, unknown> } },
  },
});

export interface FakeNotifications extends NotificationsAdapter {
  scheduled: ScheduleRequest[];
  emit(response: TapResponse): void;
  listeners(): number;
  setLast(response: TapResponse | null): void;
}

export function createFakeNotifications(): FakeNotifications {
  const listeners = new Set<(r: TapResponse) => void>();
  let last: TapResponse | null = null;
  const scheduled: ScheduleRequest[] = [];
  return {
    scheduled,
    schedule: async (request) => {
      scheduled.push(request);
      return `n${scheduled.length}`;
    },
    addTapListener: (l) => {
      listeners.add(l);
      return { remove: () => void listeners.delete(l) };
    },
    getLastTap: () => last,
    emit: (r) => listeners.forEach((l) => l(r)),
    listeners: () => listeners.size,
    setLast: (r) => {
      last = r;
    },
  };
}
