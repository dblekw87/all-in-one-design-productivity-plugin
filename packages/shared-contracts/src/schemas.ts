import { z } from "zod";
import { PluginMessageType, MESSAGE_PROTOCOL_VERSION } from "./messaging.js";
import type { PluginEvent, PluginRequest, PluginResponse } from "./messaging.js";

export const errorCodeSchema = z.enum([
  "INVALID_MESSAGE",
  "UNSUPPORTED_MESSAGE_TYPE",
  "HANDLER_EXECUTION_FAILED",
  "CAPABILITY_NOT_FOUND",
  "NOT_IMPLEMENTED",
  "MESSAGE_TIMEOUT",
  "CANCEL_NOT_SUPPORTED",
  "CAPABILITY_INPUT_INVALID",
  "CAPABILITY_VALIDATION_FAILED",
  "CAPABILITY_EXECUTION_FAILED",
  "CAPABILITY_CANCELLED",
  "OPERATION_NOT_FOUND",
  "CAPABILITY_DISABLED",
  "ANALYZE_REQUEST_INVALID",
  "ANALYZE_FAILED",
  "BROWSER_LAUNCH_FAILED",
  "BROWSER_DISCONNECTED",
  "BROWSER_CONTEXT_CREATION_FAILED",
  "BROWSER_PAGE_CREATION_FAILED",
  "BROWSER_NAVIGATION_FAILED",
  "BROWSER_NAVIGATION_TIMEOUT",
  "BROWSER_NAVIGATION_CANCELLED",
  "BROWSER_RESPONSE_MISSING",
  "BROWSER_RUNTIME_CLOSED",
  "BROWSER_CLEANUP_FAILED",
  "BROWSER_REQUEST_BLOCKED",
  "BROWSER_PROTOCOL_BLOCKED",
  "BROWSER_METHOD_BLOCKED",
  "BROWSER_RESOURCE_TYPE_BLOCKED",
  "BROWSER_DNS_VALIDATION_FAILED",
  "BROWSER_IP_NOT_PUBLIC",
  "BROWSER_REDIRECT_LIMIT_EXCEEDED",
  "BROWSER_REDIRECT_DOWNGRADE_BLOCKED",
  "BROWSER_REDIRECT_TARGET_BLOCKED",
  "BROWSER_FINAL_URL_BLOCKED",
  "BROWSER_POPUP_BLOCKED",
  "BROWSER_DOWNLOAD_BLOCKED",
  "BROWSER_WEBSOCKET_BLOCKED",
  "NETWORK_REQUEST_LIMIT_EXCEEDED",
  "TARGET_HTTP_CLIENT_ERROR",
  "TARGET_HTTP_SERVER_ERROR",
  "TARGET_CONTENT_TYPE_NOT_SUPPORTED",
  "URL_INVALID",
  "URL_TOO_LONG",
  "URL_PROTOCOL_NOT_ALLOWED",
  "URL_CREDENTIALS_NOT_ALLOWED",
  "HOSTNAME_INVALID",
  "HOSTNAME_FORBIDDEN",
  "DNS_RESOLUTION_FAILED",
  "DNS_NO_ADDRESS",
  "IP_NOT_PUBLIC",
  "METADATA_ENDPOINT_BLOCKED",
  "REDIRECT_LIMIT_EXCEEDED",
  "REDIRECT_PROTOCOL_DOWNGRADE",
  "REDIRECT_TARGET_BLOCKED",
  "SECURITY_VALIDATION_FAILED",
  "STYLE_EXTRACTION_FAILED",
  "STYLE_SNAPSHOT_INVALID",
  "STYLE_SNAPSHOT_MISMATCH",
  "STYLE_ENTRY_LIMIT_REACHED",
  "GEOMETRY_EXTRACTION_FAILED",
  "GEOMETRY_EVIDENCE_INVALID",
  "GEOMETRY_SNAPSHOT_MISMATCH",
  "SNAPSHOT_PIPELINE_UNSTABLE",
  "NORMALIZATION_FAILED", "NORMALIZED_MODEL_INVALID", "NORMALIZED_MODEL_SEMANTIC_INVALID", "NORMALIZATION_SOURCE_MISMATCH",
  "INTERNAL_ERROR"
]);

