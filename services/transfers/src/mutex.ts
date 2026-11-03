/** Runs async sections one at a time, in call order. */
export interface Mutex {
  runExclusive<T>(fn: () => Promise<T>): Promise<T>;
}

export function createMutex(): Mutex {
  let tail: Promise<unknown> = Promise.resolve();
  return {
    runExclusive<T>(fn: () => Promise<T>): Promise<T> {
      const run = tail.then(fn, fn);
      tail = run.catch(() => undefined);
      return run;
    },
  };
}
