import type { Contact, ContactId, Limits, Phone, Txn, TxnId } from '@pp/contracts-domain';
import { paise } from '@pp/core-money';
import { assessTransfer, hasBlocker } from '../assess';
import { medianRecentSend } from '../history';

const PHONE = '+919800000002' as Phone;
const OTHER = '+919800000003' as Phone;

const send = (n: number, amount: number, phone = PHONE, extra: Partial<Txn> = {}): Txn => ({
  id: `t${n}` as TxnId,
  type: 'p2p_send',
  status: 'success',
  amount: paise(amount),
  fee: paise(0),
  balanceAfter: paise(0),
  counterparty: { name: 'Someone', phone },
  createdAt: n,
  updatedAt: n,
  ...extra,
});

const limits = (perTxn: number, limit: number, used: number): Limits => ({
  tier: 'basic',
  perTxn: paise(perTxn),
  daily: { limit: paise(limit), used: paise(used) },
  monthly: { limit: paise(limit * 10), used: paise(0) },
  walletCap: paise(10_000_000),
  asOf: 0,
});

const kinds = (prompts: ReturnType<typeof assessTransfer>) => prompts.map((p) => p.kind);

describe('new_payee', () => {
  it('flags a recipient never paid before', () => {
    const prompts = assessTransfer({
      amount: paise(1000),
      recipient: { phone: PHONE },
      history: [],
    });
    expect(prompts).toEqual([expect.objectContaining({ kind: 'new_payee', severity: 'info' })]);
  });

  it('does not flag someone already paid successfully', () => {
    const history = [send(1, 1000)];
    expect(assessTransfer({ amount: paise(1000), recipient: { phone: PHONE }, history })).toEqual(
      [],
    );
  });

  it('ignores failed sends and sends to other people', () => {
    const history = [send(1, 1000, PHONE, { status: 'failed' }), send(2, 1000, OTHER)];
    const prompts = assessTransfer({ amount: paise(1000), recipient: { phone: PHONE }, history });
    expect(kinds(prompts)).toEqual(['new_payee']);
  });

  it('treats a contact with a payment date as known', () => {
    const contact = {
      id: 'c' as ContactId,
      name: 'Known',
      phone: PHONE,
      favourite: false,
      avatarColor: '#000',
      lastPaidAt: 5,
    } as Contact;
    const prompts = assessTransfer({
      amount: paise(1000),
      recipient: { phone: PHONE },
      history: [],
      contacts: [contact],
    });
    expect(prompts).toEqual([]);
  });
});

describe('unusual_amount', () => {
  const history = [send(1, 1000), send(2, 1200), send(3, 800), send(4, 1000)];

  it('flags amounts far above the median', () => {
    const prompts = assessTransfer({ amount: paise(5_001), recipient: { phone: PHONE }, history });
    expect(kinds(prompts)).toEqual(['unusual_amount']);
  });

  it('allows up to the threshold exactly', () => {
    const prompts = assessTransfer({ amount: paise(5_000), recipient: { phone: PHONE }, history });
    expect(prompts).toEqual([]);
  });

  it('needs enough history to judge', () => {
    const prompts = assessTransfer({
      amount: paise(900_000),
      recipient: { phone: PHONE },
      history: history.slice(0, 2),
    });
    expect(kinds(prompts)).not.toContain('unusual_amount');
  });

  it('computes the median over the most recent sends only', () => {
    const old = Array.from({ length: 10 }, (_, i) => send(i, 100_000));
    const recent = Array.from({ length: 20 }, (_, i) => send(100 + i, 1000));
    expect(medianRecentSend([...old, ...recent], 20, 3)).toBe(1000);
  });
});

describe('large_amount and limits', () => {
  it('warns at the large-amount threshold', () => {
    const prompts = assessTransfer({
      amount: paise(1_000_000),
      recipient: { phone: PHONE },
      history: [send(1, 1000)],
    });
    expect(prompts).toEqual([expect.objectContaining({ kind: 'large_amount', severity: 'warn' })]);
  });

  it('blocks above the per-transaction limit', () => {
    const prompts = assessTransfer({
      amount: paise(60_000),
      recipient: { phone: PHONE },
      history: [send(1, 1000)],
      limits: limits(50_000, 1_000_000, 0),
    });
    expect(hasBlocker(prompts)).toBe(true);
  });

  it('blocks above what is left of the daily limit', () => {
    const prompts = assessTransfer({
      amount: paise(20_001),
      recipient: { phone: PHONE },
      history: [send(1, 1000)],
      limits: limits(50_000, 100_000, 80_000),
    });
    expect(prompts[0]).toMatchObject({ severity: 'block', kind: 'large_amount' });
    expect(prompts[0]?.message).toContain('200.00');
  });

  it('lets an amount equal to the remaining daily limit through', () => {
    const prompts = assessTransfer({
      amount: paise(20_000),
      recipient: { phone: PHONE },
      history: [send(1, 1000)],
      limits: limits(50_000, 100_000, 80_000),
    });
    expect(hasBlocker(prompts)).toBe(false);
  });

  it('sorts the most severe prompt first and is deterministic', () => {
    const input = {
      amount: paise(2_000_000),
      recipient: { phone: OTHER },
      history: [send(1, 1000), send(2, 1000), send(3, 1000)],
      limits: limits(5_000_000, 1_000_000, 0),
    };
    const first = assessTransfer(input);
    expect(first.map((p) => p.severity)).toEqual(['block', 'warn', 'info']);
    expect(assessTransfer(input)).toEqual(first);
  });
});
