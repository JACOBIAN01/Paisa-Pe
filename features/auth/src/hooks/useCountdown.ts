import { useCallback, useEffect, useState } from 'react';

/** Counts whole seconds down to zero; `restart` resets it. The interval is cleared on unmount. */
export function useCountdown(initialSeconds: number): [number, (seconds: number) => void] {
  const [remaining, setRemaining] = useState(Math.max(0, Math.ceil(initialSeconds)));
  const running = remaining > 0;

  useEffect(() => {
    if (!running) return undefined;
    const id = setInterval(() => setRemaining((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [running]);

  const restart = useCallback(
    (seconds: number) => setRemaining(Math.max(0, Math.ceil(seconds))),
    [],
  );
  return [remaining, restart];
}
