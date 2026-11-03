import { createAppStateObserver } from '../app-state';
import { createFakeAppState } from './helpers';

describe('app state observer', () => {
  it('shares one native listener and removes it with the last subscriber', () => {
    const fake = createFakeAppState();
    const observer = createAppStateObserver(fake);
    const a = jest.fn();
    const b = jest.fn();
    const offA = observer.subscribe(a);
    const offB = observer.subscribe(b);
    expect(fake.listenerCount()).toBe(1);

    fake.set('inactive');
    expect(a).toHaveBeenCalledWith('inactive');
    expect(b).toHaveBeenCalledWith('inactive');
    expect(observer.current()).toBe('inactive');

    offA();
    offA();
    fake.set('background');
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(2);

    offB();
    expect(fake.listenerCount()).toBe(0);
  });

  it('does not call a listener removed during dispatch', () => {
    const fake = createFakeAppState();
    const observer = createAppStateObserver(fake);
    const second = jest.fn();
    let offSecond: () => void = () => undefined;
    observer.subscribe(() => offSecond());
    offSecond = observer.subscribe(second);
    fake.set('background');
    expect(second).not.toHaveBeenCalled();
  });

  it('reads the adapter state when nobody is subscribed', () => {
    const fake = createFakeAppState('background');
    expect(createAppStateObserver(fake).current()).toBe('background');
  });
});
