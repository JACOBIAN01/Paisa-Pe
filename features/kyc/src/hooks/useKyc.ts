import { useCallback, useEffect, useState } from 'react';
import { useService } from '@pp/core-di';
import { HTTP_CLIENT } from '@pp/core-net';
import { isAppError } from '@pp/core-result';
import { t } from '@pp/core-i18n';
import { LIMITS_SERVICE } from '@pp/svc-limits';
import type { KycStatus } from '@pp/contracts-domain';

export type DocType = 'aadhaar' | 'pan';

const toMessage = (e: unknown): string => {
  if (!isAppError(e)) return t('error.generic');
  if (e.code === 'network') return t('error.network');
  if (e.code === 'server_error') return t('error.server');
  return t('error.generic');
};

export function useKyc() {
  const http = useService(HTTP_CLIENT);
  const limits = useService(LIMITS_SERVICE);
  const [status, setStatus] = useState<KycStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const { status: next } = await http.call('kyc.status');
      setStatus(next);
      setError(null);
      if (next.state === 'approved') void limits.refresh().catch(() => undefined);
    } catch (e) {
      setError(toMessage(e));
    }
  }, [http, limits]);

  useEffect(() => {
    let cancelled = false;
    http
      .call('kyc.status')
      .then(({ status: next }) => {
        if (!cancelled) setStatus(next);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(toMessage(e));
      });
    return () => {
      cancelled = true;
    };
  }, [http]);

  const submit = useCallback(
    async (docType: DocType, docLast4: string) => {
      setBusy(true);
      setError(null);
      try {
        const { status: next } = await http.call('kyc.submit', { body: { docType, docLast4 } });
        setStatus(next);
      } catch (e) {
        setError(toMessage(e));
      } finally {
        setBusy(false);
      }
    },
    [http],
  );

  return { status, error, busy, submit, refresh };
}
