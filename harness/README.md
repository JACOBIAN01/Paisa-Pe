# harness

The test kit for this repository. It lets you drive the real app code (screens, services, platform
wrappers) against an in-process mock backend, with a fake clock and switches for slow, failing and
lost network responses. Everything is deterministic: the same test gives the same result on every
run.

Use it to prove a claim about the code with a test that fails when the claim is true.

## Quick start

```tsx
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { createTestApp, renderWithApp } from '@pp/harness';
import { HomeScreen } from '@pp/feat-home';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => ({}),
}));

it('shows the balance the server holds', async () => {
  const app = await createTestApp(); // signed in as usr_001, fake clock installed
  await renderWithApp(<HomeScreen />, { app });
  await waitFor(() => expect(screen.getByTestId('home-balance')).toBeTruthy());
  await screen.unmount();
  app.dispose();
});
```

Run a single file with `pnpm exec jest path/to/file.test.tsx`. Examples to copy from live in
`harness/scenarios/*.scenario.test.tsx` (login, lock, deep links, notifications, help centre,
clipboard code, account switching, settings, privacy shield, payments).

## Writing a deterministic test

1. **Create the app.** `createTestApp({ user, loggedIn, online, seed })` builds the mock server, the
   services for the signed-in user and a fake clock, and resets every process-wide singleton. Call
   `app.dispose()` when you are done. Pass `loggedIn: false` to start at the sign-in screen.
2. **Control time yourself.** Nothing waits on real time. `app.clock.advance(ms)` moves wall and
   monotonic time together, `app.clock.set(ms)` jumps the wall clock only, and
   `await app.clock.tick(ms)` also runs due timers when you called `jest.useFakeTimers()`.
3. **Shape the network.** `chaosControls(app.chaos)` gives `slowNetwork`, `slowResponses`,
   `failNext`, `timeoutNext`, `dropResponse`, `skewServerClock` and `reset`. The server handles a
   request at the moment it arrives; `dropResponse` means it was handled but the client never heard
   back. `app.setOnline(false)` takes the device offline.
4. **Look at the server's truth.** `app.admin` reads and changes server state directly:
   `getBalance(userId)`, `listTxns(userId)`, `countTransfersWithKey(userId, key)`, `credit`,
   `receivePayment`, `loginAs`, `inspect(table)`.
5. **Record events.** `recordEvents()` captures everything emitted on the app bus
   (`events.of('payment.sent')`, `events.count('lock.locked')`). Call `events.stop()` afterwards.
6. **Render real screens.** `renderWithApp(<Screen />, { app, lang, theme })` wraps the screen in the
   same providers the app uses. After the signed-in user changes, call the result's
   `rerender(...)` so it picks up the new user's services (see the account-switch scenario).
7. **Assert on outcomes, not on timing.** Prefer `waitFor` over sleeping, and assert what the user
   or the server can observe: balances, rows, navigation, events.
8. **Make it repeatable.** Run the test five times. If it does not give the same answer every time,
   it depends on something you have not controlled.

### Testing Library v14 is async

`render`, `rerender`, `unmount`, `fireEvent.*`, `renderHook` and `act` all return promises. Always
`await` them, and never run two `act` calls at once. Put state changes that happen outside the
component tree inside `await act(async () => { ... })`.

### Mocking the platform

Native modules are not available under Jest. Fake them at the edge:

| Need                      | Use                                                                                       |
| ------------------------- | ----------------------------------------------------------------------------------------- |
| Navigation                | `jest.mock('expo-router', ...)`, or `createNav()` for an in-memory router plus `AppShell` |
| App foreground/background | `createFakeAppState()` with `createAppStateObserver(...)`                                 |
| Incoming links            | `createFakeLinking(initialUrl)` with `createDeepLinkRouter(...)`                          |
| Notification taps         | `createFakeNotifications()` with `useNotificationTaps(...)`                               |
| Clipboard                 | `createFakeClipboard(text)` behind a `jest.mock('expo-clipboard', ...)`                   |
| Biometrics                | `jest.mock('expo-local-authentication', ...)`                                             |
| Web view                  | `jest.mock('react-native-webview', ...)`                                                  |

