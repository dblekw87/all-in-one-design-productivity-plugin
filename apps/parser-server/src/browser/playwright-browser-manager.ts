import { chromium, type Browser } from "playwright";
import { BrowserRuntimeError } from "./browser-errors.js";

export interface PlaywrightBrowserManagerOptions {
  launchTimeoutMs: number;
  closeTimeoutMs: number;
  launch?: () => Promise<Browser>;
}

export class PlaywrightBrowserManager {
  private browser: Browser | undefined;
  private launchPromise: Promise<Browser> | undefined;
  private closed = false;

  constructor(private readonly options: PlaywrightBrowserManagerOptions) {}

  async getBrowser(): Promise<Browser> {
    if (this.closed) {
      throw new BrowserRuntimeError("BROWSER_RUNTIME_CLOSED", "Browser runtime is closed.");
    }

    if (this.browser?.isConnected()) {
      return this.browser;
    }

    if (this.launchPromise) {
      return this.launchPromise;
    }

    this.launchPromise = withTimeout(
      (this.options.launch ?? (() => chromium.launch({ headless: true })))(),
      this.options.launchTimeoutMs,
      () => new BrowserRuntimeError("BROWSER_LAUNCH_FAILED", "Chromium launch timed out.")
    )
      .then((browser) => {
        browser.on("disconnected", () => {
          this.browser = undefined;
        });
        this.browser = browser;
        return browser;
      })
      .catch((error: unknown) => {
        if (error instanceof BrowserRuntimeError) {
          throw error;
        }
        throw new BrowserRuntimeError("BROWSER_LAUNCH_FAILED", "Chromium could not be launched.");
      })
      .finally(() => {
        this.launchPromise = undefined;
      });

    return this.launchPromise;
  }

  async close(): Promise<void> {
    this.closed = true;
    const browser = this.browser ?? (await this.launchPromise?.catch(() => undefined));
    this.browser = undefined;

    if (!browser) {
      return;
    }

    await withTimeout(
      browser.close(),
      this.options.closeTimeoutMs,
      () => new BrowserRuntimeError("BROWSER_CLEANUP_FAILED", "Chromium close timed out.")
    ).catch(() => undefined);
  }
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, createError: () => Error): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeout = setTimeout(() => reject(createError()), timeoutMs);
      })
    ]);
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}
