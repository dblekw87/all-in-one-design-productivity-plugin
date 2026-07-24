type AbortListener = () => void;

export function createRuntimeAbortController(): AbortController {
  const NativeAbortController = (globalThis as typeof globalThis & {
    AbortController?: typeof AbortController;
  }).AbortController;

  if (NativeAbortController) return new NativeAbortController();

  let aborted = false;
  const listeners = new Set<AbortListener>();
  const signal = {
    get aborted() {
      return aborted;
    },
    addEventListener(_type: string, listener: EventListenerOrEventListenerObject | null) {
      if (typeof listener === "function") listeners.add(listener as AbortListener);
    },
    removeEventListener(_type: string, listener: EventListenerOrEventListenerObject | null) {
      if (typeof listener === "function") listeners.delete(listener as AbortListener);
    }
  } as unknown as AbortSignal;

  return {
    signal,
    abort() {
      if (aborted) return;
      aborted = true;
      listeners.forEach((listener) => listener());
      listeners.clear();
    }
  } as AbortController;
}
