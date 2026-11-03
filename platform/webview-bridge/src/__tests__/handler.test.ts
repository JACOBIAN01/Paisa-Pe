import { createMemorySink, resetSink, setSink } from '@pp/core-logging';
import type { NativeToWeb } from '@pp/contracts-ipc';
import { buildInitScript } from '../init-script';
import { createBridgeHandler } from '../handler';

const URL_OK = 'https://help.paisape.app/articles/1';
const INIT: NativeToWeb = {
  v: 1,
  id: 'i1',
  type: 'init',
  payload: { theme: 'dark', language: 'en', appVersion: '1.0.0' },
};

const msg = (type: string, payload: unknown = {}) =>
  JSON.stringify({ v: 1, id: 'm1', type, payload });

function setup() {
  const deps = {
    navigate: jest.fn(),
    openArticle: jest.fn(),
    onResize: jest.fn(),
    onContactSupport: jest.fn(),
    onClose: jest.fn(),
    getInitMessage: () => INIT,
    injectScript: jest.fn(),
  };
  const handler = createBridgeHandler(deps);
  const send = (data: string, url = URL_OK) => handler.onMessage({ nativeEvent: { data, url } });
  return { deps, handler, send };
}

beforeEach(() => setSink(createMemorySink()));
afterEach(() => resetSink());

describe('bridge handler', () => {
  it('delivers the init message on ready', () => {
    const { deps, send } = setup();
    expect(send(msg('ready'))).toBe('handled');
    expect(deps.injectScript).toHaveBeenCalledWith(buildInitScript(INIT));
  });

  it('handles resize, article, support and close', () => {
    const { deps, send } = setup();
    send(msg('resize', { height: 640 }));
    send(msg('open-article', { articleId: 'a-9' }));
    send(msg('contact-support', { topic: 'cards' }));
    send(msg('close'));
    expect(deps.onResize).toHaveBeenCalledWith(640);
    expect(deps.openArticle).toHaveBeenCalledWith('a-9');
    expect(deps.onContactSupport).toHaveBeenCalledWith('cards');
    expect(deps.onClose).toHaveBeenCalledTimes(1);
  });

  it('navigates only to safe parameterless routes', () => {
    const { deps, send } = setup();
    expect(send(msg('navigate', { route: 'settings' }))).toBe('handled');
    expect(deps.navigate).toHaveBeenCalledWith('settings');
    for (const route of ['send', 'send-confirm', 'request', 'bills', 'txn-detail', 'nope']) {
      expect(send(msg('navigate', { route }))).toBe('blocked_route');
    }
    expect(deps.navigate).toHaveBeenCalledTimes(1);
  });

  it('rejects messages from other origins before parsing', () => {
    const { deps, send } = setup();
    expect(send(msg('navigate', { route: 'home' }), 'https://evil.example/x')).toBe(
      'rejected_origin',
    );
    expect(send(msg('close'), 'https://help.paisape.app.evil.example/')).toBe('rejected_origin');
    expect(deps.navigate).not.toHaveBeenCalled();
    expect(deps.onClose).not.toHaveBeenCalled();
  });

  it('rejects malformed, oversized and unknown messages', () => {
    const { deps, send } = setup();
    expect(send('not json')).toBe('invalid');
    expect(send(msg('eval', { code: 'x' }))).toBe('invalid');
    expect(send(JSON.stringify({ type: 'close' }))).toBe('invalid');
    expect(send(msg('resize', { height: -1 }))).toBe('invalid');
    expect(send(`{"pad":"${'a'.repeat(5_000)}"}`)).toBe('invalid');
    expect(deps.onClose).not.toHaveBeenCalled();
  });

  it('gates WebView navigation by origin', () => {
    const { handler } = setup();
    expect(handler.shouldStartLoad(URL_OK)).toBe(true);
    expect(handler.shouldStartLoad('https://evil.example')).toBe(false);
  });
});

describe('buildInitScript', () => {
  it('embeds the message as a string literal that round-trips', () => {
    const script = buildInitScript(INIT);
    expect(script.endsWith('true;')).toBe(true);
    const literal = /__ppReceive\((.*)\); true;$/.exec(script)?.[1] ?? '';
    expect(JSON.parse(JSON.parse(literal))).toEqual(INIT);
  });

  it('escapes line separators', () => {
    const script = buildInitScript({
      ...INIT,
      payload: { ...INIT.payload, appVersion: 'a b' } as never,
    });
    expect(script).not.toContain(' ');
  });
});
