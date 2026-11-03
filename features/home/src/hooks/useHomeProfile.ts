import { useService } from '@pp/core-di';
import { keys, useQuery } from '@pp/core-query';
import { PROFILE_SERVICE } from '@pp/svc-profile';

export function useHomeProfile(userId: string | null): { name: string; hideBalance: boolean } {
  const profile = useService(PROFILE_SERVICE);
  const id = userId ?? '';
  const user = useQuery({
    key: keys.profile(id),
    fn: () => profile.getProfile(),
    staleMs: 60_000,
    enabled: userId !== null,
  });
  const prefs = useQuery({
    key: keys.preferences(id),
    fn: () => profile.getPreferences(),
    staleMs: 60_000,
    enabled: userId !== null,
  });
  return { name: user.data?.name ?? '', hideBalance: prefs.data?.hideBalance ?? false };
}
