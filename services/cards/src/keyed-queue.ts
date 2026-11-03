/** Runs tasks that share a key one after another, in call order; different keys run freely. */
export function createKeyedQueue() {
  const tails = new Map<string, Promise<unknown>>();
  return {
    run<T>(key: string, task: () => Promise<T>): Promise<T> {
      const previous = tails.get(key) ?? Promise.resolve();
      const run = previous.then(task, task);
      const tail = run.catch(() => undefined);
      tails.set(key, tail);
      void tail.then(() => {
        if (tails.get(key) === tail) tails.delete(key);
      });
      return run;
    },
  };
}
