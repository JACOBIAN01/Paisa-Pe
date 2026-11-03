import { createContainer, createToken } from '../container';

const A = createToken<number>('A');
const B = createToken<string>('B');

describe('container', () => {
  it('resolves lazily and caches', () => {
    const c = createContainer();
    const factory = jest.fn(() => 42);
    c.register(A, factory);
    expect(factory).not.toHaveBeenCalled();
    expect(c.resolve(A)).toBe(42);
    expect(c.resolve(A)).toBe(42);
    expect(factory).toHaveBeenCalledTimes(1);
  });

  it('resolves dependencies through the container', () => {
    const c = createContainer();
    c.registerValue(A, 2);
    c.register(B, (ct) => `n=${ct.resolve(A)}`);
    expect(c.resolve(B)).toBe('n=2');
  });

  it('throws on duplicate registration and missing tokens', () => {
    const c = createContainer();
    c.registerValue(A, 1);
    expect(() => c.registerValue(A, 2)).toThrow(/already registered/);
    expect(() => c.resolve(B)).toThrow(/No provider/);
  });

  it('detects cycles', () => {
    const c = createContainer();
    c.register(A, (ct) => ct.resolve(A));
    expect(() => c.resolve(A)).toThrow(/Circular/);
  });

  it('child falls back to parent and can override locally', () => {
    const parent = createContainer();
    parent.registerValue(A, 1);
    const child = parent.child();
    expect(child.resolve(A)).toBe(1);
    expect(child.has(A)).toBe(true);
    child.override(A, () => 9);
    expect(child.resolve(A)).toBe(9);
    expect(parent.resolve(A)).toBe(1);
  });

  it('override drops the cached instance', () => {
    const c = createContainer();
    c.registerValue(A, 1);
    expect(c.resolve(A)).toBe(1);
    c.override(A, () => 2);
    expect(c.resolve(A)).toBe(2);
  });
});
