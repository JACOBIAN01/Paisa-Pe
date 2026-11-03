import { fireEvent, render, screen } from '@testing-library/react-native';
import type { Paise } from '@pp/contracts-domain';
import { AmountInput, BalanceText, MASKED_BALANCE } from '../index';

describe('BalanceText', () => {
  it('hides the amount when masked', async () => {
    await render(<BalanceText paise={123456 as Paise} masked />);
    expect(screen.getByText(MASKED_BALANCE)).toBeTruthy();
    expect(screen.getByLabelText('Balance hidden')).toBeTruthy();
  });

  it('shows the formatted amount otherwise', async () => {
    await render(<BalanceText paise={123456 as Paise} />);
    expect(screen.getByText(/1,234\.56/)).toBeTruthy();
  });
});

describe('AmountInput', () => {
  it('reports the formatted raw text together with the parsed paise', async () => {
    const onChangeValue = jest.fn();
    await render(<AmountInput value="" onChangeValue={onChangeValue} />);
    await fireEvent.changeText(screen.getByTestId('amount-input'), '250.5');
    expect(onChangeValue).toHaveBeenCalledWith('250.5', 25050);
  });

  it('shows an error', async () => {
    await render(<AmountInput value="" onChangeValue={jest.fn()} error="Too much" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Too much');
  });
});
