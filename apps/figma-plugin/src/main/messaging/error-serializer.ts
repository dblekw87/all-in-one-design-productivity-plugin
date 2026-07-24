import type { ErrorCode, SerializableError } from "@aio/shared-contracts";

export function serializeError(
  error: unknown,
  fallbackCode: ErrorCode = "INTERNAL_ERROR"
): SerializableError {
  if (typeof error === "object" && error !== null && "code" in error && "message" in error) {
    const candidate = error as { code: ErrorCode; message: string; details?: Record<string, unknown> };
    const serialized: SerializableError = {
      code: candidate.code,
      message: candidate.message,
      retryable: false
    };
    if (candidate.details) {
      serialized.details = candidate.details;
    }
    return serialized;
  }

  if (error instanceof Error) {
    return {
      code: fallbackCode,
      message: error.message,
      retryable: false
    };
  }

  return {
    code: fallbackCode,
    message: "An unknown plugin error occurred.",
    retryable: false
  };
}
