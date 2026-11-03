import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { createTestApp, renderWithApp, type TestApp } from '@pp/harness';
import { GOALS_SERVICE } from '@pp/svc-goals';
import { GoalDetailScreen, GoalsScreen } from '../index';

const mockPush = jest.fn();
let mockParams: Record<string, string> = {};

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn(), replace: jest.fn() }),
  useLocalSearchParams: () => mockParams,
}));

let app: TestApp | undefined;

afterEach(() => {
  app?.dispose();
  app = undefined;
  mockPush.mockClear();
  mockParams = {};
});

describe('GoalsScreen', () => {
  it('lists goals with progress and opens the detail route', async () => {
    app = await createTestApp();
    const goal = (await app.container.resolve(GOALS_SERVICE).list())[0];
    await renderWithApp(<GoalsScreen />, { app });
    await fireEvent.press(await screen.findByTestId(`goal-${goal?.id}`));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/goal-detail', params: { id: goal?.id } });
  });

  it('creates a goal from the sheet', async () => {
    app = await createTestApp();
    const goals = app.container.resolve(GOALS_SERVICE);
    const before = (await goals.list()).length;
    await renderWithApp(<GoalsScreen />, { app });
    await fireEvent.press(await screen.findByTestId('new-goal'));
    await fireEvent.changeText(screen.getByLabelText('Goal name'), 'New laptop');
    await fireEvent.changeText(screen.getByTestId('amount-input'), '50000');
    await fireEvent.press(screen.getByTestId('save-goal'));
    await waitFor(async () => expect((await goals.list()).length).toBe(before + 1));
  });

  it('keeps Save disabled until the form is valid', async () => {
    app = await createTestApp();
    await renderWithApp(<GoalsScreen />, { app });
    await fireEvent.press(await screen.findByTestId('new-goal'));
    const save = screen.getByTestId('save-goal');
    expect(save.props.accessibilityState?.disabled).toBe(true);
  });
});

describe('GoalDetailScreen', () => {
  it('deposits once per tap sequence and updates the saved amount', async () => {
    app = await createTestApp();
    const goals = app.container.resolve(GOALS_SERVICE);
    const goal = (await goals.list())[0];
    mockParams = { id: goal?.id ?? '' };
    const spy = jest.spyOn(goals, 'deposit');
    await renderWithApp(<GoalDetailScreen />, { app });
    await screen.findByLabelText('goal-saved');
    await fireEvent.changeText(screen.getByTestId('amount-input'), '100');
    await fireEvent.press(screen.getByTestId('submit-move'));
    await waitFor(() => expect(spy).toHaveBeenCalledTimes(1));
    expect(spy.mock.calls[0]?.[1]).toBe(10000);
    await waitFor(async () => {
      const after = (await goals.list()).find((g) => g.id === goal?.id);
      expect(after?.saved).toBe((goal?.saved ?? 0) + 10000);
    });
  });

  it('reuses the intent id when the same deposit is retried after a dropped response', async () => {
    app = await createTestApp();
    const goals = app.container.resolve(GOALS_SERVICE);
    const goal = (await goals.list())[0];
    mockParams = { id: goal?.id ?? '' };
    const spy = jest.spyOn(goals, 'deposit');
    app.chaos.dropResponse({ endpoint: 'goals.deposit' }, 1);
    await renderWithApp(<GoalDetailScreen />, { app });
    await screen.findByLabelText('goal-saved');
    await fireEvent.changeText(screen.getByTestId('amount-input'), '100');
    await fireEvent.press(screen.getByTestId('submit-move'));
    await waitFor(() => expect(spy).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(screen.getByTestId('submit-move').props.accessibilityState?.busy).not.toBe(true),
    );
    await fireEvent.press(screen.getByTestId('submit-move'));
    await waitFor(() => expect(spy).toHaveBeenCalledTimes(2));
    expect(spy.mock.calls[1]?.[2]?.intentId).toBe(spy.mock.calls[0]?.[2]?.intentId);
    await waitFor(async () => {
      const after = (await goals.list()).find((g) => g.id === goal?.id);
      expect(after?.saved).toBe((goal?.saved ?? 0) + 10000);
    });
  });

  it('shows the interest preview after the amount settles', async () => {
    app = await createTestApp();
    const goal = (await app.container.resolve(GOALS_SERVICE).list())[0];
    mockParams = { id: goal?.id ?? '' };
    await renderWithApp(<GoalDetailScreen />, { app });
    await screen.findByLabelText('goal-saved');
    await fireEvent.changeText(screen.getByTestId('amount-input'), '1000');
    expect(
      await screen.findByLabelText('interest-preview', undefined, { timeout: 3000 }),
    ).toBeTruthy();
  });

  it('shows an empty state for an unknown goal', async () => {
    mockParams = { id: 'gl_missing' };
    const result = await renderWithApp(<GoalDetailScreen />);
    app = result.app;
    expect(await screen.findByText('No goals yet. Start one!')).toBeTruthy();
  });
});
