import {
  CouponSchema,
  ERROR_CODES,
  ErrorCodeSchema,
  PaiseSchema,
  PhoneSchema,
  ROUTE_PARAMS,
  RouteNameSchema,
  TxnSchema,
} from '../index';

const txn = {
  id: 'txn_1',
  type: 'p2p_send',
  status: 'success',
  amount: 25000,
  fee: 0,
  balanceAfter: 100000,
  counterparty: { name: 'Asha', phone: '+919812345678' },
  createdAt: 1_700_000_000_000,
  updatedAt: 1_700_000_000_000,
};

describe('money', () => {
  it('accepts integer paise only', () => {
    expect(PaiseSchema.safeParse(100).success).toBe(true);
    expect(PaiseSchema.safeParse(10.5).success).toBe(false);
    expect(PaiseSchema.safeParse(Number.MAX_SAFE_INTEGER + 1).success).toBe(false);
  });
});

describe('phone', () => {
  it.each(['+919812345678', '+916000000000'])('accepts %s', (phone) => {
    expect(PhoneSchema.safeParse(phone).success).toBe(true);
  });
  it.each(['9812345678', '+915812345678', '+91981234567', '+9198123456789'])(
    'rejects %s',
    (phone) => {
      expect(PhoneSchema.safeParse(phone).success).toBe(false);
    },
  );
});

describe('txn', () => {
  it('parses a valid transaction', () => {
    expect(TxnSchema.safeParse(txn).success).toBe(true);
  });
  it('rejects fractional amounts and unknown types', () => {
    expect(TxnSchema.safeParse({ ...txn, amount: 10.5 }).success).toBe(false);
    expect(TxnSchema.safeParse({ ...txn, type: 'gift' }).success).toBe(false);
  });
});

describe('coupon', () => {
  it('requires a positive value', () => {
    const base = {
      id: 'c1',
      code: 'WELCOME',
      title: 'Welcome',
      description: 'Flat off',
      kind: 'flat',
      value: 5000,
      minSpend: 10000,
      expiresAt: 1,
      status: 'available',
    };
    expect(CouponSchema.safeParse(base).success).toBe(true);
    expect(CouponSchema.safeParse({ ...base, value: 0 }).success).toBe(false);
  });
});

describe('errors and routes', () => {
  it('keeps error codes unique and parseable', () => {
    expect(new Set(ERROR_CODES).size).toBe(ERROR_CODES.length);
    expect(ErrorCodeSchema.safeParse('insufficient_funds').success).toBe(true);
  });
  it('exposes every route name', () => {
    expect(RouteNameSchema.options).toEqual(Object.keys(ROUTE_PARAMS));
  });
  it('validates send-confirm params', () => {
    const schema = ROUTE_PARAMS['send-confirm'];
    expect(schema.safeParse({ to: '+919812345678', amount: '250.00' }).success).toBe(true);
    expect(schema.safeParse({ to: 'nope', amount: '1' }).success).toBe(false);
  });
});
