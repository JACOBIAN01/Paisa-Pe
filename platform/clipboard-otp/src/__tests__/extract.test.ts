import { extractOtp } from '../extract';

describe('extractOtp', () => {
  it.each([
    ['123456', '123456'],
    ['  482913\n', '482913'],
    ['Your PaisaPe OTP is 123456. Valid 5 min', '123456'],
    ['123456 is your verification code for PaisaPe', '123456'],
    ['Use one-time password 998877 to log in.', '998877'],
  ])('reads %j', (text, expected) => {
    expect(extractOtp(text)).toBe(expected);
  });

  it.each([
    ['two codes', 'order 123456 and 654321'],
    ['no keyword', 'tracking number 123456 shipped'],
    ['seven digits', '1234567'],
    ['five digits', '12345'],
    ['digits with text', 'call 123456 now'],
    ['decimal amount', 'OTP for payment of 1234.567890'],
    ['grouped number', 'OTP 12,345,678'],
    ['empty', ''],
    ['long text', `OTP 123456 ${'x'.repeat(250)}`],
    ['other digit scripts', '१२३४५६'],
    ['password manager text', 'hunter2 correct-horse 654321 OTP 111111 222222'],
  ])('ignores %s', (_n, text) => {
    expect(extractOtp(text)).toBeNull();
  });
});
