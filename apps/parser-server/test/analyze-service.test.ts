import { describe, expect, it } from "vitest";
import { PlaceholderAnalyzeService } from "../src/analyze/placeholder-analyze-service.js";

describe("placeholder analyze service", () => {
  it("returns a versioned not implemented response without browser work", async () => {
    const service = new PlaceholderAnalyzeService();
    const response = await service.analyze({
      requestId: "req_test",
      startedAtMs: 100,
      nowMs: () => 125,
      request: {
        contractVersion: "1.0",
        url: "https://example.com",
        viewport: { width: 1440, height: 1200, deviceScaleFactor: 1 },
        capture: { mode: "VIEWPORT" },
        options: {
          excludeHidden: true,
          excludeIframes: true,
          excludeCanvas: true,
          includePseudoElements: true
        }
      },
      target: {
        normalizedUrl: "https://example.com/",
        hostname: "example.com",
        protocol: "https:",
        resolvedAddresses: [{ address: "93.184.216.34", family: 4 }],
        validatedAt: "2026-07-24T00:00:00.000Z"
      }
    });

    expect(response).toMatchObject({
      contractVersion: "1.0",
      requestId: "req_test",
      status: "NOT_IMPLEMENTED",
      target: { normalizedUrl: "https://example.com/" },
      assets: [],
      metrics: {
        processingTimeMs: 25,
        domNodeCount: 0,
        designNodeCount: 0,
        assetCount: 0
      }
    });
    expect(response.document).toBeUndefined();
    expect(response.warnings[0]?.code).toBe("BROWSER_RUNTIME_NOT_IMPLEMENTED");
  });
});
