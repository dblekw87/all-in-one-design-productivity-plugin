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

  if (error instanceof Error && "code" in error) {
    const codeValue = (error as Error & { code?: unknown }).code;
    const code = typeof codeValue === "string" && /^[A-Z0-9_]+$/.test(codeValue) ? codeValue as ErrorCode : "BROWSER_NAVIGATION_FAILED";
    return browserError(code, error.message || "Browser navigation failed.");
  }

  if (typeof error === "object" && error !== null) {
    const candidate = error as { code?: unknown; message?: unknown };
    const code = typeof candidate.code === "string" && /^[A-Z0-9_]+$/.test(candidate.code) ? candidate.code as ErrorCode : "BROWSER_NAVIGATION_FAILED";
    const message = typeof candidate.message === "string" ? candidate.message : "";
    const networkCode = message.match(/(?:net::)?ERR_[A-Z0-9_]+/i)?.[0];
    return browserError(code, networkCode ? `Browser navigation failed (${networkCode}).` : undefined);
  }

  return browserError("BROWSER_NAVIGATION_FAILED");
}
