import type { RawAuthResult } from './adapter';

export type BiometricOutcome =
  'success' | 'cancelled' | 'fallback' | 'not_enrolled' | 'unavailable' | 'lockedOut' | 'failed';

/** Only an explicit `success: true` is a success; every other result maps to a refusal. */
export function mapAuthResult(raw: RawAuthResult): BiometricOutcome {
  if (raw.success === true) return 'success';
  switch (raw.error) {
    case 'user_cancel':
    case 'system_cancel':
    case 'app_cancel':
      return 'cancelled';
    case 'user_fallback':
      return 'fallback';
    case 'not_enrolled':
    case 'passcode_not_set':
      return 'not_enrolled';
    case 'not_available':
      return 'unavailable';
    case 'lockout':
      return 'lockedOut';
    default:
      return 'failed';
  }
}
