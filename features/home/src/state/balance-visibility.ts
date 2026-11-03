import { create } from 'zustand';

interface BalanceVisibilityState {
  /** Session-only override of the saved "hide balance" preference. */
  revealed: boolean | null;
  toggle: (currentlyMasked: boolean) => void;
  reset: () => void;
}

export const useBalanceVisibility = create<BalanceVisibilityState>((set) => ({
  revealed: null,
  toggle: (currentlyMasked) => set({ revealed: currentlyMasked }),
  reset: () => set({ revealed: null }),
}));

/** Balance is masked when the preference says so, unless revealed for this session. */
export const isBalanceMasked = (hidePreference: boolean, revealed: boolean | null): boolean =>
  revealed === null ? hidePreference : !revealed;