export const serializableErrorSchema = z.object({
  code: errorCodeSchema,
  message: z.string().min(1),
  details: z.record(z.unknown()).optional(),
  retryable: z.boolean()
});

export const capabilityCategorySchema = z.enum([
  "IMPORT",
  "REPLACE",
  "WRITING",
  "INSPECT",
  "GENERATE",
  "SETTINGS"
]);

export const capabilityMetadataSchema = z.object({
  id: z.string().min(1),
  category: capabilityCategorySchema,
  label: z.string().min(1),
  description: z.string(),
  order: z.number(),
  enabled: z.boolean(),
  experimental: z.boolean().optional(),
  supportsPreview: z.boolean().optional(),
  supportsCancel: z.boolean().optional(),
  supportsRestore: z.boolean().optional()
});

export const capabilityWarningSchema = z.object({
  code: z.string().min(1),
  message: z.string().min(1),
  severity: z.enum(["LOW", "MEDIUM", "HIGH"]),
  nodeId: z.string().optional(),
  sourceSelector: z.string().optional(),
  recoverable: z.boolean()
});

export const capabilityFailureSchema = z.object({
  code: z.string().min(1),
  message: z.string().min(1),
  nodeId: z.string().optional(),
  sourceSelector: z.string().optional(),
  cause: z.string().optional()
});

export const capabilityResultSchema = z.object({
  capabilityId: z.string().min(1),
  operationId: z.string().regex(/^op_/),
  success: z.boolean(),
  processedCount: z.number().int().nonnegative(),
  createdCount: z.number().int().nonnegative(),
  changedCount: z.number().int().nonnegative(),
  skippedCount: z.number().int().nonnegative(),
  failedCount: z.number().int().nonnegative(),
  warnings: z.array(capabilityWarningSchema),
  failures: z.array(capabilityFailureSchema),
  startedAt: z.string().datetime(),
  completedAt: z.string().datetime()
});

export const selectionNodeSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string()
});

export const selectionSummarySchema = z.object({
  selectionCount: z.number().int().nonnegative(),
  nodeTypes: z.array(z.string()),
  textNodeCount: z.number().int().nonnegative(),
  frameNodeCount: z.number().int().nonnegative(),
  componentNodeCount: z.number().int().nonnegative(),
  instanceNodeCount: z.number().int().nonnegative(),
  pageId: z.string(),
  version: z.number().int().nonnegative(),
  nodes: z.array(selectionNodeSummarySchema)
});

const envelopeBaseSchema = z.object({
  protocolVersion: z.literal(MESSAGE_PROTOCOL_VERSION),
  messageId: z.string().regex(/^msg_/),
  correlationId: z.string().regex(/^msg_/).optional(),
  timestamp: z.string().datetime()
});

const emptyPayloadSchema = z.object({}).strict();

const capabilityRunPayloadSchema = z.object({
  capabilityId: z.string().min(1),
  operationId: z.string().regex(/^op_/),
  input: z.unknown()
});

const capabilityCancelPayloadSchema = z.object({
  operationId: z.string().regex(/^op_/)
});

const initializationDataSchema = z.object({
  pluginVersion: z.string(),
  protocolVersion: z.literal(MESSAGE_PROTOCOL_VERSION),
  capabilities: z.array(capabilityMetadataSchema),
  selection: selectionSummarySchema
});

const capabilityProgressSchema = z.object({
  operationId: z.string().regex(/^op_/),
  capabilityId: z.string().min(1),
  phase: z.string().min(1),
  progress: z.number().min(0).max(1),
  message: z.string().optional()
});

function envelopeSchema<T extends z.ZodTypeAny>(type: string, payload: T) {
  return envelopeBaseSchema.extend({
    type: z.literal(type),
    payload
  });
}

