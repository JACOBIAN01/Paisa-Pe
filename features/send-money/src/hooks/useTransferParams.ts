import { useMemo } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { parseTransferParams, type TransferParams } from '@pp/svc-transfers';

export type ParsedParams = { ok: true; value: TransferParams } | { ok: false; message: string };

/**
 * Parses the route params exactly once per distinct set of params. The confirm UI and the pay
 * handler both read this same value.
 */
export function useTransferParams(): ParsedParams {
  const raw = useLocalSearchParams();
  const signature = JSON.stringify(raw);
  return useMemo(() => {
    const result = parseTransferParams(raw as Record<string, string | string[] | undefined>);
    return result.ok
      ? { ok: true, value: result.value }
      : { ok: false, message: result.error.message };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `signature` is the stable identity of `raw`
  }, [signature]);
}
