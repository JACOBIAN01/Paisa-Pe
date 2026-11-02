import { z } from 'zod';

export const ERROR_CODES = [
  'invalid_request',
  'unauthorized',
  'token_expired',
  'forbidden',
  'not_found',
  'conflict',
  'insufficient_funds',
  'limit_exceeded',
  'kyc_required',
  'duplicate_request',
  'rate_limited',
  'otp_invalid',
  'otp_expired',
  'pin_locked',
  'card_frozen',
  'request_not_pending',
  'server_error',
  'timeout',
] as const;

export const ErrorCodeSchema = z.enum(ERROR_CODES);
export type ErrorCode = z.infer<typeof ErrorCodeSchema>;

export const ApiErrorSchema = z.object({
  code: ErrorCodeSchema,
  message: z.string(),
  retryable: z.boolean(),
  details: z.record(z.unknown()).optional(),
});
export type ApiError = z.infer<typeof ApiErrorSchema>;
