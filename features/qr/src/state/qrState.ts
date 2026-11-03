let lastScanned: string | null = null;

export const getLastScanned = (): string | null => lastScanned;
export const setLastScanned = (code: string): void => {
  lastScanned = code;
};

/** Clears the remembered scan. Tests call this between cases. */
export const resetQrState = (): void => {
  lastScanned = null;
};
