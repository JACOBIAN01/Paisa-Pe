import { isAppError } from '@pp/core-result';
import { t } from '@pp/core-i18n';

/** Maps a thrown error to a short, user-facing message. */
export function messageFor(error: unknown): string {
  if (!isAppError(error)) return t('error.generic');
  switch (error.code) {
    case 'network':
      return t('error.network');
    case 'timeout':
      return t('error.timeout');
    case 'otp_invalid':
    case 'otp_expired':
      return t('auth.otpInvalid');
    case 'rate_limited':
      return t('error.rateLimited');
    case 'unauthorized':
    case 'token_expired':
      return t('error.unauthorized');
    case 'server_error':
      return t('error.server');
    default:
      return t('error.generic');
  }
}
