import { useState } from 'react';
import { ErrorBanner, PinPad, Sheet, Stack, Text } from '@pp/design-system';
import { t } from '@pp/core-i18n';
import { useService } from '@pp/core-di';
import { PIN_SERVICE, useAuthState } from '@pp/svc-auth';
import { messageFor } from '../state/errors';

interface Props {
  visible: boolean;
  onClose: () => void;
  onChanged: () => void;
}

export function ChangePinSheet({ visible, onClose, onChanged }: Props) {
  const pins = useService(PIN_SERVICE);
  const { activeUserId } = useAuthState();
  const [current, setCurrent] = useState<string | null>(null);
  const [next, setNext] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reset = (): void => {
    setCurrent(null);
    setNext(null);
  };

  const close = (): void => {
    reset();
    setError(null);
    onClose();
  };

  const handle = async (pin: string): Promise<void> => {
    if (current === null) return setCurrent(pin);
    if (next === null) return setNext(pin);
    if (pin !== next) {
      setNext(null);
      return setError(t('auth.pinMismatch'));
    }
    if (!activeUserId) return;
    try {
      const result = await pins.changePin(activeUserId, current, next);
      if (result.ok) {
        reset();
        setError(null);
        onChanged();
        return;
      }
      reset();
      setError(
        result.reason === 'wrong'
          ? t('auth.wrongPin', { remaining: result.attemptsLeft })
          : t('auth.lockedOut', { seconds: Math.ceil(result.remainingMs / 1000) }),
      );
    } catch (e) {
      reset();
      setError(messageFor(e));
    }
  };

  const prompt =
    current === null ? t('auth.enterPin') : next === null ? t('auth.setPin') : t('auth.confirmPin');

  return (
    <Sheet visible={visible} onClose={close} title="Change PIN">
      <Stack gap="lg" align="center">
        <Text>{prompt}</Text>
        {error ? <ErrorBanner message={error} /> : null}
        <PinPad onComplete={(pin) => void handle(pin)} />
      </Stack>
    </Sheet>
  );
}
