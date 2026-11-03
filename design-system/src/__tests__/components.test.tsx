import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import {
  ConfirmDialog,
  EmptyState,
  ErrorBanner,
  ListRow,
  OtpInput,
  PinPad,
  Sheet,
  ToastProvider,
  useToast,
} from '../index';

describe('PinPad', () => {
  it('calls onComplete once the pin is full and resets', async () => {
    const onComplete = jest.fn();
    await render(<PinPad length={4} onComplete={onComplete} />);
    for (const d of ['1', '2', '3', '4']) await fireEvent.press(screen.getByTestId(`pin-key-${d}`));
    expect(onComplete).toHaveBeenCalledWith('1234');
    expect(screen.getByLabelText('0 of 4 digits entered')).toBeTruthy();
  });

  it('supports backspace and ignores input while disabled', async () => {
    const onChange = jest.fn();
    const { rerender } = await render(<PinPad onComplete={jest.fn()} onChange={onChange} />);
    await fireEvent.press(screen.getByTestId('pin-key-1'));
    await fireEvent.press(screen.getByTestId('pin-key-delete'));
    expect(onChange).toHaveBeenLastCalledWith('');
    onChange.mockClear();
    await rerender(<PinPad onComplete={jest.fn()} onChange={onChange} disabled />);
    await fireEvent.press(screen.getByTestId('pin-key-2'));
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe('OtpInput', () => {
  it('keeps digits only and caps the length', async () => {
    const onChange = jest.fn();
    await render(<OtpInput value="" onChange={onChange} />);
    await fireEvent.changeText(screen.getByTestId('otp-input'), '12a3456789');
    expect(onChange).toHaveBeenCalledWith('123456');
  });
});

describe('Sheet and ConfirmDialog', () => {
  it('renders children only while visible', async () => {
    const { rerender } = await render(
      <Sheet visible={false} onClose={jest.fn()}>
        <Text>Inside</Text>
      </Sheet>,
    );
    expect(screen.queryByText('Inside')).toBeNull();
    await rerender(
      <Sheet visible onClose={jest.fn()} title="Details">
        <Text>Inside</Text>
      </Sheet>,
    );
    expect(screen.getByText('Inside')).toBeTruthy();
  });

  it('routes confirm and cancel presses', async () => {
    const onConfirm = jest.fn();
    const onCancel = jest.fn();
    await render(
      <ConfirmDialog
        visible
        title="Freeze card"
        message="Sure?"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Confirm' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});

describe('ListRow, EmptyState, ErrorBanner', () => {
  it('presses a row', async () => {
    const onPress = jest.fn();
    await render(<ListRow title="Asha" subtitle="+91 98123 45678" onPress={onPress} />);
    await fireEvent.press(screen.getByRole('button'));
    expect(onPress).toHaveBeenCalled();
  });

  it('offers retry and empty-state action', async () => {
    const retry = jest.fn();
    const action = jest.fn();
    await render(
      <>
        <ErrorBanner message="Offline" onRetry={retry} />
        <EmptyState title="Nothing yet" actionLabel="Add" onAction={action} />
      </>,
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Retry' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Add' }));
    expect(retry).toHaveBeenCalled();
    expect(action).toHaveBeenCalled();
  });
});

describe('Toast', () => {
  function Trigger() {
    const toast = useToast();
    return <Text onPress={() => toast.show('Saved', 'success')}>go</Text>;
  }

  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('shows then auto-dismisses', async () => {
    await render(
      <ToastProvider durationMs={1000}>
        <Trigger />
      </ToastProvider>,
    );
    await fireEvent.press(screen.getByText('go'));
    expect(screen.getByText('Saved')).toBeTruthy();
    await act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(screen.queryByText('Saved')).toBeNull();
  });

  it('clears pending timers on unmount', async () => {
    const { unmount } = await render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>,
    );
    const clear = jest.spyOn(global, 'clearTimeout');
    await fireEvent.press(screen.getByText('go'));
    clear.mockClear();
    await unmount();
    expect(clear).toHaveBeenCalled();
    clear.mockRestore();
  });

  it('throws outside a provider', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    await expect(render(<Trigger />)).rejects.toThrow('useToast must be used inside ToastProvider');
    spy.mockRestore();
  });
});
