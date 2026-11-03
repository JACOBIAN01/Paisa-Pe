import { fireEvent, screen } from '@testing-library/react-native';

export const TEST_PIN = '2468';

export async function enterPin(pin: string): Promise<void> {
  for (const digit of pin) {
    await fireEvent.press(screen.getByTestId(`pin-key-${digit}`));
  }
}
