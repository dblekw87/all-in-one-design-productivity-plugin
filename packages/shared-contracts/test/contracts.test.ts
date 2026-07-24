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
    expect(parsed.capture).toEqual({ mode: "VIEWPORT" });
    expect(parsed.options).toEqual({
      excludeHidden: true,
      excludeIframes: true,
      excludeCanvas: true,
      includePseudoElements: true
    });
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
