import type { Goal, UserId } from '@pp/contracts-domain';
import { goalId, paise, postTxn, walletOf, type Database } from '@pp/mock-db';
import { fail } from '../errors';
import type { Registry } from '../context';
import { assertCanHold } from '../limits';
import { divHalfUp } from '../util';
import { balanceView } from './shared';

const DEFAULT_APY_BPS = 650;

function findGoal(db: Database, userId: UserId, id: string): Goal {
  const record = db.t.goals.find((g) => g.ownerId === userId && g.goal.id === id);
  if (!record) throw fail('not_found', 'Goal not found');
  return record.goal;
}

export function registerGoals(r: Registry): void {
  r.auth('goals.list', ({ db, userId }) => ({
    items: db.t.goals.filter((g) => g.ownerId === userId).map((g) => g.goal),
  }));

  r.auth('goals.create', ({ db, now, userId, body }) => {
    if (body.target <= 0) throw fail('invalid_request', 'Target must be positive');
    const goal: Goal = {
      id: goalId(db.nextId('gl')),
      name: body.name,
      emoji: body.emoji,
      target: body.target,
      saved: paise(0),
      apyBps: DEFAULT_APY_BPS,
      deadline: body.deadline,
      createdAt: now,
    };
    db.t.goals.push({ ownerId: userId, goal });
    return { goal };
  });

  r.auth('goals.deposit', ({ db, now, userId, params, body, idempotencyKey }) => {
    const goal = findGoal(db, userId, params.id);
    if (body.amount <= 0) throw fail('invalid_request', 'Amount must be positive');
    const balance = walletOf(db, userId).balance;
    if (balance < body.amount) {
      throw fail('insufficient_funds', 'Insufficient balance', { balance, required: body.amount });
    }
    postTxn(db, now, {
      ownerId: userId,
      type: 'goal_deposit',
      amount: body.amount,
      counterparty: { name: goal.name },
      idempotencyKey,
    });
    goal.saved = paise(goal.saved + body.amount);
    return { goal, balance: balanceView(db, userId, now) };
  });

  r.auth('goals.withdraw', ({ db, now, userId, params, body, idempotencyKey }) => {
    const goal = findGoal(db, userId, params.id);
    if (body.amount <= 0) throw fail('invalid_request', 'Amount must be positive');
    if (goal.saved < body.amount) {
      throw fail('insufficient_funds', 'Not enough saved in this goal', {
        saved: goal.saved,
        required: body.amount,
      });
    }
    assertCanHold(db, userId, body.amount);
    postTxn(db, now, {
      ownerId: userId,
      type: 'goal_withdraw',
      amount: body.amount,
      counterparty: { name: goal.name },
      idempotencyKey,
    });
    goal.saved = paise(goal.saved - body.amount);
    return { goal, balance: balanceView(db, userId, now) };
  });

  r.auth('goals.interestPreview', ({ db, userId, params, query }) => {
    const goal = findGoal(db, userId, params.id);
    const interest = divHalfUp(query.amount * goal.apyBps * query.months, 10_000 * 12);
    return {
      preview: {
        principal: paise(query.amount),
        months: query.months,
        interest: paise(interest),
        maturity: paise(query.amount + interest),
      },
    };
  });
}
