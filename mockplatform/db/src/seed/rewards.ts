import type { Coupon, ScratchCard } from '@pp/contracts-domain';
import type { Database } from '../database';
import { couponId, paise, scratchCardId, txnId, userId } from '../ids';
import type { Rng } from '../rng';
import { DAY_MS } from '../ops/time';
import { DEMO_USERS } from './data';

interface CouponTemplate {
  code: string;
  title: string;
  description: string;
  kind: Coupon['kind'];
  value: number;
  minSpendRupees: number;
  maxDiscountRupees?: number;
  status: Coupon['status'];
}

const TEMPLATES: readonly CouponTemplate[] = [
  {
    code: 'WELCOME50',
    title: 'Welcome gift',
    description: 'Flat ₹50 off on your first bill payment',
    kind: 'flat',
    value: 5000,
    minSpendRupees: 200,
    status: 'available',
  },
  {
    code: 'RECHARGE10',
    title: '10% off recharge',
    description: '10% off on mobile recharge up to ₹50',
    kind: 'percent',
    value: 1000,
    minSpendRupees: 199,
    maxDiscountRupees: 50,
    status: 'available',
  },
  {
    code: 'POWER25',
    title: 'Electricity saver',
    description: 'Flat ₹25 off on electricity bills',
    kind: 'flat',
    value: 2500,
    minSpendRupees: 500,
    status: 'available',
  },
  {
    code: 'DINNER15',
    title: 'Dinner split',
    description: '15% off when you split a bill, up to ₹75',
    kind: 'percent',
    value: 1500,
    minSpendRupees: 300,
    maxDiscountRupees: 75,
    status: 'available',
  },
  {
    code: 'DTH30',
    title: 'DTH top-up',
    description: 'Flat ₹30 off on DTH recharge',
    kind: 'flat',
    value: 3000,
    minSpendRupees: 300,
    status: 'available',
  },
  {
    code: 'WEEKEND5',
    title: 'Weekend 5%',
    description: '5% off on weekend payments, up to ₹40',
    kind: 'percent',
    value: 500,
    minSpendRupees: 100,
    maxDiscountRupees: 40,
    status: 'available',
  },
  {
    code: 'GAS20',
    title: 'Gas cylinder',
    description: 'Flat ₹20 off on gas bill payment',
    kind: 'flat',
    value: 2000,
    minSpendRupees: 400,
    status: 'available',
  },
  {
    code: 'BROAD40',
    title: 'Broadband bonus',
    description: 'Flat ₹40 off on broadband bills',
    kind: 'flat',
    value: 4000,
    minSpendRupees: 700,
    status: 'available',
  },
  {
    code: 'FRIEND100',
    title: 'Friend invite',
    description: 'Flat ₹100 off after your friend joins',
    kind: 'flat',
    value: 10000,
    minSpendRupees: 500,
    status: 'available',
  },
  {
    code: 'DIWALI20',
    title: 'Festive offer',
    description: '20% off up to ₹100',
    kind: 'percent',
    value: 2000,
    minSpendRupees: 500,
    maxDiscountRupees: 100,
    status: 'redeemed',
  },
  {
    code: 'MONSOON15',
    title: 'Monsoon offer',
    description: 'Flat ₹15 off on water bills',
    kind: 'flat',
    value: 1500,
    minSpendRupees: 150,
    status: 'redeemed',
  },
  {
    code: 'NEWYEAR75',
    title: 'New year',
    description: 'Flat ₹75 off on any payment',
    kind: 'flat',
    value: 7500,
    minSpendRupees: 600,
    status: 'expired',
  },
];

export function seedRewards(db: Database, rng: Rng, now: number): void {
  for (const demo of DEMO_USERS) {
    const ownerId = userId(demo.id);
    for (const [i, tpl] of TEMPLATES.entries()) {
      const expired = tpl.status === 'expired';
      db.t.coupons.push({
        ownerId,
        coupon: {
          id: couponId(`cp_${demo.id.slice(4)}_${String(i + 1).padStart(2, '0')}`),
          code: tpl.code,
          title: tpl.title,
          description: tpl.description,
          kind: tpl.kind,
          value: tpl.value,
          minSpend: paise(tpl.minSpendRupees * 100),
          maxDiscount: tpl.maxDiscountRupees ? paise(tpl.maxDiscountRupees * 100) : undefined,
          expiresAt: expired ? now - 10 * DAY_MS : now + rng.int(5, 60) * DAY_MS,
          status: tpl.status,
        },
      });
    }
    for (let i = 0; i < 4; i += 1) {
      const revealed = i >= 2;
      const prize = paise(rng.int(1, 50) * 100);
      const card: ScratchCard = {
        id: scratchCardId(`sc_${demo.id.slice(4)}_${i + 1}`),
        state: revealed ? 'revealed' : 'unscratched',
        reward: revealed ? prize : undefined,
        expiresAt: now + rng.int(3, 20) * DAY_MS,
      };
      db.t.scratchCards.push({ ownerId, card, prize });
    }
    const sends = db.t.txns.filter((t) => t.ownerId === ownerId && t.type === 'p2p_send').slice(-8);
    for (const [i, txn] of sends.entries()) {
      db.t.cashbacks.push({
        ownerId,
        cashback: {
          txnId: txnId(txn.id),
          amount: paise(Math.max(100, Math.round(txn.amount / 100))),
          status: i === sends.length - 1 ? 'pending' : 'credited',
          createdAt: txn.createdAt,
        },
      });
    }
  }
}
