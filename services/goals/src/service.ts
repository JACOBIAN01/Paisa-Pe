import { AppError } from '@pp/core-result';
import type { Goal, GoalId, InterestPreview, Paise, UserId } from '@pp/contracts-domain';
import type { AppEventMap } from '@pp/contracts-events';
import type { EventBus } from '@pp/core-event-bus';
import type { HttpClient } from '@pp/core-net';
import type { JsonStore } from '@pp/core-storage';
import { createIntentId, createIntentRunner } from './intent';

export interface GoalsDeps {
  http: HttpClient;
  /** Must be scoped to `userId`. */
  storage: JsonStore;
  bus: EventBus<AppEventMap>;
  userId: UserId;
}

export interface CreateGoalInput {
  name: string;
  emoji: string;
  target: Paise;
  deadline?: number;
}

export interface MoveOptions {
  /** Reuse the same id for every retry of one deposit or withdrawal. */
  intentId?: string;
}

export interface GoalsService {
  list(): Promise<Goal[]>;
  get(id: GoalId): Goal | undefined;
  create(input: CreateGoalInput, opts?: MoveOptions): Promise<Goal>;
  deposit(id: GoalId, amount: Paise, opts?: MoveOptions): Promise<Goal>;
  withdraw(id: GoalId, amount: Paise, opts?: MoveOptions): Promise<Goal>;
  /** Server-side preview for a goal's yield. */
  preview(id: GoalId, amount: Paise, months: number): Promise<InterestPreview>;
}

const requirePositive = (amount: number): void => {
  if (!Number.isSafeInteger(amount) || amount <= 0) {
    throw new AppError('invalid_request', 'Amount must be a positive number of paise');
  }
};

export function createGoalsService(deps: GoalsDeps): GoalsService {
  const { http, bus } = deps;
  const intents = createIntentRunner(deps.storage, 'goals');
  const byId = new Map<GoalId, Goal>();

  const remember = (goal: Goal): Goal => {
    byId.set(goal.id, goal);
    return goal;
  };

  const move = async (
    kind: 'deposit' | 'withdraw',
    id: GoalId,
    amount: Paise,
    opts?: MoveOptions,
  ): Promise<Goal> => {
    requirePositive(amount);
    if (kind === 'withdraw') {
      const known = byId.get(id);
      if (known && amount > known.saved) {
        throw new AppError('insufficient_funds', 'Cannot withdraw more than is saved');
      }
    }
    const name = kind === 'deposit' ? 'goals.deposit' : 'goals.withdraw';
    return intents.run(opts?.intentId ?? createIntentId(), async (key) => {
      const { goal, balance } = await http.call(name, {
        params: { id },
        body: { amount },
        idempotencyKey: key,
      });
      bus.emit('balance.changed', {
        balance: balance.balance,
        version: balance.version,
        source: 'payment',
      });
      return remember(goal);
    });
  };

  return {
    async list() {
      const { items } = await http.call('goals.list');
      byId.clear();
      return items.map(remember);
    },
    get: (id) => byId.get(id),
    async create(input, opts) {
      if (input.name.trim().length === 0) {
        throw new AppError('invalid_request', 'Give your goal a name');
      }
      requirePositive(input.target);
      return intents.run(opts?.intentId ?? createIntentId(), async (key) => {
        const { goal } = await http.call('goals.create', {
          body: { ...input, name: input.name.trim() },
          idempotencyKey: key,
        });
        return remember(goal);
      });
    },
    deposit: (id, amount, opts) => move('deposit', id, amount, opts),
    withdraw: (id, amount, opts) => move('withdraw', id, amount, opts),
    async preview(id, amount, months) {
      requirePositive(amount);
      const { preview } = await http.call('goals.interestPreview', {
        params: { id },
        query: { amount, months },
      });
      return preview;
    },
  };
}
