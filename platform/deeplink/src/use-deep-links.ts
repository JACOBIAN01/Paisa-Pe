import { useEffect } from 'react';
import type { DeepLinkRouter } from './router';

/** Starts the router on mount and always tears it down on unmount. */
export function useDeepLinks(router: DeepLinkRouter): void {
  useEffect(() => {
    void router.start();
    return () => router.dispose();
  }, [router]);
}
