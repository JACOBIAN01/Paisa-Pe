import { useCallback } from 'react';
import { useRouter } from 'expo-router';
import type { Contact } from '@pp/contracts-domain';
import { useContactPickerStore } from '../state/picker';

export interface ContactPicker {
  /** Opens the contacts screen in pick mode. */
  open: () => void;
  /** The contact chosen since the last `clear`. */
  selection: Contact | null;
  clear: () => void;
}

export function useContactPicker(): ContactPicker {
  const router = useRouter();
  const selection = useContactPickerStore((s) => s.selection);
  const clear = useContactPickerStore((s) => s.clear);
  const open = useCallback(() => {
    clear();
    router.push({ pathname: '/contacts', params: { mode: 'pick' } });
  }, [clear, router]);
  return { open, selection, clear };
}