export const pluginRequestSchema = z.discriminatedUnion("type", [
  envelopeSchema(PluginMessageType.PLUGIN_INITIALIZE_REQUEST, emptyPayloadSchema),
  envelopeSchema(PluginMessageType.CAPABILITY_LIST_REQUEST, emptyPayloadSchema),
  envelopeSchema(PluginMessageType.SELECTION_SCAN_REQUEST, emptyPayloadSchema),
  envelopeSchema(PluginMessageType.CAPABILITY_RUN_REQUEST, capabilityRunPayloadSchema),
  envelopeSchema(PluginMessageType.CAPABILITY_CANCEL_REQUEST, capabilityCancelPayloadSchema)
]);

export const pluginResponseSchema = z.discriminatedUnion("type", [
  envelopeSchema(PluginMessageType.PLUGIN_INITIALIZE_RESPONSE, initializationDataSchema),
  envelopeSchema(
    PluginMessageType.CAPABILITY_LIST_RESPONSE,
    z.object({ capabilities: z.array(capabilityMetadataSchema) })
  ),
  envelopeSchema(
    PluginMessageType.SELECTION_SCAN_RESPONSE,
    z.object({ selection: selectionSummarySchema })
  ),
  envelopeSchema(PluginMessageType.CAPABILITY_RUN_RESPONSE, z.object({ result: capabilityResultSchema })),
  envelopeSchema(
    PluginMessageType.CAPABILITY_CANCEL_RESPONSE,
    z.object({
      operationId: z.string().regex(/^op_/),
      cancelled: z.boolean(),
      reason: z.string().optional()
    })
  ),
  envelopeSchema(PluginMessageType.PLUGIN_ERROR_RESPONSE, z.object({ error: serializableErrorSchema }))
]);

export const pluginEventSchema = z.discriminatedUnion("type", [
  envelopeSchema(PluginMessageType.PLUGIN_READY_EVENT, initializationDataSchema),
  envelopeSchema(
    PluginMessageType.SELECTION_CHANGED_EVENT,
    z.object({ selection: selectionSummarySchema })
  ),
  envelopeSchema(PluginMessageType.CAPABILITY_PROGRESS_EVENT, capabilityProgressSchema),
  envelopeSchema(PluginMessageType.CAPABILITY_COMPLETE_EVENT, z.object({ result: capabilityResultSchema }))
]);

export const pluginMessageSchema = z.union([pluginRequestSchema, pluginResponseSchema, pluginEventSchema]);

export const websiteTargetInspectionRequestSchema = z
  .object({
    url: z.string().min(1).max(2048)
  })
  .strict();

export const websiteTargetInspectionResponseSchema = z.discriminatedUnion("safe", [
  z.object({
    safe: z.literal(true),
    normalizedUrl: z.string().url(),
    hostname: z.string(),
    resolvedAddresses: z.array(z.string())
  }),
  z.object({
    safe: z.literal(false),
    error: serializableErrorSchema
  })
]);

const analyzeViewportSchema = z
  .object({
    width: z.number().int().min(320).max(3840).default(1440),
    height: z.number().int().min(320).max(5000).default(1200),
    deviceScaleFactor: z.number().min(0.5).max(3).default(1)
  })
  .strict()
  .default({});

const analyzeCaptureSchema = z
  .discriminatedUnion("mode", [
    z
      .object({
        mode: z.literal("VIEWPORT"),
        maxHeight: z.undefined().optional()
      })
      .strict(),
    z
      .object({
        mode: z.literal("FIXED_HEIGHT"),
        maxHeight: z.number().int().min(320).max(10_000)
      })
      .strict()
  ])
  .default({ mode: "VIEWPORT" });

const analyzeOptionsSchema = z
  .object({
    excludeHidden: z.boolean().default(true),
    excludeIframes: z.boolean().default(true),
    excludeCanvas: z.boolean().default(true),
    includePseudoElements: z.boolean().default(true)
  })
  .strict()
  .default({});

export const analyzeWebsiteRequestSchema = z
  .object({
    contractVersion: z.literal("1.0"),
    url: z.string().min(1).max(2048),
    viewport: analyzeViewportSchema,
    capture: analyzeCaptureSchema,
    options: analyzeOptionsSchema
  })
  .strict();

