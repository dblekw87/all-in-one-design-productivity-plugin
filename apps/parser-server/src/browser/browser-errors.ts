import type { ErrorCode, SerializableError } from "@aio/shared-contracts";

export class BrowserRuntimeError extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string
  ) {
    super(message);
    this.name = "BrowserRuntimeError";
  }
}

export function browserError(code: ErrorCode, message = "Browser navigation failed."): SerializableError {
  return {
    code,
    message,
    retryable: code === "BROWSER_NAVIGATION_TIMEOUT" || code === "BROWSER_LAUNCH_FAILED"
  };
}

export function serializeBrowserError(error: unknown): SerializableError {
  if (error instanceof BrowserRuntimeError) {
    return browserError(error.code, error.message);
  }

  return browserError("BROWSER_NAVIGATION_FAILED");
}
