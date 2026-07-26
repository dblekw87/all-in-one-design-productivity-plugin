import { describe, expect, it, vi } from "vitest";
import { createApp } from "../src/app.js";
import { loadParserServerConfig } from "../src/config.js";
import type { TargetInspector } from "../src/analyze/target-inspector.js";
import type { WebsiteAnalyzeService } from "../src/analyze/analyze-service.js";
import type { AnalyzeWebsiteResponse, SerializableError } from "@aio/shared-contracts";
import type { ValidatedTarget } from "../src/security/inspect-target.js";

const validBody = {
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
};

describe("analyze route", () => {
  it("returns placeholder analyze responses for safe targets", async () => {
    const safeTarget: ValidatedTarget = {
      normalizedUrl: "https://example.com/",
      hostname: "example.com",
      protocol: "https:",
      resolvedAddresses: [{ address: "93.184.216.34", family: 4 }],
      validatedAt: "2026-07-24T00:00:00.000Z"
    };
    const targetInspector: TargetInspector = {
      inspect: vi.fn(async () => safeTarget)
    };
    const analyzeService: WebsiteAnalyzeService = {
      analyze: vi.fn(async ({ requestId, request, target, captureSource }): Promise<AnalyzeWebsiteResponse> => ({
        contractVersion: "1.0",
        requestId,
        status: "NOT_IMPLEMENTED",
        target: { normalizedUrl: target.normalizedUrl },
        captureSource,
        viewport: request.viewport,
        assets: [],
        warnings: [
          {
            code: "BROWSER_RUNTIME_NOT_IMPLEMENTED",
            message: "Browser analysis is not available yet.",
            severity: "INFO"
          }
        ],
        metrics: { processingTimeMs: 0, domNodeCount: 0, designNodeCount: 0, assetCount: 0 }
      }))
    };
    const app = createApp(loadParserServerConfig({}), { targetInspector, analyzeService });

    const response = await app.inject({
      method: "POST",
      url: "/v1/imports/analyze",
      payload: validBody
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      contractVersion: "1.0",
      status: "NOT_IMPLEMENTED",
      target: { normalizedUrl: "https://example.com/" },
      captureSource: { mode: "PUBLIC_URL", providerId: "public-url", normalizedUrl: "https://example.com/" }
    });
    expect(response.json().requestId).toMatch(/^req_/);
    expect(targetInspector.inspect).toHaveBeenCalledWith("https://example.com");
    expect(analyzeService.analyze).toHaveBeenCalledOnce();
  });

  it("rejects capture modes that do not have an implemented provider yet", async () => {
    const app = createApp(loadParserServerConfig({}));
    const response = await app.inject({
      method: "POST",
      url: "/v1/imports/analyze",
      payload: { ...validBody, captureMode: "BROWSER_TAB" }
    });

    expect(response.statusCode).toBe(422);
    expect(response.json().error.code).toBe("CAPTURE_MODE_NOT_SUPPORTED");
  });

  it("returns 400 for malformed requests", async () => {
    const app = createApp(loadParserServerConfig({}));
    const response = await app.inject({
      method: "POST",
      url: "/v1/imports/analyze",
      payload: { contractVersion: "2.0", url: "https://example.com" }
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe("ANALYZE_REQUEST_INVALID");
  });

  it("does not call analyze service for unsafe targets", async () => {
    const analyzeService: WebsiteAnalyzeService = {
      analyze: vi.fn()
    };
    const blockedError: SerializableError = {
      code: "IP_NOT_PUBLIC",
      message: "The target URL is not allowed.",
      retryable: false
    };
    const targetInspector: TargetInspector = {
      inspect: vi.fn(async () => ({ error: blockedError }))
    };
    const app = createApp(loadParserServerConfig({}), { targetInspector, analyzeService });

    const response = await app.inject({
      method: "POST",
      url: "/v1/imports/analyze",
      payload: validBody
    });

    expect(response.statusCode).toBe(422);
    expect(response.json().error.code).toBe("IP_NOT_PUBLIC");
    expect(analyzeService.analyze).not.toHaveBeenCalled();
  });

  it("keeps health and security inspection routes available", async () => {
    const app = createApp(loadParserServerConfig({}), {
      resolver: {
        async resolve() {
          return [{ address: "93.184.216.34", family: 4 }];
        }
      }
    });

    const health = await app.inject({ method: "GET", url: "/health" });
    const security = await app.inject({
      method: "POST",
      url: "/v1/security/inspect-target",
      payload: { url: "https://example.com" }
    });

    expect(health.statusCode).toBe(200);
    expect(security.statusCode).toBe(200);
    expect(security.json().safe).toBe(true);
  });
});
