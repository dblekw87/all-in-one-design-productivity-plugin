import { z } from "zod";
import { DOM_SNAPSHOT_VERSION } from "./version.js";

const warningCodeSchema = z.enum([
  "DOM_NODE_LIMIT_REACHED",
  "DOM_DEPTH_LIMIT_REACHED",
  "TEXT_NODE_TRUNCATED",
  "IFRAME_CONTENT_SKIPPED",
  "CANVAS_CONTENT_SKIPPED",
  "SHADOW_ROOT_SKIPPED",
  "PSEUDO_ELEMENT_EXTRACTION_DEFERRED"
]);

export const domSnapshotWarningSchema = z.object({
  code: warningCodeSchema,
  message: z.string().min(1),
  snapshotId: z.string().optional(),
  severity: z.enum(["INFO", "WARNING"])
}).strict();

const flagsSchema = z.object({
  hiddenAttribute: z.boolean(),
  ariaHidden: z.boolean(),
  inert: z.boolean(),
  disabled: z.boolean(),
  contentEditable: z.boolean()
}).strict();

const semanticSchema = z.object({
  role: z.string().optional(),
  ariaLabel: z.string().optional(),
  ariaDescription: z.string().optional(),
  ariaLabelledBy: z.string().optional(),
  ariaDescribedBy: z.string().optional(),
  landmark: z.string().optional()
}).strict();

export const domSnapshotNodeSchema: z.ZodType<unknown> = z.lazy(() => z.discriminatedUnion("nodeType", [
  z.object({
    nodeType: z.literal("ELEMENT"),
    snapshotId: z.string().regex(/^dom_\d{6}$/),
    parentSnapshotId: z.string().regex(/^dom_\d{6}$/).optional(),
    tagName: z.string().min(1),
    namespace: z.string().optional(),
    attributes: z.record(z.string()),
    semantic: semanticSchema,
    flags: flagsSchema,
    children: z.array(z.lazy(() => domSnapshotNodeSchema))
  }).strict(),
  z.object({
    nodeType: z.literal("TEXT"),
    snapshotId: z.string().regex(/^dom_\d{6}$/),
    parentSnapshotId: z.string().regex(/^dom_\d{6}$/),
    text: z.string(),
    flags: z.object({ whitespaceOnly: z.boolean() }).strict()
  }).strict()
])) as z.ZodType<unknown>;

export const domSnapshotMetricsSchema = z.object({
  elementNodeCount: z.number().int().nonnegative(),
  textNodeCount: z.number().int().nonnegative(),
  totalNodeCount: z.number().int().nonnegative(),
  maxDepthObserved: z.number().int().nonnegative(),
  iframeCount: z.number().int().nonnegative(),
  canvasCount: z.number().int().nonnegative(),
  svgCount: z.number().int().nonnegative(),
  imageCount: z.number().int().nonnegative(),
  hiddenAttributeCount: z.number().int().nonnegative(),
  ariaHiddenCount: z.number().int().nonnegative(),
  truncatedTextNodeCount: z.number().int().nonnegative(),
  skippedNodeCount: z.number().int().nonnegative(),
  nodeLimitReached: z.boolean(),
  depthLimitReached: z.boolean(),
  extractionTimeMs: z.number().nonnegative()
}).strict();

export const domSnapshotDocumentSchema = z.object({
  snapshotVersion: z.literal(DOM_SNAPSHOT_VERSION),
  source: z.object({
    requestedUrl: z.string().url(),
    finalUrl: z.string().url(),
    title: z.string(),
    capturedAt: z.string().datetime()
  }).strict(),
  root: domSnapshotNodeSchema,
  metrics: domSnapshotMetricsSchema,
  warnings: z.array(domSnapshotWarningSchema),
  extractionOptions: z.object({
    excludeHidden: z.boolean(),
    excludeIframes: z.boolean(),
    excludeCanvas: z.boolean(),
    includePseudoElements: z.boolean()
  }).strict()
}).strict();
