import { NativeToWebSchema, WebToNativeSchema } from '../index';

describe('bridge messages', () => {
  it('parses a navigate message', () => {
    const msg = { v: 1, id: 'm1', type: 'navigate', payload: { route: 'help' } };
    expect(WebToNativeSchema.safeParse(msg).success).toBe(true);
  });
  it('rejects unknown types and wrong versions', () => {
    expect(WebToNativeSchema.safeParse({ v: 1, id: 'm', type: 'eval', payload: {} }).success).toBe(
      false,
    );
    expect(WebToNativeSchema.safeParse({ v: 2, id: 'm', type: 'ready', payload: {} }).success).toBe(
      false,
    );
  });
  it('parses init for the web side', () => {
    const msg = {
      v: 1,
      id: 'm',
      type: 'init',
      payload: { theme: 'dark', language: 'hi', appVersion: '1.0.0' },
    };
    expect(NativeToWebSchema.safeParse(msg).success).toBe(true);
  });
});
