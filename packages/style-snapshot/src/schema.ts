import { z } from "zod";
import { STYLE_PROPERTIES } from "./properties.js";

const stylePropertySchema = z.enum(STYLE_PROPERTIES as [string, ...string[]]);
const computedStyleSchema = z.record(stylePropertySchema, z.string());

export const styleSnapshotWarningSchema = z.object({
  code: z.enum([
    "STYLE_ENTRY_MISSING", "STYLE_EXTRACTION_FAILED", "PSEUDO_CONTENT_UNSUPPORTED",
    "PSEUDO_STYLE_EXTRACTION_FAILED", "UNSUPPORTED_COMPUTED_VALUE", "STYLE_ENTRY_LIMIT_REACHED"
  ]),
  message: z.string().min(1),
  snapshotId: z.string().optional(),
  property: z.string().optional(),
  severity: z.enum(["INFO", "WARNING"])
}).strict();

const pseudoSchema = z.object({
  pseudoType: z.enum(["BEFORE", "AFTER"]),
  content: z.string(),
  styles: computedStyleSchema
}).strict();

export const styleSnapshotEntrySchema = z.object({
  snapshotId: z.string().regex(/^dom_\d{6}$/),
  styles: computedStyleSchema,
  pseudo: z.object({ before: pseudoSchema.optional(), after: pseudoSchema.optional() }).strict().optional()
}).strict();

export const styleSnapshotDocumentSchema = z.object({
  styleSnapshotVersion: z.literal("1.0"),
  source: z.object({
    domSnapshotVersion: z.literal("1.0"),
    requestedUrl: z.string().url(),
    finalUrl: z.string().url(),
    capturedAt: z.string().datetime()
  }).strict(),
  entries: z.array(styleSnapshotEntrySchema),
  metrics: z.object({
    entryCount: z.number().int().nonnegative(),
    pseudoBeforeCount: z.number().int().nonnegative(),
    pseudoAfterCount: z.number().int().nonnegative(),
    flexContainerCount: z.number().int().nonnegative(),
    gridContainerCount: z.number().int().nonnegative(),
    hiddenByDisplayCount: z.number().int().nonnegative(),
    hiddenByVisibilityCount: z.number().int().nonnegative(),
    transparentElementCount: z.number().int().nonnegative(),
    extractionTimeMs: z.number().nonnegative()
  }).strict(),
  warnings: z.array(styleSnapshotWarningSchema)
}).strict();
