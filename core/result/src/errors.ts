import type { ErrorCode } from '@pp/contracts-domain';

export type AppErrorCode = ErrorCode | 'network' | 'aborted' | 'unknown';

export interface AppErrorInit {
  retryable?: boolean;
  details?: Record<string, unknown>;
  cause?: unknown;
}

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly retryable: boolean;
  readonly details?: Record<string, unknown>;
  override readonly cause?: unknown;

  constructor(code: AppErrorCode, message: string, init: AppErrorInit = {}) {
    super(message);
    this.name = new.target.name;
    this.code = code;
    this.retryable = init.retryable ?? false;
    this.details = init.details;
    this.cause = init.cause;
  }
}

/** The request never produced a response (offline, DNS, connection reset). */
export class NetworkError extends AppError {
  constructor(message = 'Network request failed', init: AppErrorInit = {}) {
    super('network', message, { retryable: true, ...init });
  }
}

/** The request produced no response within the allowed time. */
export class TimeoutError extends AppError {
  constructor(message = 'Request timed out', init: AppErrorInit = {}) {
    super('timeout', message, { retryable: true, ...init });
  }
}

/** The caller cancelled the request on purpose. Not a failure of the operation itself. */
export class AbortedError extends AppError {
  constructor(message = 'Request aborted', init: AppErrorInit = {}) {
    super('aborted', message, { retryable: false, ...init });
  }
}

/** The server answered with an error envelope. */
export class ApiRequestError extends AppError {
  readonly status: number;

  constructor(code: ErrorCode, message: string, status: number, init: AppErrorInit = {}) {
    super(code, message, init);
    this.status = status;
  }
}

export const isAppError = (value: unknown): value is AppError => value instanceof AppError;

export function toAppError(value: unknown): AppError {
  if (isAppError(value)) return value;
  const message = value instanceof Error ? value.message : String(value);
  return new AppError('unknown', message, { cause: value });
}
