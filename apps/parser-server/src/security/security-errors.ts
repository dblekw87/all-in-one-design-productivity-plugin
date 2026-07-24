import type { ErrorCode, SerializableError } from "@aio/shared-contracts";

export function securityError(code: ErrorCode, message = "The target URL is not allowed."): SerializableError {
  return {
    code,
    message,
    retryable: false
  };
}

export function validationError(code: ErrorCode, details?: Record<string, unknown>): SerializableError {
  const error = securityError(code, "The target URL could not be validated.");
  if (details) {
    error.details = details;
  }
  return error;
}
