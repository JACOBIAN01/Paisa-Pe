import { fireEvent, render, screen } from '@testing-library/react-native';
import { Avatar, Badge, Button, Input, ThemeProvider, initialsOf, useTheme } from '../index';
import { Text } from 'react-native';

describe('Button', () => {
  it('fires onPress', async () => {
    const onPress = jest.fn();
    await render(<Button title="Pay" onPress={onPress} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Pay' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not fire when disabled or loading', async () => {
    const onPress = jest.fn();
    const { rerender } = await render(<Button title="Pay" onPress={onPress} disabled />);
    await fireEvent.press(screen.getByRole('button', { name: 'Pay' }));
    await rerender(<Button title="Pay" onPress={onPress} loading />);
    await fireEvent.press(screen.getByRole('button', { name: 'Pay' }));
    expect(onPress).not.toHaveBeenCalled();
  });
});

describe('Input', () => {
  it('shows an error message', async () => {
    await render(<Input label="Name" error="Required" value="" onChangeText={() => undefined} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Required');
  });

  it('forwards text changes', async () => {
    const onChangeText = jest.fn();
    await render(<Input label="Name" value="" onChangeText={onChangeText} />);
    await fireEvent.changeText(screen.getByLabelText('Name'), 'Asha');
    expect(onChangeText).toHaveBeenCalledWith('Asha');
  });
});

describe('Avatar and Badge', () => {
  it('derives initials', async () => {
    expect(initialsOf('asha rao kumar')).toBe('AR');
    expect(initialsOf('  ')).toBe('');
    await render(<Avatar name="Dev Patel" />);
    expect(screen.getByLabelText('Dev Patel')).toBeTruthy();
  });

  it('renders badge label', async () => {
    await render(<Badge label="Frozen" tone="warning" />);
    expect(screen.getByText('Frozen')).toBeTruthy();
  });
});

describe('theme', () => {
  function Probe() {
    const { mode, colors } = useTheme();
    return <Text>{`${mode}:${colors.background}`}</Text>;
  }

  it('defaults to light and switches to dark', async () => {
    const { rerender } = await render(<Probe />);
    expect(screen.getByText('light:#F7F7FB')).toBeTruthy();
    await rerender(
      <ThemeProvider mode="dark">
        <Probe />
      </ThemeProvider>,
    );
    expect(screen.getByText('dark:#0E1018')).toBeTruthy();
  });
});
