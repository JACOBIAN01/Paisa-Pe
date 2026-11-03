import { createEventBus } from '../bus';

interface Map {
  ping: { n: number };
  pong: { ok: boolean };
}

describe('event bus', () => {
  it('delivers to handlers in subscription order', () => {
    const bus = createEventBus<Map>();
    const seen: string[] = [];
    bus.on('ping', () => seen.push('a'));
    bus.on('ping', () => seen.push('b'));
    bus.emit('ping', { n: 1 });
    expect(seen).toEqual(['a', 'b']);
  });

  it('unsubscribes and is idempotent', () => {
    const bus = createEventBus<Map>();
    const fn = jest.fn();
    const off = bus.on('ping', fn);
    off();
    off();
    bus.emit('ping', { n: 1 });
    expect(fn).not.toHaveBeenCalled();
    expect(bus.listenerCount('ping')).toBe(0);
  });

  it('isolates handler errors', () => {
    const onHandlerError = jest.fn();
    const bus = createEventBus<Map>({ onHandlerError });
    const after = jest.fn();
    bus.on('ping', () => {
      throw new Error('boom');
    });
    bus.on('ping', after);
    expect(() => bus.emit('ping', { n: 1 })).not.toThrow();
    expect(after).toHaveBeenCalledTimes(1);
    expect(onHandlerError).toHaveBeenCalledWith('ping', expect.any(Error));
  });

  it('once fires a single time', () => {
    const bus = createEventBus<Map>();
    const fn = jest.fn();
    bus.once('pong', fn);
    bus.emit('pong', { ok: true });
    bus.emit('pong', { ok: false });
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith({ ok: true });
  });

  it('same function registered twice is removed independently', () => {
    const bus = createEventBus<Map>();
    const fn = jest.fn();
    const offA = bus.on('ping', fn);
    bus.on('ping', fn);
    offA();
    bus.emit('ping', { n: 1 });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('handlers removed during emit are not called', () => {
    const bus = createEventBus<Map>();
    const second = jest.fn();
    let offSecond: () => void = () => undefined;
    bus.on('ping', () => offSecond());
    offSecond = bus.on('ping', second);
    bus.emit('ping', { n: 1 });
    expect(second).not.toHaveBeenCalled();
  });

  it('clear removes everything', () => {
    const bus = createEventBus<Map>();
    bus.on('ping', jest.fn());
    bus.on('pong', jest.fn());
    bus.clear();
    expect(bus.listenerCount('ping') + bus.listenerCount('pong')).toBe(0);
  });
});
