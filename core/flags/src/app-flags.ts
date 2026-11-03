import { createFlags } from './flags';

export const FLAG_DEFAULTS = {
  debugMenu: false,
  scratchCards: true,
  newSplitUi: false,
  offlineQueue: true,
  biometricUnlock: true,
  autopay: true,
  qrPayments: true,
  helpCentreWebview: true,
} as const satisfies Record<string, boolean>;

export type AppFlagValues = { -readonly [K in keyof typeof FLAG_DEFAULTS]: boolean };

export const appFlags = createFlags<AppFlagValues>({ ...FLAG_DEFAULTS });

export const resetFlags = (): void => {
  appFlags.clearOverrides();
  appFlags.applyRemote({ ...FLAG_DEFAULTS });
};
