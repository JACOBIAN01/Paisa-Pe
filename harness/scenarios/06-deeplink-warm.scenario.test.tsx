import { useMemo } from 'react';
import { Text } from 'react-native';
import { act } from '@testing-library/react-native';
import { createMemorySink, resetSink, setSink } from '@pp/core-logging';
import { createDeepLinkRouter, useDeepLinks } from '@pp/platform-deeplink';
import { createFakeLinking, createTestApp, recordEvents, renderWithApp } from '@pp/harness';

const PAYEE = encodeURIComponent('+919800000002');
const PAY = `paisape://pay?to=${PAYEE}&amount=100.00`;

describe('scenario: links that arrive while the app is running', () => {
  beforeEach(() => setSink(createMemorySink()));
  afterEach(() => resetSink());

  it('opens each link once and stops listening when disposed', async () => {
    const app = await createTestApp();
    const events = recordEvents();
    const linking = createFakeLinking();
    const navigate = jest.fn();
    const router = createDeepLinkRouter({
      linking,
      navigate,
      isReady: () => true,
      isLocked: () => false,
      subscribeUnlock: () => () => undefined,
    });
    await router.start();
    await router.start();
    expect(linking.listenerCount()).toBe(1);

    linking.emit(PAY);
    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith('send-confirm', {
      to: '+919800000002',
      amount: '100.00',
    });

    linking.emit('paisape://rewards');
    expect(navigate).toHaveBeenCalledTimes(2);
    expect(navigate).toHaveBeenLastCalledWith('rewards', {});
    expect(events.of('deeplink.received').map((e) => e.source)).toEqual(['warm', 'warm']);

    router.dispose();
    expect(linking.listenerCount()).toBe(0);
    linking.emit(PAY);
    expect(navigate).toHaveBeenCalledTimes(2);
    events.stop();
    app.dispose();
  });

  it('ignores links from other hosts and unknown routes', async () => {
    const linking = createFakeLinking();
    const navigate = jest.fn();
    const router = createDeepLinkRouter({
      linking,
      navigate,
      isReady: () => true,
      isLocked: () => false,
      subscribeUnlock: () => () => undefined,
    });
    await router.start();
    linking.emit('https://evil.example/pay?to=x&amount=1');
    linking.emit('paisape://admin');
    linking.emit('not a url');
    expect(navigate).not.toHaveBeenCalled();
    router.dispose();
  });

  it('leaves no listener behind however often a screen is opened and closed', async () => {
    const linking = createFakeLinking();
    const navigate = jest.fn();
    function Host() {
      const router = useMemo(
        () =>
          createDeepLinkRouter({
            linking,
            navigate,
            isReady: () => true,
            isLocked: () => false,
            subscribeUnlock: () => () => undefined,
          }),
        [],
      );
      useDeepLinks(router);
      return <Text testID="host">host</Text>;
    }

    const app = await createTestApp();
    for (let visit = 0; visit < 4; visit += 1) {
      const view = await renderWithApp(<Host />, { app });
      await act(async () => undefined);
      expect(linking.listenerCount()).toBe(1);
      await view.unmount();
      expect(linking.listenerCount()).toBe(0);
    }

    linking.emit(PAY);
    expect(navigate).not.toHaveBeenCalled();
    app.dispose();
  });
});
