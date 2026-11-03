import { parseDeepLink } from '../parse';

describe('parseDeepLink', () => {
  it('parses a pay link with an encoded plus', () => {
    expect(parseDeepLink('paisape://pay?to=%2B919812345678&amount=250.50&note=Lunch')).toEqual({
      route: 'send-confirm',
      params: { to: '+919812345678', amount: '250.50', note: 'Lunch' },
    });
  });

  it('keeps a literal plus in the phone number', () => {
    expect(parseDeepLink('paisape://pay?to=+919812345678&amount=10')?.params.to).toBe(
      '+919812345678',
    );
  });

  it('accepts the https host and ignores utm params', () => {
    expect(parseDeepLink('https://paisape.app/rewards?utm_source=mail')).toEqual({
      route: 'rewards',
      params: {},
    });
  });

  it('parses id routes', () => {
    expect(parseDeepLink('paisape://txn/txn_123')).toEqual({
      route: 'txn-detail',
      params: { id: 'txn_123' },
    });
    expect(parseDeepLink('paisape://txn')).toBeNull();
    expect(parseDeepLink('paisape://txn/a/b')).toBeNull();
    expect(parseDeepLink('paisape://txn/bad%20id')).toBeNull();
  });

  it('rejects duplicate query keys', () => {
    expect(parseDeepLink('paisape://pay?to=%2B919812345678&amount=1&amount=9999')).toBeNull();
  });

  it.each([
    ['unknown host', 'https://evil.example/pay?to=%2B919812345678&amount=1'],
    ['lookalike host', 'https://paisape.app.evil.example/home'],
    ['userinfo host', 'https://paisape.app@evil.example/home'],
    ['http scheme', 'http://paisape.app/home'],
    ['unknown route', 'paisape://admin'],
    ['prototype key', 'paisape://constructor'],
    ['bad phone', 'paisape://pay?to=12345&amount=1'],
    ['missing amount', 'paisape://pay?to=%2B919812345678'],
    ['exponent amount', 'paisape://pay?to=%2B919812345678&amount=1e3'],
    ['zero amount', 'paisape://pay?to=%2B919812345678&amount=0'],
    ['stray param on strict route', 'paisape://home?next=pay'],
    ['bad escape', 'paisape://pay?to=%E0%A4%A'],
    ['other scheme', 'javascript:alert(1)'],
  ])('rejects %s', (_name, url) => {
    expect(parseDeepLink(url)).toBeNull();
  });

  it('is case-insensitive for scheme and path head', () => {
    expect(parseDeepLink('PAISAPE://Home')?.route).toBe('home');
  });
});
