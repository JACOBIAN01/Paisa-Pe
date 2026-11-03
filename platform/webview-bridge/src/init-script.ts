import type { NativeToWeb } from '@pp/contracts-ipc';

const LINE_SEPARATOR = String.fromCharCode(0x2028);
const PARAGRAPH_SEPARATOR = String.fromCharCode(0x2029);

/** Script injected into the page to deliver a native message. Returns `true` as WebView requires. */
export function buildInitScript(message: NativeToWeb): string {
  const literal = JSON.stringify(JSON.stringify(message))
    .split(LINE_SEPARATOR)
    .join('\\u2028')
    .split(PARAGRAPH_SEPARATOR)
    .join('\\u2029');
  return `window.__ppReceive && window.__ppReceive(${literal}); true;`;
}
