import type {
  ContactId,
  IdempotencyKey,
  MoneyRequest,
  Paise,
  RequestId,
  SplitBill,
  UserId,
} from '@pp/contracts-domain';
import type { AppEventMap } from '@pp/contracts-events';
import type { EventBus } from '@pp/core-event-bus';
import type { HttpClient } from '@pp/core-net';
import type { JsonStore } from '@pp/core-storage';
import { unwrap } from '@pp/core-result';
import {
  emptyInbox,
  pendingIncomingCount,
  removeMissing,
  selectRequests,
  upsertRequests,
  type Direction,
  type InboxState,
} from './inbox';
import { createIntentId, createIntentRunner } from './intent';
import { computeSplit, type SplitMode, type SplitParticipant, type SplitPlan } from './split';

export interface RequestsDeps {
  http: HttpClient;
  /** Must be scoped to `userId`. */
  storage: JsonStore;
  bus: EventBus<AppEventMap>;
  userId: UserId;
}

export interface CreateRequestInput {
  from: ContactId;
  amount: Paise;
  note?: string;
}

export interface CreateSplitInput {
  total: Paise;
  participants: readonly SplitParticipant[];
  mode: SplitMode;
  note?: string;
  intentId?: string;
}

export interface RequestsService {
  /** Fetches from the server and merges into the inbox. Older responses never win. */
  refresh(direction?: Direction): Promise<MoneyRequest[]>;
  getInbox(): InboxState;
  incoming(): MoneyRequest[];
  outgoing(): MoneyRequest[];
  get(id: RequestId): MoneyRequest | undefined;
  pendingIncomingCount(): number;
  subscribe(listener: (state: InboxState) => void): () => void;
  create(input: CreateRequestInput, opts?: { intentId?: string }): Promise<MoneyRequest>;
  /** Pays by request id. Repeat calls for the same request share one key and one flight. */
  pay(id: RequestId, opts?: { intentId?: string }): Promise<MoneyRequest>;
  decline(id: RequestId): Promise<MoneyRequest>;
  cancel(id: RequestId): Promise<MoneyRequest>;
  planSplit: typeof computeSplit;
  createSplit(input: CreateSplitInput): Promise<{ split: SplitBill; requests: MoneyRequest[] }>;
}

export function createRequestsService(deps: RequestsDeps): RequestsService {
  const { http, bus, userId } = deps;
  const intents = createIntentRunner(deps.storage, 'requests');
  const listeners = new Set<(state: InboxState) => void>();
  let inbox = emptyInbox();
  let refreshSeq = 0;
  const appliedSeq: Record<Direction, number> = { incoming: 0, outgoing: 0 };

  const setInbox = (next: InboxState): void => {
    inbox = next;
    for (const listener of [...listeners]) listener(inbox);
  };

  const absorb = (request: MoneyRequest): void => setInbox(upsertRequests(inbox, [request]));

  async function refreshDirection(direction: Direction): Promise<MoneyRequest[]> {
    refreshSeq += 1;
    const seq = refreshSeq;
    const { items } = await http.call('requests.list', { query: { direction } });
    if (seq > appliedSeq[direction]) {
      appliedSeq[direction] = seq;
      setInbox(removeMissing(upsertRequests(inbox, items), userId, direction, items));
    }
    return selectRequests(inbox, userId, direction);
  }

  async function transition(
    name: 'requests.decline' | 'requests.cancel',
    id: RequestId,
  ): Promise<MoneyRequest> {
    const { request } = await http.call(name, { params: { id } });
    absorb(request);
    bus.emit('request.updated', { request });
    return request;
  }

  const payFlights = new Map<RequestId, Promise<MoneyRequest>>();

  return {
    async refresh(direction) {
      if (direction) return refreshDirection(direction);
      const [incoming, outgoing] = await Promise.all([
        refreshDirection('incoming'),
        refreshDirection('outgoing'),
      ]);
      return [...incoming, ...outgoing];
    },
    getInbox: () => inbox,
    incoming: () => selectRequests(inbox, userId, 'incoming'),
    outgoing: () => selectRequests(inbox, userId, 'outgoing'),
    get: (id) => inbox.byId.get(id),
    pendingIncomingCount: () => pendingIncomingCount(inbox, userId),
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    create(input, opts) {
      return intents.run(opts?.intentId ?? createIntentId(), async (key: IdempotencyKey) => {
        const { request } = await http.call('requests.create', {
          body: input,
          idempotencyKey: key,
        });
        absorb(request);
        bus.emit('request.created', { request });
        return request;
      });
    },

    pay(id, opts) {
      const existing = payFlights.get(id);
      if (existing) return existing;
      const flight = intents
        .run(opts?.intentId ?? `pay:${id}`, (key) =>
          http.call('requests.pay', { params: { id }, idempotencyKey: key }),
        )
        .then(({ request }) => {
          absorb(request);
          bus.emit('request.updated', { request });
          return request;
        });
      payFlights.set(id, flight);
      const clear = (): void => {
        payFlights.delete(id);
      };
      flight.then(clear, clear);
      return flight;
    },

    decline: (id) => transition('requests.decline', id),
    cancel: (id) => transition('requests.cancel', id),

    planSplit: computeSplit,

    async createSplit(input) {
      const plan: SplitPlan = unwrap(computeSplit(input.total, input.participants, input.mode));
      return intents.run(input.intentId ?? createIntentId(), async (key) => {
        const result = await http.call('splits.create', {
          body: { total: plan.total, shares: plan.shares, note: input.note },
          idempotencyKey: key,
        });
        setInbox(upsertRequests(inbox, result.requests));
        for (const request of result.requests) bus.emit('request.created', { request });
        return result;
      });
    },
  };
}
