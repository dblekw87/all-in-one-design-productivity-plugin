import { z } from "zod";

const finiteNumber = z.number().finite();
const rectSchema = z.object({ x: finiteNumber, y: finiteNumber, top: finiteNumber, right: finiteNumber, bottom: finiteNumber, left: finiteNumber, width: finiteNumber.nonnegative(), height: finiteNumber.nonnegative() }).strict();

export const geometryEvidenceEntrySchema = z.object({
  snapshotId: z.string().regex(/^dom_\d{6}$/),
  boundingRect: rectSchema,
  documentRect: z.object({ x: finiteNumber, y: finiteNumber, width: finiteNumber.nonnegative(), height: finiteNumber.nonnegative() }).strict(),
  boxMetrics: z.object({
    clientWidth: finiteNumber.nonnegative(), clientHeight: finiteNumber.nonnegative(),
    offsetWidth: finiteNumber.nonnegative(), offsetHeight: finiteNumber.nonnegative(),
    scrollWidth: finiteNumber.nonnegative(), scrollHeight: finiteNumber.nonnegative()
  }).strict(),
  flags: z.object({
    zeroWidth: z.boolean(), zeroHeight: z.boolean(), zeroArea: z.boolean(),
    intersectsViewport: z.boolean(), fullyInsideViewport: z.boolean(), overflowsOwnBox: z.boolean()
  }).strict()
}).strict();

export const geometryEvidenceDocumentSchema = z.object({
  geometryVersion: z.literal("1.0"),
  source: z.object({ domSnapshotVersion: z.literal("1.0"), styleSnapshotVersion: z.literal("1.0"), requestedUrl: z.string().url(), finalUrl: z.string().url(), capturedAt: z.string().datetime() }).strict(),
  viewport: z.object({ width: finiteNumber.positive(), height: finiteNumber.positive(), deviceScaleFactor: finiteNumber.positive(), scrollX: finiteNumber, scrollY: finiteNumber }).strict(),
  document: z.object({ scrollWidth: finiteNumber.nonnegative(), scrollHeight: finiteNumber.nonnegative(), clientWidth: finiteNumber.nonnegative(), clientHeight: finiteNumber.nonnegative() }).strict(),
  entries: z.array(geometryEvidenceEntrySchema),
  metrics: z.object({ entryCount: z.number().int().nonnegative(), zeroAreaCount: z.number().int().nonnegative(), outsideViewportCount: z.number().int().nonnegative(), partiallyVisibleCount: z.number().int().nonnegative(), overflowingElementCount: z.number().int().nonnegative(), extractionTimeMs: finiteNumber.nonnegative() }).strict(),
  warnings: z.array(z.object({ code: z.enum(["GEOMETRY_ENTRY_MISSING", "GEOMETRY_VALUE_INVALID", "ZERO_AREA_ELEMENT", "ELEMENT_OUTSIDE_VIEWPORT", "GEOMETRY_ENTRY_LIMIT_REACHED", "SNAPSHOT_PIPELINE_UNSTABLE"]), message: z.string().min(1), snapshotId: z.string().optional(), severity: z.enum(["INFO", "WARNING"]) }).strict())
}).strict();
