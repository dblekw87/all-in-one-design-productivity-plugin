import { describe, expect, it } from "vitest";
import {
  MESSAGE_PROTOCOL_VERSION,
  PluginMessageType,
  createMessageId,
  createNotImplementedResult,
  createOperationId,
  safeParsePluginEvent,
  safeParsePluginRequest,
  safeParsePluginResponse,
  analyzeWebsiteRequestSchema,
  analyzeWebsiteResponseSchema,
  analyzeWarningSchema,
  captureCapabilitiesSchema,
  captureModeSchema,
  captureSnapshotSchema,
  captureSourceSchema,
  serializableErrorSchema,
  websiteTargetInspectionRequestSchema,
  websiteTargetInspectionResponseSchema,
  type CapabilityMetadata,
  type SerializableError
} from "../src/index.js";

const websiteImportMetadata: CapabilityMetadata = {
  id: "website-import",
  category: "IMPORT",
  label: "Website Import",
  description: "Import a public website into editable Figma layers.",
  order: 10,
  enabled: true
};

const emptySelection = {
  selectionCount: 0,
  nodeTypes: [],
  textNodeCount: 0,
  frameNodeCount: 0,
  componentNodeCount: 0,
  instanceNodeCount: 0,
  pageId: "page-1",
  version: 0,
  nodes: []
};

