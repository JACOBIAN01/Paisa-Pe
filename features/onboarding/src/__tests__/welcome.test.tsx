import { fireEvent, screen } from '@testing-library/react-native';
import { getLanguage } from '@pp/core-i18n';
import { createTestApp, renderWithApp } from '@pp/harness';
import { SLIDES, WelcomeScreen } from '../index';

const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn() };
jest.mock('expo-router', () => ({ useRouter: () => mockRouter }));

describe('WelcomeScreen', () => {
  beforeEach(() => jest.clearAllMocks());

  it('walks through every slide and then continues to login', async () => {
    const app = await createTestApp({ loggedIn: false });
    await renderWithApp(<WelcomeScreen />, { app });

    for (const slide of SLIDES) {
      expect(screen.getByTestId(`slide-${slide.id}`)).toBeTruthy();
      const next = screen.getByTestId('welcome-next');
      await fireEvent.press(next);
    }
    expect(mockRouter.push).toHaveBeenCalledWith('/login');
    app.dispose();
  });

  it('lets the user skip straight to login', async () => {
    const app = await createTestApp({ loggedIn: false });
    await renderWithApp(<WelcomeScreen />, { app });
    await fireEvent.press(screen.getByLabelText('Skip'));
    expect(mockRouter.push).toHaveBeenCalledWith('/login');
    app.dispose();
  });

  it('switches the interface language', async () => {
    const app = await createTestApp({ loggedIn: false });
    await renderWithApp(<WelcomeScreen />, { app });
    await fireEvent.press(screen.getByLabelText('हिन्दी'));
    expect(getLanguage()).toBe('hi');
    app.dispose();
  });
});
