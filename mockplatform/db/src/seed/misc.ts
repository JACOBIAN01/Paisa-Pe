import type { Biller, BillLineItem } from '@pp/contracts-domain';
import type { Database } from '../database';
import { billerId, cardId, goalId, notificationId, paise, userId } from '../ids';
import type { Rng } from '../rng';
import { DAY_MS } from '../ops/time';
import { DEMO_USERS } from './data';

export const BILLERS: readonly Biller[] = [
  { id: billerId('bl_elec_1'), name: 'Tata Power Mumbai', category: 'electricity' },
  { id: billerId('bl_elec_2'), name: 'BESCOM Bengaluru', category: 'electricity' },
  { id: billerId('bl_water_1'), name: 'Delhi Jal Board', category: 'water' },
  { id: billerId('bl_water_2'), name: 'BWSSB', category: 'water' },
  { id: billerId('bl_gas_1'), name: 'Indraprastha Gas', category: 'gas' },
  { id: billerId('bl_mob_1'), name: 'Jio Prepaid', category: 'mobile' },
  { id: billerId('bl_mob_2'), name: 'Airtel Prepaid', category: 'mobile' },
  { id: billerId('bl_mob_3'), name: 'Vi Prepaid', category: 'mobile' },
  { id: billerId('bl_dth_1'), name: 'Tata Play', category: 'dth' },
  { id: billerId('bl_dth_2'), name: 'Dish TV', category: 'dth' },
  { id: billerId('bl_bb_1'), name: 'ACT Fibernet', category: 'broadband' },
  { id: billerId('bl_bb_2'), name: 'Hathway', category: 'broadband' },
];

const line = (label: string, amount: number, feeBps: number): BillLineItem => ({
  label,
  amount: paise(amount),
  feeBps,
});

export function seedBilling(db: Database, rng: Rng, now: number): void {
  db.t.billers.push(...BILLERS);
  for (const demo of DEMO_USERS) {
    const ownerId = userId(demo.id);
    const n = demo.id.slice(4);
    db.t.dues.push(
      {
        ownerId,
        due: {
          billerId: billerId('bl_elec_1'),
          accountRef: `EB${n}${rng.int(100000, 999999)}`,
          items: [
            line('Energy charges', rng.int(900, 2400) * 100 + rng.int(0, 99), 118),
            line('Fixed charge', 15000, 118),
            line('Electricity duty', rng.int(60, 180) * 100 + 13, 0),
          ],
          dueAt: now + rng.int(2, 12) * DAY_MS,
        },
      },
      {
        ownerId,
        due: {
          billerId: billerId('bl_bb_1'),
          accountRef: `BB${n}${rng.int(10000, 99999)}`,
          items: [line('Plan rental', 79900, 175), line('Static IP', 10000, 175)],
          dueAt: now + rng.int(5, 20) * DAY_MS,
        },
      },
      {
        ownerId,
        due: {
          billerId: billerId('bl_gas_1'),
          accountRef: `GS${n}${rng.int(10000, 99999)}`,
          items: [line('Piped gas usage', rng.int(300, 900) * 100 + 37, 90)],
          dueAt: now + rng.int(8, 25) * DAY_MS,
        },
      },
    );
  }
}

const GOALS: ReadonlyArray<readonly [string, string, number, number]> = [
  ['Goa trip', '🏖️', 2_500_000, 840_000],
  ['New phone', '📱', 7_000_000, 1_950_000],
  ['Emergency fund', '🛟', 10_000_000, 3_300_000],
];

export function seedGoalsAndCards(db: Database, rng: Rng, now: number): void {
  for (const [index, demo] of DEMO_USERS.entries()) {
    const ownerId = userId(demo.id);
    const count = index === 0 ? GOALS.length : 1;
    for (let g = 0; g < count; g += 1) {
      const [name, emoji, target, saved] = GOALS[g] as (typeof GOALS)[number];
      db.t.goals.push({
        ownerId,
        goal: {
          id: goalId(`gl_${demo.id.slice(4)}_${g + 1}`),
          name,
          emoji,
          target: paise(target),
          saved: paise(saved),
          apyBps: 650 + g * 50,
          deadline: now + (120 + g * 90) * DAY_MS,
          createdAt: now - (60 + g * 30) * DAY_MS,
        },
      });
    }
    db.t.cards.push({
      ownerId,
      card: {
        id: cardId(`cd_${demo.id.slice(4)}`),
        last4: String(1000 + rng.int(0, 8999)),
        network: index % 2 === 0 ? 'rupay' : 'visa',
        holder: demo.name.toUpperCase(),
        expiry: '09/29',
        status: 'active',
        spendLimit: paise(5_000_000),
      },
      pan: `4${Array.from({ length: 15 }, () => rng.int(0, 9)).join('')}`,
      cvv: String(rng.int(100, 999)),
    });
  }
}

export function seedNotifications(db: Database, rng: Rng, now: number): void {
  for (const demo of DEMO_USERS) {
    const ownerId = userId(demo.id);
    const recent = db.t.txns.filter((t) => t.ownerId === ownerId).slice(-6);
    for (const [i, txn] of recent.entries()) {
      const received = txn.type === 'p2p_receive';
      db.t.notifications.push({
        ownerId,
        notification: {
          id: notificationId(`nt_${demo.id.slice(4)}_${i + 1}`),
          kind: 'payment',
          title: received ? 'Money received' : 'Payment sent',
          body: `${txn.counterparty?.name ?? 'Wallet'} · ₹${(txn.amount / 100).toFixed(2)}`,
          read: i < 3,
          createdAt: txn.createdAt,
          route: { name: 'txn-detail', params: { id: txn.id } },
        },
      });
    }
    const extras: Array<[string, string, string, string?]> = [
      ['reward', 'Scratch card waiting', 'You have 2 unscratched cards', 'rewards'],
      [
        'reminder',
        'Electricity bill due soon',
        'Pay before the due date to avoid late fees',
        'bills',
      ],
      ['security', 'New login detected', 'Signed in on a new device', 'security'],
      ['request', 'Payment request', 'A friend requested money from you', 'request'],
    ];
    for (const [i, [kind, title, body, route]] of extras.entries()) {
      db.t.notifications.push({
        ownerId,
        notification: {
          id: notificationId(`nt_${demo.id.slice(4)}_x${i + 1}`),
          kind: kind as 'reward' | 'reminder' | 'security' | 'request',
          title,
          body,
          read: rng.chance(0.5),
          createdAt: now - rng.int(2, 72) * 3_600_000,
          route: route ? { name: route } : undefined,
        },
      });
    }
  }
}
