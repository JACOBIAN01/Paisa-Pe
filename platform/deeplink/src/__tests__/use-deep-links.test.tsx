import { renderHook } from '@testing-library/react-native';
import type { DeepLinkRouter } from '../router';
import { useDeepLinks } from '../use-deep-links';

describe('useDeepLinks', () => {
  it('starts on mount and disposes on unmount', async () => {
    const router: DeepLinkRouter = {
      start: jest.fn(async () => undefined),
      flush: jest.fn(),
      pending: () => 0,
      dispose: jest.fn(),
    };
    const { unmount } = await renderHook(() => useDeepLinks(router));
    expect(router.start).toHaveBeenCalledTimes(1);
    expect(router.dispose).not.toHaveBeenCalled();
    await unmount();
    expect(router.dispose).toHaveBeenCalledTimes(1);
  });
});
