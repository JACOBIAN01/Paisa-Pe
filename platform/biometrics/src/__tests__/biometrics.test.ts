import { createMemorySink, resetSink, setSink } from '@pp/core-logging';
import type { BiometricAdapter, RawAuthResult } from '../adapter';
import { authenticateBiometric, isBiometricAvailable } from '../authenticate';
import { mapAuthResult } from '../outcome';

const adapter = (over: Partial<BiometricAdapter> = {}): BiometricAdapter => ({
  hasHardwareAsync: async () => true,
  isEnrolledAsync: async () => true,
  authenticateAsync: async () => ({ success: true }),
  ...over,
});

beforeEach(() => setSink(createMemorySink()));
afterEach(() => resetSink());

describe('mapAuthResult', () => {
  it.each<[RawAuthResult, string]>([
    [{ success: true }, 'success'],
    [{ success: false, error: 'user_cancel' }, 'cancelled'],
    [{ success: false, error: 'system_cancel' }, 'cancelled'],
    [{ success: false, error: 'app_cancel' }, 'cancelled'],
    [{ success: false, error: 'user_fallback' }, 'fallback'],
    [{ success: false, error: 'not_enrolled' }, 'not_enrolled'],
    [{ success: false, error: 'passcode_not_set' }, 'not_enrolled'],
    [{ success: false, error: 'not_available' }, 'unavailable'],
    [{ success: false, error: 'lockout' }, 'lockedOut'],
    [{ success: false, error: 'authentication_failed' }, 'failed'],
    [{ success: false, error: 'something_new' }, 'failed'],
  ])('maps %j to %s', (raw, expected) => {
    expect(mapAuthResult(raw)).toBe(expected);
  });

  it('never reports success for a failure that merely lacks an error', () => {
    expect(mapAuthResult({ success: false, error: '' })).toBe('failed');
  });
});

describe('authenticateBiometric', () => {
  it('succeeds and passes prompt options', async () => {
    const authenticateAsync = jest.fn(async () => ({ success: true }) as const);
    const outcome = await authenticateBiometric(
      { message: 'Unlock', cancelLabel: 'No' },
      adapter({ authenticateAsync }),
    );
    expect(outcome).toBe('success');
    expect(authenticateAsync).toHaveBeenCalledWith({
      promptMessage: 'Unlock',
      cancelLabel: 'No',
      fallbackLabel: undefined,
    });
  });

  it('reports fallback and cancel as non-success', async () => {
    const run = (error: string) =>
      authenticateBiometric(
        'Unlock',
        adapter({ authenticateAsync: async () => ({ success: false, error }) }),
      );
    expect(await run('user_fallback')).toBe('fallback');
    expect(await run('user_cancel')).toBe('cancelled');
  });

  it('checks hardware and enrolment first', async () => {
    const authenticateAsync = jest.fn();
    expect(
      await authenticateBiometric(
        'x',
        adapter({ hasHardwareAsync: async () => false, authenticateAsync }),
      ),
    ).toBe('unavailable');
    expect(
      await authenticateBiometric(
        'x',
        adapter({ isEnrolledAsync: async () => false, authenticateAsync }),
      ),
    ).toBe('not_enrolled');
    expect(authenticateAsync).not.toHaveBeenCalled();
  });

  it('turns thrown errors into failed', async () => {
    const outcome = await authenticateBiometric(
      'x',
      adapter({
        authenticateAsync: async () => {
          throw new Error('native crash');
        },
      }),
    );
    expect(outcome).toBe('failed');
  });
});

describe('isBiometricAvailable', () => {
  it('requires hardware and enrolment', async () => {
    expect(await isBiometricAvailable(adapter())).toBe(true);
    expect(await isBiometricAvailable(adapter({ isEnrolledAsync: async () => false }))).toBe(false);
    expect(
      await isBiometricAvailable(
        adapter({
          hasHardwareAsync: async () => {
            throw new Error('x');
          },
        }),
      ),
    ).toBe(false);
  });
});
