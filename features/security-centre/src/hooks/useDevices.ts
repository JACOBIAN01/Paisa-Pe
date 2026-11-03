import { useCallback, useEffect, useState } from 'react';
import { useService } from '@pp/core-di';
import { AUTH_SERVICE } from '@pp/svc-auth';
import type { Device } from '@pp/contracts-domain';
import { messageFor } from '../state/errors';

export function useDevices() {
  const auth = useService(AUTH_SERVICE);
  const [devices, setDevices] = useState<Device[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setDevices(await auth.listDevices());
      setError(null);
    } catch (e) {
      setError(messageFor(e));
    }
  }, [auth]);

  useEffect(() => {
    let cancelled = false;
    auth
      .listDevices()
      .then((list) => {
        if (!cancelled) setDevices(list);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(messageFor(e));
      });
    return () => {
      cancelled = true;
    };
  }, [auth]);

  const revoke = useCallback(
    async (deviceId: string) => {
      try {
        await auth.revokeDevice(deviceId);
        await load();
      } catch (e) {
        setError(messageFor(e));
      }
    },
    [auth, load],
  );

  return { devices, error, revoke, reload: load };
}
