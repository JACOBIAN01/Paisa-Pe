import { useState } from 'react';
import { getClock } from '@pp/core-time';

/** The wall-clock time when the screen first rendered. */
export function useNow(): number {
  const [now] = useState(() => getClock().now());
  return now;
}
