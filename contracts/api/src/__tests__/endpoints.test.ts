import { endpoints } from '../index';

const entries = Object.entries(endpoints);

describe('endpoint table', () => {
  it('has unique method + path pairs', () => {
    const keys = entries.map(([, e]) => `${e.method} ${e.path}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('declares a params schema for every path parameter', () => {
    for (const [name, e] of entries) {
      const hasParam = e.path.includes(':');
      expect({ name, hasParams: 'params' in e }).toEqual({ name, hasParams: hasParam });
    }
  });

  it('only sends bodies on mutating methods', () => {
    for (const [name, e] of entries) {
      if (e.method === 'GET') expect({ name, body: 'body' in e }).toEqual({ name, body: false });
    }
  });

  it('marks money-moving POSTs as idempotent', () => {
    const must = [
      'transfers.send',
      'wallet.addMoney',
      'requests.pay',
      'bills.pay',
      'bills.recharge',
    ];
    for (const name of must) {
      expect((endpoints as Record<string, { idempotent?: boolean }>)[name]?.idempotent).toBe(true);
    }
  });

  it('validates a transfer request body', () => {
    const body = endpoints['transfers.send'].body;
    expect(body.safeParse({ to: { phone: '+919812345678' }, amount: 5000 }).success).toBe(true);
    expect(body.safeParse({ to: { phone: '+919812345678' }, amount: 50.5 }).success).toBe(false);
  });
});
