import { t } from '@pp/core-i18n';
import { isAppError } from '@pp/core-result';

export function describeError(error: unknown): string {
  if (!isAppError(error)) return t('error.generic');
  switch (error.code) {
    case 'network':
      return t('error.network');
    case 'timeout':
      return t('error.timeout');
    case 'unauthorized':
    case 'token_expired':
      return t('error.unauthorized');
    case 'rate_limited':
      return t('error.rateLimited');
    case 'server_error':
      return t('error.server');
    default:
      return error.message || t('error.generic');
  }
}
