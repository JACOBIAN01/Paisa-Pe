import type { ErrorCode } from '@pp/contracts-domain';

const STATUS: Record<ErrorCode, number> = {
  invalid_request: 400,
  unauthorized: 401,
  token_expired: 401,
  forbidden: 403,
  not_found: 404,
  conflict: 409,
  insufficient_funds: 422,
  limit_exceeded: 422,
  kyc_required: 403,
  duplicate_request: 409,
  rate_limited: 429,
  otp_invalid: 400,
  otp_expired: 410,
  pin_locked: 423,
  card_frozen: 423,
  request_not_pending: 409,
  server_error: 500,
  timeout: 504,
};

const RETRYABLE: ReadonlySet<ErrorCode> = new Set<ErrorCode>([
  'rate_limited',
  'server_error',
  'timeout',
]);

export class ApiFailure extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly retryable: boolean;
  readonly details?: Record<string, unknown>;

  constructor(
    code: ErrorCode,
    message: string,
    details?: Record<string, unknown>,
    status?: number,
  ) {
    super(message);
    this.name = 'ApiFailure';
    this.code = code;
    this.status = status ?? STATUS[code];
    this.retryable = RETRYABLE.has(code);
    this.details = details;
  }
}

export const fail = (
  code: ErrorCode,
  message: string,
  details?: Record<string, unknown>,
): ApiFailure => new ApiFailure(code, message, details);

export const errorBody = (failure: ApiFailure) => ({
  error: {
    code: failure.code,
    message: failure.message,
    retryable: failure.retryable,
    ...(failure.details ? { details: failure.details } : {}),
  },
});
