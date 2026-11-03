import { Text } from 'react-native';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { createTestApp, renderWithApp } from '@pp/harness';
import { SYNC_SERVICE } from '@pp/svc-sync';
import { HistoryScreen, TxnDetailScreen, useTxnFeed } from '../index';

const mockPush = jest.fn();
let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn() }),
  useLocalSearchParams: () => mockParams,
}));

afterEach(() => {
  mockPush.mockClear();
  mockParams = {};
});

describe('HistoryScreen', () => {
  it('lists synced transactions, one page at a time', async () => {
    const app = await createTestApp();
    await renderWithApp(<HistoryScreen />, { app });
    const rows = await screen.findAllByTestId(/^txn-txn_/);
    expect(rows).toHaveLength(25);
    expect(screen.getByTestId('load-more')).toBeTruthy();
    app.dispose();
  });

  it('grows the visible page when more is requested', async () => {
    const app = await createTestApp();
    function Probe() {
      const feed = useTxnFeed();
      return (
        <>
          <Text testID="visible">{feed.items.length}</Text>
          <Text testID="more" onPress={feed.loadMore}>
            more
          </Text>
        </>
      );
    }
    await renderWithApp(<Probe />, { app });
    await waitFor(() => expect(screen.getByTestId('visible').props.children).toBe(25));
    await fireEvent.press(screen.getByTestId('more'));
    expect(screen.getByTestId('visible').props.children).toBe(50);
    app.dispose();
  });

  it('narrows by search text and shows an empty result message', async () => {
    const app = await createTestApp();
    await renderWithApp(<HistoryScreen />, { app });
    await screen.findAllByTestId(/^txn-txn_/);
    await fireEvent.changeText(screen.getByTestId('history-search'), 'zzzz-no-such-person');
    expect(await screen.findByText('No transactions match your search')).toBeTruthy();
    app.dispose();
  });

  it('opens the detail route for a row', async () => {
    const app = await createTestApp();
    await renderWithApp(<HistoryScreen />, { app });
    const [row] = await screen.findAllByTestId(/^txn-txn_/);
    await fireEvent.press(row as NonNullable<typeof row>);
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/txn-detail',
      params: { id: expect.stringMatching(/^txn_/) },
    });
    app.dispose();
  });
});

describe('TxnDetailScreen', () => {
  async function openFirst(type: string) {
    const app = await createTestApp();
    await app.container.resolve(SYNC_SERVICE).syncNow();
    const txn = app.container
      .resolve(SYNC_SERVICE)
      .getTxns()
      .find((t) => t.type === type && t.status === 'success');
    if (!txn) throw new Error(`fixture has no ${type}`);
    mockParams = { id: txn.id };
    await renderWithApp(<TxnDetailScreen />, { app });
    return { app, txn };
  }

  it('shows the amount and saves an edited note', async () => {
    const { app, txn } = await openFirst('p2p_send');
    expect(screen.getByTestId('detail-amount').props.children.join('')).toContain('-');
    await fireEvent.changeText(screen.getByTestId('note-input'), 'for the trip');
    await fireEvent.press(screen.getByTestId('save-note'));
    await waitFor(() => expect(screen.getByText('Note saved')).toBeTruthy());
    expect(
      app.container
        .resolve(SYNC_SERVICE)
        .getTxns()
        .find((t) => t.id === txn.id)?.note,
    ).toBe('for the trip');
    app.dispose();
  });

  it('repeats a sent payment by routing to the confirm screen', async () => {
    const { app, txn } = await openFirst('p2p_send');
    await fireEvent.press(screen.getByTestId('repeat-payment'));
    await waitFor(() => expect(mockPush).toHaveBeenCalled());
    const call = mockPush.mock.calls[0]?.[0] as {
      pathname: string;
      params: Record<string, string>;
    };
    expect(call.pathname).toBe('/send-confirm');
    expect(call.params.to).toBe(txn.counterparty?.phone);
    expect(call.params.amount).toMatch(/^\d+\.\d{2}$/);
    app.dispose();
  });

  it('does not offer repeat for received money', async () => {
    const { app } = await openFirst('p2p_receive');
    expect(screen.queryByTestId('repeat-payment')).toBeNull();
    app.dispose();
  });

  it("cannot open another user's transaction", async () => {
    const app = await createTestApp();
    const other = app.admin.listTxns('usr_002')[0];
    mockParams = { id: String(other?.id) };
    await renderWithApp(<TxnDetailScreen />, { app });
    expect(await screen.findByText('We could not find that transaction')).toBeTruthy();
    app.dispose();
  });
});
