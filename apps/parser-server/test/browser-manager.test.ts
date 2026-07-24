import { describe, expect, it, vi } from "vitest";
import type { Browser } from "playwright";
import { PlaywrightBrowserManager } from "../src/browser/playwright-browser-manager.js";

function fakeBrowser(): Browser {
  return {
    isConnected: vi.fn(() => true),
    on: vi.fn(),
    close: vi.fn(async () => undefined)
  } as unknown as Browser;
}

describe("playwright browser manager", () => {
  it("lazily launches a single browser for concurrent requests", async () => {
    const browser = fakeBrowser();
    const launch = vi.fn(async () => browser);
    const manager = new PlaywrightBrowserManager({ launchTimeoutMs: 1000, closeTimeoutMs: 1000, launch });

    const [first, second] = await Promise.all([manager.getBrowser(), manager.getBrowser()]);

    expect(first).toBe(browser);
    expect(second).toBe(browser);
    expect(launch).toHaveBeenCalledOnce();
    await manager.close();
  });

  it("closes once and rejects launch after close", async () => {
    const browser = fakeBrowser();
    const manager = new PlaywrightBrowserManager({
      launchTimeoutMs: 1000,
      closeTimeoutMs: 1000,
      launch: vi.fn(async () => browser)
    });

    await manager.getBrowser();
    await manager.close();
    await manager.close();

    expect(browser.close).toHaveBeenCalledOnce();
    await expect(manager.getBrowser()).rejects.toMatchObject({ code: "BROWSER_RUNTIME_CLOSED" });
  });
});