Names of mock variables inside a `jest.mock` factory must start with `mock`.

`resetTestEnvironment()` puts the bus, flags, language, log sink, clock, app storage and lock store
back to a known state. `createTestApp` calls it for you; call it from `beforeEach` if you build
things by hand.

## Rules of engagement

- Work only on the code in this repository, through the test kit. Do not use a real network, real
  accounts or any service outside this project.
- Your test must **fail on the code as given** and pass once the problem is fixed. A test that
  passes today does not prove anything.
- Tests must be deterministic: no real sleeping, no randomness you do not seed, no reliance on test
  order or on state left behind by another test.
- Use the public package entry points (`@pp/...`). Do not import from another package's `src/`.
- Do not edit the harness, the mock server or other tests to make your test pass.
- Report what you can show. A claim without a failing test does not count.

## Submitting

One file per finding, named after the finding you are reporting:

```
submissions/<bugId>.test.tsx
```

Next to it, a short note covering: what is wrong, where (files and packages), why it happens, and
how you would fix it, in about five lines.

## API

| Export                           | What it does                                                                 |
| -------------------------------- | ---------------------------------------------------------------------------- |
| `createTestApp(options?)`        | Mock server, per-user services, fake clock, sign-in. Returns a `TestApp`.    |
| `renderWithApp(ui, options?)`    | Render inside container, query client, theme, toasts and i18n.               |
| `createFakeClock(start?)`        | Controllable `Clock`: `advance`, `set`, `install`, `tick`.                   |
| `chaosControls(chaos)`           | Slow, fail, time out or drop network responses.                              |
| `recordEvents(bus?, names?)`     | Record app-bus events: `events`, `of`, `count`, `clear`, `stop`.             |
| `createEmitter()`                | Tiny controllable event source.                                              |
| `createFakeAppState(initial?)`   | Fake AppState: `set(state)`, `listenerCount()`.                              |
| `createFakeLinking(initialUrl?)` | Fake deep-link source: `emit(url)`, `listenerCount()`.                       |
| `createFakeNotifications()`      | Fake notification adapter: `tap(id, route)`, `scheduled`.                    |
| `createFakeClipboard(text?)`     | Fake clipboard: `set(text)`, `reads()`.                                      |
| `createNav(initialPath?)`        | In-memory router: `router`, `params()`, `location()`, `trail()`.             |
| `AppShell`                       | Shows the lock gate while locked, otherwise the screen for the current path. |
| `AccountScope`                   | Remounts its children when the container changes, like the app root.         |
| `createTestStorage()`            | In-memory plain and secure storage with `dumpPlain()` / `dumpSecure()`.      |
| `installMemoryAppStorage()`      | Point the app-wide storage at a fresh in-memory backend.                     |
| `resetTestEnvironment()`         | Reset process-wide singletons.                                               |
| `phoneOf(userId)`, `DEMO_OTP`    | Demo phone number for a user id, and the demo sign-in code.                  |

### Demo data

Eight demo users, `usr_001` to `usr_008`, phones `+919800000001` to `+919800000008`, sign-in code
`123456`. `usr_001` (Aarav Sharma) has 300 transactions and the basic KYC tier; `usr_002` has the
full tier. Every `createTestApp` call starts from the same seed unless you pass `seed`.

### TestApp

| Member                                            | Meaning                                                            |
| ------------------------------------------------- | ------------------------------------------------------------------ |
| `clock`, `server`, `admin`, `chaos`, `http`       | The fake clock, mock server and its controls, HTTP client.         |
| `auth`, `pin`                                     | Sign-in/session service and PIN service (device-wide).             |
| `container`                                       | Services of the active user. Falls back to `root` when signed out. |
| `root`, `queryClient`, `storage`                  | Device-wide container, query cache, in-memory storage.             |
| `login(userId?)`, `switchAccount(id)`, `logout()` | Account helpers (real OTP flow).                                   |
| `userId()`                                        | Active user id or `null`.                                          |
| `setOnline(bool)`, `isOnline()`                   | Take the device on and offline.                                    |
| `dispose()`                                       | Tear everything down.                                              |
