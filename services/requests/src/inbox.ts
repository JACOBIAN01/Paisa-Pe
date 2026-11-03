import type { MoneyRequest, RequestId, UserId } from '@pp/contracts-domain';

export type Direction = 'incoming' | 'outgoing';

export interface InboxState {
  /** Requests keyed by id; position in any list is never an identity. */
  byId: ReadonlyMap<RequestId, MoneyRequest>;
}

export const emptyInbox = (): InboxState => ({ byId: new Map() });

const newestFirst = (a: MoneyRequest, b: MoneyRequest): number =>
  b.createdAt - a.createdAt || (a.id < b.id ? 1 : -1);

/** Upserts requests, never replacing a newer copy with an older one. */
export function upsertRequests(state: InboxState, incoming: readonly MoneyRequest[]): InboxState {
  const byId = new Map(state.byId);
  for (const request of incoming) {
    const current = byId.get(request.id);
    if (!current || request.updatedAt >= current.updatedAt) byId.set(request.id, request);
  }
  return { byId };
}

export function removeMissing(
  state: InboxState,
  userId: UserId,
  direction: Direction,
  keep: readonly MoneyRequest[],
): InboxState {
  const keepIds = new Set(keep.map((r) => r.id));
  const byId = new Map<RequestId, MoneyRequest>();
  for (const [id, request] of state.byId) {
    const inDirection =
      direction === 'incoming' ? request.payerId === userId : request.requesterId === userId;
    if (!inDirection || keepIds.has(id)) byId.set(id, request);
  }
  return { byId };
}

export function selectRequests(
  state: InboxState,
  userId: UserId,
  direction: Direction,
): MoneyRequest[] {
  return [...state.byId.values()]
    .filter((r) => (direction === 'incoming' ? r.payerId === userId : r.requesterId === userId))
    .sort(newestFirst);
}

export const pendingIncomingCount = (state: InboxState, userId: UserId): number =>
  selectRequests(state, userId, 'incoming').filter((r) => r.status === 'pending').length;
