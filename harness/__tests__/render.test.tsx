import { Text } from 'react-native';
import { act, screen } from '@testing-library/react-native';
import { useService } from '@pp/core-di';
import { t } from '@pp/core-i18n';
import { useToast } from '@pp/design-system';
import { useAuthState } from '@pp/svc-auth';
import { LEDGER, useLedgerState } from '@pp/svc-ledger';
import { renderWithApp } from '../render';
import type { TestApp } from '../scenarios/test-app';

let app: TestApp | undefined;
afterEach(() => app?.dispose());

function Probe() {
  const auth = useAuthState();
  const ledger = useLedgerState();
  const service = useService(LEDGER);
  const toast = useToast();
  return (
    <Text testID="probe" onPress={() => toast.show('hi')}>
      {`${auth.activeUserId}|${ledger.version}|${typeof service.fetchBalance}`}
    </Text>
  );
}

describe('renderWithApp', () => {
  it('provides container, auth state and ledger state to components', async () => {
    const result = await renderWithApp(<Probe />);
    app = result.app;
    expect(screen.getByTestId('probe').props.children).toMatch(/^usr_001\|.*\|function$/);
  });

  it('re-renders when the ledger changes', async () => {
    const result = await renderWithApp(<Probe />);
    app = result.app;
    await act(async () => {
      await app?.container.resolve(LEDGER).fetchBalance();
    });
    expect(String(screen.getByTestId('probe').props.children)).not.toMatch(/\|0\|/);
  });

  it('applies the requested language', async () => {
    const result = await renderWithApp(<Probe />, { lang: 'hi' });
    app = result.app;
    expect(t('common.cancel')).not.toBe('Cancel');
  });
});
