import { describe, expect, it } from "vitest";
import type { ExtensionRequest, ExtensionRuntimeStatus } from "../src/contracts/messages.js";
import { isExtensionRequest } from "../src/runtime/message-bus.js";

describe("extension contracts", () => {
  it("accepts typed message contracts", () => {
    const request: ExtensionRequest = { type: "START_CAPTURE", payload: { tabId: 1 } };
    expect(isExtensionRequest(request)).toBe(true);
    expect(isExtensionRequest({ type: "CAPTURE_DOM", payload: {} })).toBe(false);
  });

  it("defines runtime status contract", () => {
    const status: ExtensionRuntimeStatus = {
      state: "READY",
      version: "0.1.0",
      ready: true,
      currentMode: "BROWSER_TAB",
      activeSessionCount: 0
    };
    expect(status.currentMode).toBe("BROWSER_TAB");
  });
});
