export type Cancel = () => void;

export const after = (ms: number, fn: () => void): Cancel => {
  const id = setTimeout(fn, ms);
  return () => clearTimeout(id);
};

export const every = (ms: number, fn: () => void): Cancel => {
  const id = setInterval(fn, ms);
  return () => clearInterval(id);
};

export const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
