import { BrowserRuntimeError } from "./browser-errors.js";

export function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new BrowserRuntimeError("BROWSER_NAVIGATION_CANCELLED", "Browser navigation was cancelled.");
  }
}

export function onAbort(signal: AbortSignal | undefined, listener: () => void): () => void {
  if (!signal) {
    return () => undefined;
  }

  signal.addEventListener("abort", listener, { once: true });
  return () => signal.removeEventListener("abort", listener);
}
