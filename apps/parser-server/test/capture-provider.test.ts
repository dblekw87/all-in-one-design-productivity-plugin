import { describe, expect, it, vi } from "vitest";
import { CaptureProviderRegistry } from "../src/capture/capture-provider-registry.js";
import { PublicUrlCaptureProvider } from "../src/capture/public-url-capture-provider.js";
import type { AnalyzeWebsiteRequest } from "@aio/shared-contracts";
import type { TargetInspector } from "../src/analyze/target-inspector.js";

const request: AnalyzeWebsiteRequest = {
  contractVersion: "1.0",
  captureMode: "PUBLIC_URL",
  url: "https://example.com",
  viewport: { width: 1440, height: 1200, deviceScaleFactor: 1 },
  capture: { mode: "VIEWPORT" },
  options: { excludeHidden: true, excludeIframes: true, excludeCanvas: true, includePseudoElements: true }
};

describe("capture providers", () => {
  it("validates public URL capture through the target inspector", async () => {
    const targetInspector: TargetInspector = {
      inspect: vi.fn(async () => ({
        normalizedUrl: "https://example.com/",
        hostname: "example.com",
        protocol: "https:" as const,
        resolvedAddresses: [{ address: "93.184.216.34", family: 4 as const }],
        validatedAt: "2026-07-26T00:00:00.000Z"
      }))
    };
    const provider = new PublicUrlCaptureProvider(targetInspector);

    const validation = await provider.validate(request);

    expect(provider.supports(request)).toBe(true);
    expect(validation).toMatchObject({
      ok: true,
      source: { mode: "PUBLIC_URL", providerId: "public-url", normalizedUrl: "https://example.com/" }
    });
    expect(targetInspector.inspect).toHaveBeenCalledWith("https://example.com");
  });

  it("returns an unsupported mode error when no provider is registered", () => {
    const registry = new CaptureProviderRegistry();
    registry.register(new PublicUrlCaptureProvider({ inspect: vi.fn() }));

    const result = registry.resolve({ ...request, captureMode: "LOCAL_HTML" });

    expect(result).toMatchObject({ error: { code: "CAPTURE_MODE_NOT_SUPPORTED" } });
  });
});
