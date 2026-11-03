export interface Token<T> {
  readonly name: string;
  readonly _type?: T;
}

export const createToken = <T>(name: string): Token<T> => ({ name });

type Factory<T> = (container: Container) => T;

export interface Container {
  register<T>(token: Token<T>, factory: Factory<T>): void;
  registerValue<T>(token: Token<T>, value: T): void;
  resolve<T>(token: Token<T>): T;
  has(token: Token<unknown>): boolean;
  /** Replaces a binding on this container only; drops any cached instance. */
  override<T>(token: Token<T>, factory: Factory<T>): void;
  child(): Container;
}

interface Binding {
  factory: Factory<unknown>;
  resolved: boolean;
  value?: unknown;
}

export function createContainer(parent?: Container): Container {
  const bindings = new Map<Token<unknown>, Binding>();
  const resolving = new Set<Token<unknown>>();

  const bind = <T>(token: Token<T>, factory: Factory<T>): void => {
    bindings.set(token, { factory, resolved: false });
  };

  const container: Container = {
    register(token, factory) {
      if (bindings.has(token)) throw new Error(`Token already registered: ${token.name}`);
      bind(token, factory);
    },
    registerValue(token, value) {
      container.register(token, () => value);
    },
    override: bind,
    has: (token) => bindings.has(token) || (parent?.has(token) ?? false),
    resolve<T>(token: Token<T>): T {
      const binding = bindings.get(token);
      if (!binding) {
        if (parent) return parent.resolve(token);
        throw new Error(`No provider for token: ${token.name}`);
      }
      if (binding.resolved) return binding.value as T;
      if (resolving.has(token)) throw new Error(`Circular dependency: ${token.name}`);
      resolving.add(token);
      try {
        binding.value = binding.factory(container);
        binding.resolved = true;
        return binding.value as T;
      } finally {
        resolving.delete(token);
      }
    },
    child: () => createContainer(container),
  };
  return container;
}