describe("shared message contracts", () => {
  it("validates a request envelope", () => {
    const request = {
      protocolVersion: MESSAGE_PROTOCOL_VERSION,
      messageId: createMessageId(),
      type: PluginMessageType.PLUGIN_INITIALIZE_REQUEST,
      timestamp: new Date().toISOString(),
      payload: {}
    };

    expect(safeParsePluginRequest(request).success).toBe(true);
  });

  it("rejects a malformed envelope", () => {
    const result = safeParsePluginRequest({
      messageId: "not-prefixed",
      type: PluginMessageType.PLUGIN_INITIALIZE_REQUEST,
      timestamp: new Date().toISOString(),
      payload: {}
    });

    expect(result.success).toBe(false);
  });

  it("validates response correlation IDs", () => {
    const requestId = createMessageId();
    const response = {
      protocolVersion: MESSAGE_PROTOCOL_VERSION,
      messageId: createMessageId(),
      correlationId: requestId,
      type: PluginMessageType.PLUGIN_INITIALIZE_RESPONSE,
      timestamp: new Date().toISOString(),
      payload: {
        pluginVersion: "0.0.0",
        protocolVersion: MESSAGE_PROTOCOL_VERSION,
        capabilities: [websiteImportMetadata],
        selection: emptySelection
      }
    };

    expect(safeParsePluginResponse(response).success).toBe(true);
  });

  it("validates event envelopes", () => {
    const event = {
      protocolVersion: MESSAGE_PROTOCOL_VERSION,
      messageId: createMessageId(),
      type: PluginMessageType.SELECTION_CHANGED_EVENT,
      timestamp: new Date().toISOString(),
      payload: { selection: emptySelection }
    };

    expect(safeParsePluginEvent(event).success).toBe(true);
  });

  it("validates serializable errors", () => {
    const error: SerializableError = {
      code: "MESSAGE_TIMEOUT",
      message: "Timed out",
      retryable: true,
      details: { timeoutMs: 10_000 }
    };

    expect(serializableErrorSchema.parse(error)).toEqual(error);
  });

  it("creates a serializable not implemented result", () => {
    const result = createNotImplementedResult("website-import", createOperationId());

    expect(result.success).toBe(false);
    expect(result.failures[0]?.code).toBe("NOT_IMPLEMENTED");
    expect(JSON.parse(JSON.stringify(result))).toEqual(result);
  });

  it("validates website target inspection contracts", () => {
    expect(websiteTargetInspectionRequestSchema.parse({ url: "https://example.com" })).toEqual({
      url: "https://example.com"
    });

    expect(
      websiteTargetInspectionResponseSchema.parse({
        safe: true,
        normalizedUrl: "https://example.com/",
        hostname: "example.com",
        resolvedAddresses: ["93.184.216.34"]
      })
    ).toEqual({
      safe: true,
      normalizedUrl: "https://example.com/",
      hostname: "example.com",
      resolvedAddresses: ["93.184.216.34"]
    });

    expect(
      websiteTargetInspectionResponseSchema.parse({
        safe: false,
        error: {
          code: "IP_NOT_PUBLIC",
          message: "The target URL is not allowed.",
          retryable: false
        }
      })
    ).toMatchObject({ safe: false });
  });

  it("applies analyze request defaults", () => {
    const parsed = analyzeWebsiteRequestSchema.parse({
      contractVersion: "1.0",
      url: "https://example.com"
    });

    expect(parsed.viewport).toEqual({ width: 1440, height: 1200, deviceScaleFactor: 1 });
    expect(parsed.captureMode).toBe("PUBLIC_URL");
    expect(parsed.capture).toEqual({ mode: "VIEWPORT" });
    expect(parsed.options).toEqual({
      excludeHidden: true,
      excludeIframes: true,
      excludeCanvas: true,
      includePseudoElements: true
    });
  });

  it("validates capture platform contracts", () => {
    expect(captureModeSchema.options).toEqual([
      "PUBLIC_URL",
      "BROWSER_TAB",
      "LOCAL_HTML",
      "LOCAL_ZIP",
      "LOCALHOST",
      "SNAPSHOT",
      "UNKNOWN"
    ]);
    expect(captureSourceSchema.parse({ mode: "PUBLIC_URL", inputUrl: "https://example.com", normalizedUrl: "https://example.com/", providerId: "public-url" })).toMatchObject({
      mode: "PUBLIC_URL",
      providerId: "public-url"
    });
    expect(captureCapabilitiesSchema.parse({ mode: "LOCAL_HTML", providerId: "local-html", label: "Local HTML", supportsRemoteNavigation: false, supportsLocalPayload: true, implemented: false })).toMatchObject({
      implemented: false
    });
  });

  it("validates universal capture snapshot contracts", () => {
    const snapshot = captureSnapshotSchema.parse({
      version: "1.0",
      capture: {
        mode: "PUBLIC_URL",
        providerId: "public-url",
        source: { mode: "PUBLIC_URL", providerId: "public-url", normalizedUrl: "https://example.com/" }
      },
      document: {
        requestedUrl: "https://example.com",
        finalUrl: "https://example.com/",
        title: "Example",
        contentType: "text/html",
        capturedAt: "2026-07-26T00:00:00.000Z"
      },
      viewport: { width: 1440, height: 900, deviceScaleFactor: 1 },
      scroll: { x: 0, y: 0 },
      metadata: {
        captureMode: "PUBLIC_URL",
        captureProvider: "public-url",
        browser: "playwright",
        platform: "parser-server",
        captureTime: "2026-07-26T00:00:00.000Z",
        theme: "unknown",
        devicePixelRatio: 1,
        viewport: { width: 1440, height: 900, deviceScaleFactor: 1 },
        scroll: { x: 0, y: 0 }
      },
      dom: {},
      styles: {},
      geometry: {},
      assets: {},
      pseudo: { beforeCount: 1, afterCount: 2 },
      svg: { count: 3, inlineCount: 1, externalCount: 2 },
      screenshots: { captures: [] },
      warnings: [],
      metrics: {
        domCount: 10,
        styleCount: 8,
        geometryCount: 7,
        svgCount: 3,
        pseudoCount: 3,
        assetCount: 4,
        warningCount: 0,
        durationMs: 12
      }
    });

    expect(snapshot.version).toBe("1.0");
    expect(snapshot.capture.mode).toBe("PUBLIC_URL");
    expect(snapshot.metrics.pseudoCount).toBe(3);
  });

  it("rejects invalid analyze requests", () => {
    expect(() =>
      analyzeWebsiteRequestSchema.parse({
        contractVersion: "2.0",
        url: "https://example.com"
      })
    ).toThrow();

    expect(() =>
      analyzeWebsiteRequestSchema.parse({
        contractVersion: "1.0",
        url: "https://example.com",
        viewport: { width: 100, height: 1200, deviceScaleFactor: 1 }
      })
    ).toThrow();

    expect(() =>
      analyzeWebsiteRequestSchema.parse({
        contractVersion: "1.0",
        url: "https://example.com",
        capture: { mode: "FIXED_HEIGHT" }
      })
    ).toThrow();

    expect(() =>
      analyzeWebsiteRequestSchema.parse({
        contractVersion: "1.0",
        url: "https://example.com",
        extra: true
      })
    ).toThrow();
  });

  it("validates analyze response and warning contracts", () => {
    expect(
      analyzeWarningSchema.parse({
        code: "BROWSER_RUNTIME_NOT_IMPLEMENTED",
        message: "Browser analysis is not available yet.",
        severity: "INFO"
      })
    ).toMatchObject({ severity: "INFO" });

    expect(
      analyzeWebsiteResponseSchema.parse({
        contractVersion: "1.0",
        requestId: "req_test",
        status: "NOT_IMPLEMENTED",
        target: { normalizedUrl: "https://example.com/" },
        captureSource: { mode: "PUBLIC_URL", normalizedUrl: "https://example.com/" },
        viewport: { width: 1440, height: 1200, deviceScaleFactor: 1 },
        assets: [],
        warnings: [
          {
            code: "BROWSER_RUNTIME_NOT_IMPLEMENTED",
            message: "Browser analysis is not available yet.",
            severity: "INFO"
          }
        ],
        metrics: {
          processingTimeMs: 0,
          domNodeCount: 0,
          designNodeCount: 0,
          assetCount: 0
        }
      })
    ).toMatchObject({ status: "NOT_IMPLEMENTED" });
  });
});
