import { useEffect, useRef } from 'react';
import { appStateObserver, type AppStateObserver } from '@pp/platform-lifecycle';
import { expoClipboard, type ClipboardAdapter } from './adapter';
import { extractOtp } from './extract';

export interface ClipboardOtpOptions {
  onOtp(code: string): void;
  enabled: boolean;
  clipboard?: ClipboardAdapter;
  observer?: AppStateObserver;
}

/**
 * Offers an OTP found on the clipboard to `onOtp` when enabled and whenever the app
 * becomes active. It never submits anything; each distinct code is offered once.
 */
export function useClipboardOtp({
  onOtp,
  enabled,
  clipboard = expoClipboard,
  observer = appStateObserver,
}: ClipboardOtpOptions): void {
  const onOtpRef = useRef(onOtp);
  useEffect(() => {
    onOtpRef.current = onOtp;
  }, [onOtp]);

  useEffect(() => {
    if (!enabled) return undefined;
    let cancelled = false;
    let offered: string | null = null;

    const read = async (): Promise<void> => {
      let text: string;
      try {
        text = await clipboard.getString();
      } catch {
        return;
      }
      if (cancelled) return;
      const code = extractOtp(text);
      if (code === null || code === offered) return;
      offered = code;
      onOtpRef.current(code);
    };

    void read();
    const unsubscribe = observer.subscribe((state) => {
      if (state === 'active') void read();
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [enabled, clipboard, observer]);
}
