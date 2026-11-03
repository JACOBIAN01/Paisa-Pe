export type Unsubscribe = () => void;

export type Handler<P> = (payload: P) => void;

export interface EventBus<M extends object> {
  on<K extends keyof M>(name: K, handler: Handler<M[K]>): Unsubscribe;
  once<K extends keyof M>(name: K, handler: Handler<M[K]>): Unsubscribe;
  off<K extends keyof M>(name: K, handler: Handler<M[K]>): void;
  emit<K extends keyof M>(name: K, payload: M[K]): void;
  listenerCount<K extends keyof M>(name: K): number;
  clear(): void;
}

export interface EventBusOptions {
  /** Called when a handler throws. The error never reaches the emitter or other handlers. */
  onHandlerError?: (name: PropertyKey, error: unknown) => void;
}

export function createEventBus<M extends object>(options: EventBusOptions = {}): EventBus<M> {
  const handlers = new Map<keyof M, Set<Handler<never>>>();

  const bucket = (name: keyof M): Set<Handler<never>> => {
    let set = handlers.get(name);
    if (!set) {
      set = new Set();
      handlers.set(name, set);
    }
    return set;
  };

  const off: EventBus<M>['off'] = (name, handler) => {
    const set = handlers.get(name);
    if (!set) return;
    set.delete(handler as Handler<never>);
    if (set.size === 0) handlers.delete(name);
  };

  const on: EventBus<M>['on'] = (name, handler) => {
    // Wrap so the same function can be registered twice and removed independently.
    const entry: Handler<M[typeof name]> = (payload) => handler(payload);
    bucket(name).add(entry as Handler<never>);
    let active = true;
    return () => {
      if (!active) return;
      active = false;
      off(name, entry);
    };
  };

  const once: EventBus<M>['once'] = (name, handler) => {
    const unsubscribe: Unsubscribe = on(name, (payload) => {
      unsubscribe();
      handler(payload);
    });
    return unsubscribe;
  };

  const emit: EventBus<M>['emit'] = (name, payload) => {
    const set = handlers.get(name);
    if (!set) return;
    for (const handler of [...set]) {
      if (!set.has(handler)) continue;
      try {
        (handler as Handler<typeof payload>)(payload);
      } catch (error) {
        options.onHandlerError?.(name, error);
      }
    }
  };

  return {
    on,
    once,
    off,
    emit,
    listenerCount: (name) => handlers.get(name)?.size ?? 0,
    clear: () => handlers.clear(),
  };
}
