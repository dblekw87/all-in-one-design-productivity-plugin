import { describe, expect, it } from "vitest";
import { BrowserExtensionCaptureProvider } from "../src/runtime/browser-extension-capture-provider.js";

describe("browser extension capture provider", () => {
  it("supports only BROWSER_TAB and validates metadata", () => {
    const provider = new BrowserExtensionCaptureProvider();
    expect(provider.supports("BROWSER_TAB")).toBe(true);
    expect(provider.supports("PUBLIC_URL")).toBe(false);
    expect(
      provider.validate(1, {
        url: "https://example.com/",
        title: "Example",
        viewportWidth: 100,
        viewportHeight: 100,
        documentWidth: 100,
        documentHeight: 100,
        scrollX: 0,
        scrollY: 0,
        devicePixelRatio: 1,
        language: "en-US",
        theme: "light"
      })
    ).toEqual({ ok: true });
  });
});
