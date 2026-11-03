import { paise } from '@pp/core-money';
import { parseTransferParams } from '../index';

const PHONE = '+919800000002';

describe('parseTransferParams', () => {
  it('parses a query string, a full url and an object the same way', () => {
    const expected = { to: PHONE, amount: paise(25_050), note: 'dinner out' };
    const query = `to=${encodeURIComponent(PHONE)}&amount=250.50&note=dinner+out`;
    for (const input of [query, `?${query}`, `paisape://pay?${query}`]) {
      const r = parseTransferParams(input);
      expect(r.ok && r.value).toEqual(expected);
    }
    const obj = parseTransferParams({ to: PHONE, amount: '250.50', note: 'dinner out' });
    expect(obj.ok && obj.value).toEqual(expected);
  });

  it('rejects duplicate keys instead of picking one', () => {
    const r = parseTransferParams(`to=${encodeURIComponent(PHONE)}&amount=1&amount=9999`);
    expect(r.ok).toBe(false);
    expect(parseTransferParams({ to: PHONE, amount: ['1', '9999'] }).ok).toBe(false);
  });

  it('rejects missing or invalid fields', () => {
    expect(parseTransferParams('amount=10').ok).toBe(false);
    expect(parseTransferParams(`to=${encodeURIComponent(PHONE)}`).ok).toBe(false);
    expect(parseTransferParams(`to=${encodeURIComponent(PHONE)}&amount=1e3`).ok).toBe(false);
    expect(parseTransferParams(`to=${encodeURIComponent(PHONE)}&amount=0`).ok).toBe(false);
    expect(parseTransferParams(`to=12345&amount=10`).ok).toBe(false);
    expect(
      parseTransferParams(`to=${encodeURIComponent(PHONE)}&amount=1&note=${'x'.repeat(141)}`).ok,
    ).toBe(false);
  });
});
