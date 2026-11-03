import * as ExpoClipboard from 'expo-clipboard';

export interface ClipboardAdapter {
  getString(): Promise<string>;
}

export const expoClipboard: ClipboardAdapter = {
  getString: () => ExpoClipboard.getStringAsync(),
};
