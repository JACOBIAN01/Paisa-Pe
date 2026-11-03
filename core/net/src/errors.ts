import { ApiErrorSchema, type ErrorCode } from '@pp/contracts-domain';
import { ApiRequestError } from '@pp/core-result';

const STATUS_CODES: Record<number, ErrorCode> = {
  400: 'invalid_request',
  401: 'unauthorized',
  403: 'forbidden',
  404: 'not_found',
  409: 'conflict',
  429: 'rate_limited',
};

const codeForStatus = (status: number): ErrorCode =>
  STATUS_CODES[status] ?? (status >= 500 ? 'server_error' : 'invalid_request');

/** Maps a non-2xx response body to an `ApiRequestError`. */
export function toApiError(status: number, body: unknown): ApiRequestError {
  const envelope = (body as { error?: unknown } | null | undefined)?.error;
  const parsed = ApiErrorSchema.safeParse(envelope);
  if (parsed.success) {
    const { code, message, retryable, details } = parsed.data;
    return new ApiRequestError(code, message, status, { retryable, details });
  }
  const code = codeForStatus(status);
  return new ApiRequestError(code, `Request failed with status ${status}`, status, {
    retryable: status >= 500 || status === 429,
  });
}

export const isAuthFailure = (error: unknown): boolean =>
  error instanceof ApiRequestError &&
  (error.code === 'unauthorized' || error.code === 'token_expired');
