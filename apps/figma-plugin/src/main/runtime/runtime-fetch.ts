export async function runtimeFetch(
  input: RequestInfo | URL,
  init: RequestInit,
  signal?: AbortSignal
): Promise<Response> {
  if (signal?.aborted) throw new Error("CAPABILITY_CANCELLED");

  try {
    return await fetch(input, signal ? { ...init, signal } : init);
  } catch (error) {
    // Figma's sandbox fetch validates RequestInit and currently rejects
    // the standard signal field. Retry without it; callers still check
    // cancellation before and after the request.
    if (signal && isUnsupportedSignalError(error)) {
      if (signal.aborted) throw new Error("CAPABILITY_CANCELLED");
      return fetch(input, {
        ...(init.method ? { method: init.method } : {}),
        ...(init.headers ? { headers: init.headers } : {}),
        ...(init.body !== undefined ? { body: init.body } : {})
      });
    }
    throw error;
  }
}

function isUnsupportedSignalError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /signal|requestinit|unrecognized key/i.test(message);
}
