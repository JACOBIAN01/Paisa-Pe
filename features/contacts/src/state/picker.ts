import { create } from 'zustand';
import type { Contact } from '@pp/contracts-domain';

interface PickerState {
  selection: Contact | null;
  select: (contact: Contact) => void;
  clear: () => void;
}

/** Holds the contact chosen on the picker screen until the caller reads it. */
export const useContactPickerStore = create<PickerState>((set) => ({
  selection: null,
  select: (contact) => set({ selection: contact }),
  clear: () => set({ selection: null }),
}));
