import { isAllowedOrigin, originOf, shouldStartLoad } from '../origins';

describe('origins', () => {
  it('extracts a normalised origin', () => {
    expect(originOf('HTTPS://Help.PaisaPe.app/articles/1?x=1')).toBe('https://help.paisape.app');
    expect(originOf('https://help.paisape.app:8443/x')).toBe('https://help.paisape.app:8443');
    expect(originOf('about:blank')).toBeNull();
  });

  it.each([
    'https://help.paisape.app/a',
    'https://help.paisape.app',
    'https://HELP.paisape.app/a#frag',
  ])('allows %s', (url) => {
    expect(isAllowedOrigin(url)).toBe(true);
    expect(shouldStartLoad(url)).toBe(true);
  });

  it.each([
    'http://help.paisape.app/a',
    'https://help.paisape.app.evil.example/a',
    'https://evil.example/help.paisape.app',
    'https://help.paisape.app@evil.example/a',
    'https://help.paisape.app\\@evil.example/a',
    'https://help.paisape.app:444/a',
    'javascript:alert(1)',
    'file:///etc/passwd',
    '',
  ])('rejects %s', (url) => {
    expect(isAllowedOrigin(url)).toBe(false);
  });
});