export const analyzeWarningSchema = z
  .object({
    code: z.string().min(1),
    message: z.string().min(1),
    severity: z.enum(["INFO", "WARNING", "ERROR"]),
    sourceNodeId: z.string().optional(),
    sourceSelector: z.string().optional()
  })
  .strict();

export const analyzeAssetReferenceSchema = z
  .object({
    id: z.string().min(1),
    type: z.enum(["IMAGE", "SVG", "RASTER_FALLBACK"]),
    mimeType: z.string().min(1),
    sourceUrl: z.string().optional(),
    retrievalUrl: z.string().optional(),
    contentHash: z.string().optional(),
    width: z.number().int().positive().optional(),
    height: z.number().int().positive().optional()
  })
  .strict();

export const analyzeMetricsSchema = z
  .object({
    processingTimeMs: z.number().nonnegative(),
    domNodeCount: z.number().int().nonnegative(),
    designNodeCount: z.number().int().nonnegative(),
    assetCount: z.number().int().nonnegative(),
    geometryEntryCount: z.number().int().nonnegative().optional()
  })
  .strict();

export const analyzeWebsiteResponseSchema = z
  .object({
    contractVersion: z.literal("1.0"),
    requestId: z.string().regex(/^req_/),
    status: z.enum(["NOT_IMPLEMENTED", "BROWSER_NAVIGATED", "DOM_SNAPSHOTTED", "STYLE_SNAPSHOTTED", "GEOMETRY_CAPTURED", "NORMALIZED", "LAYOUT_EVIDENCE_BUILT", "LAYOUT_INFERRED", "SIZING_INFERRED", "ASSET_REFERENCES_EXTRACTED", "ASSETS_RESOLVED", "DESIGN_IR_BUILT", "ANALYZED"]),
    target: z
      .object({
        normalizedUrl: z.string().url()
      })
      .strict(),
    viewport: z
      .object({
        width: z.number().int(),
        height: z.number().int(),
        deviceScaleFactor: z.number()
      })
      .strict(),
    document: z.unknown().optional(),
    snapshot: z.unknown().optional(),
    styleSnapshot: z.unknown().optional(),
    geometry: z.unknown().optional(),
    normalizedModel: z.unknown().optional(),
    layoutEvidence: z.unknown().optional(),
    layoutInference: z.unknown().optional(),
    sizingInference: z.unknown().optional(),
    assetReferences: z.unknown().optional(),
    resolvedAssets: z.unknown().optional(),
    navigation: z
      .object({
        requestedUrl: z.string().url(),
        finalUrl: z.string().url(),
        statusCode: z.number().int().nullable(),
        title: z.string(),
        contentType: z.string().nullable()
      })
      .strict()
      .optional(),
    security: z
      .object({
        totalRequests: z.number().int().nonnegative(),
        allowedRequests: z.number().int().nonnegative(),
        blockedRequests: z.number().int().nonnegative(),
        redirectCount: z.number().int().nonnegative(),
        blockedByCode: z.record(z.number().int().nonnegative()),
        warnings: z.array(analyzeWarningSchema)
      })
      .strict()
      .optional(),
    assets: z.array(analyzeAssetReferenceSchema),
    warnings: z.array(analyzeWarningSchema),
    metrics: analyzeMetricsSchema
  })
  .strict();

export function parsePluginRequest(value: unknown) {
  return pluginRequestSchema.parse(value) as PluginRequest;
}

export function safeParsePluginRequest(value: unknown) {
  const result = pluginRequestSchema.safeParse(value);
  return result.success
    ? ({ success: true, data: result.data as PluginRequest } as const)
    : ({ success: false, error: result.error } as const);
}

export function safeParsePluginResponse(value: unknown) {
  const result = pluginResponseSchema.safeParse(value);
  return result.success
    ? ({ success: true, data: result.data as PluginResponse } as const)
    : ({ success: false, error: result.error } as const);
}

export function safeParsePluginEvent(value: unknown) {
  const result = pluginEventSchema.safeParse(value);
  return result.success
    ? ({ success: true, data: result.data as PluginEvent } as const)
    : ({ success: false, error: result.error } as const);
}

export function safeParsePluginMessage(value: unknown) {
  return pluginMessageSchema.safeParse(value);
}
