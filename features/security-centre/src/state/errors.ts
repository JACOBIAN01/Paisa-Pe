import { isAppError } from '@pp/core-result';
import { t } from '@pp/core-i18n';

export function messageFor(error: unknown): string {
  if (!isAppError(error)) return t('error.generic');
  if (error.code === 'network') return t('error.network');
  if (error.code === 'timeout') return t('error.timeout');
  if (error.code === 'rate_limited') return t('error.rateLimited');
  if (error.code === 'server_error') return t('error.server');
  return t('error.generic');
}
