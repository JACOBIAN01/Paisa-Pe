import { useEffect, useState } from 'react';
import { useService } from '@pp/core-di';
import { PROFILE_SERVICE } from '@pp/svc-profile';
import { buildMyQrPayload } from '../state/payload';

export interface MyPayload {
  payload: string | null;
  name: string | null;
  failed: boolean;
}

export function useMyPayload(): MyPayload {
  const profile = useService(PROFILE_SERVICE);
  const [state, setState] = useState<MyPayload>({ payload: null, name: null, failed: false });

  useEffect(() => {
    let live = true;
    profile
      .getProfile()
      .then((user) => {
        if (live)
          setState({ payload: buildMyQrPayload(user.phone), name: user.name, failed: false });
      })
      .catch(() => {
        if (live) setState({ payload: null, name: null, failed: true });
      });
    return () => {
      live = false;
    };
  }, [profile]);

  return state;
}
