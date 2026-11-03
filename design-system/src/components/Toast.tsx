import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '../theme';
import { radii, spacing } from '../tokens/layout';
import { Text } from '../primitives/Text';

export type ToastTone = 'info' | 'success' | 'error';

export interface ToastItem {
  id: string;
  message: string;
  tone: ToastTone;
}

interface ToastApi {
  show: (message: string, tone?: ToastTone) => string;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);
const DEFAULT_DURATION_MS = 3000;

const newToastId = (): string => Math.random().toString(36).slice(2);

export interface ToastProviderProps {
  children: ReactNode;
  durationMs?: number;
}

export function ToastProvider({ children, durationMs = DEFAULT_DURATION_MS }: ToastProviderProps) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: string) => {
    const timer = timers.current.get(id);
    if (timer) clearTimeout(timer);
    timers.current.delete(id);
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const show = useCallback(
    (message: string, tone: ToastTone = 'info') => {
      const id = newToastId();
      setItems((prev) => [...prev, { id, message, tone }]);
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), durationMs),
      );
      return id;
    },
    [dismiss, durationMs],
  );

  useEffect(() => {
    const active = timers.current;
    return () => {
      active.forEach((timer) => clearTimeout(timer));
      active.clear();
    };
  }, []);

  const api = useMemo(() => ({ show, dismiss }), [show, dismiss]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <ToastViewport items={items} />
    </ToastContext.Provider>
  );
}

function ToastViewport({ items }: { items: ToastItem[] }) {
  const { colors } = useTheme();
  const tones: Record<ToastTone, string> = {
    info: colors.text,
    success: colors.success,
    error: colors.danger,
  };
  return (
    <View pointerEvents="none" style={styles.viewport}>
      {items.map((item) => (
        <View
          key={item.id}
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          style={[styles.toast, { backgroundColor: tones[item.tone] }]}
        >
          <Text variant="body" color="textInverse">
            {item.message}
          </Text>
        </View>
      ))}
    </View>
  );
}

export function useToast(): ToastApi {
  const api = useContext(ToastContext);
  if (!api) throw new Error('useToast must be used inside ToastProvider');
  return api;
}

const styles = StyleSheet.create({
  viewport: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 48,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  toast: { borderRadius: radii.md, padding: spacing.md },
});
