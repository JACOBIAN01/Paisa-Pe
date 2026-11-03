export type Probe = () => Promise<boolean>;

export interface FetchProbeOptions {
  url?: string;
  timeoutMs?: number;
  fetchImpl?: (url: string, init: { method: string; signal: AbortSignal }) => Promise<unknown>;
}

export const DEFAULT_PROBE_URL = 'https://api.paisape.app/health';

/** Any HTTP response counts as online; a failure or timeout counts as offline. */
export function createFetchProbe(options: FetchProbeOptions = {}): Probe {
  const url = options.url ?? DEFAULT_PROBE_URL;
  const timeoutMs = options.timeoutMs ?? 4_000;
  const fetchImpl = options.fetchImpl ?? ((u, init) => fetch(u, init));

  return async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      await fetchImpl(url, { method: 'HEAD', signal: controller.signal });
      return true;
    } catch {
      return false;
    } finally {
      clearTimeout(timer);
    }
  };
}
