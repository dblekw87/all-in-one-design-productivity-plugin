import { z } from "zod";

const finite = z.number().finite();
const optionalFinite = finite.optional();
const stats = z.object({ values: z.array(finite), count: z.number().int().nonnegative(), minimum: optionalFinite, maximum: optionalFinite, average: optionalFinite, median: optionalFinite, variance: optionalFinite, coefficientOfVariation: optionalFinite }).strict();
const axis = z.object({ childCount: z.number().int().nonnegative(), ordered: z.boolean(), monotonic: z.boolean(), overlapRatio: finite.min(0).max(1), alignmentRatio: finite.min(0).max(1), averageGap: optionalFinite, gapVariance: optionalFinite }).strict();
const group = z.object({ childIds: z.array(z.string()), start: finite, end: finite, crossAxisCenter: finite }).strict();
const padding = z.object({ declared: z.object({ top: optionalFinite, right: optionalFinite, bottom: optionalFinite, left: optionalFinite }).strict(), observed: z.object({ top: optionalFinite, right: optionalFinite, bottom: optionalFinite, left: optionalFinite }).strict(), difference: z.object({ top: optionalFinite, right: optionalFinite, bottom: optionalFinite, left: optionalFinite }).strict(), comparable: z.boolean() }).strict();
const entry = z.object({
  nodeId: z.string(), parentId: z.string().optional(), sourceDisplay: z.string(), sourcePosition: z.string(),
  children: z.object({ total: z.number().int().nonnegative(), elementCount: z.number().int().nonnegative(), textCount: z.number().int().nonnegative(), directTextNodeCount: z.number().int().nonnegative(), nonWhitespaceDirectTextNodeCount: z.number().int().nonnegative(), flowElementIds: z.array(z.string()), positionedElementIds: z.array(z.string()), zeroAreaElementIds: z.array(z.string()) }).strict(),
  contentBounds: z.object({ minX: finite, minY: finite, maxX: finite, maxY: finite, width: finite.nonnegative(), height: finite.nonnegative() }).strict().optional(),
  axes: z.object({ horizontal: axis, vertical: axis }).strict(),
  spacing: z.object({ horizontalGap: stats, verticalGap: stats, parentPadding: padding }).strict(),
  alignment: z.record(z.unknown()),
  overlap: z.object({ pairCount: z.number().int().nonnegative(), overlappingPairCount: z.number().int().nonnegative(), overlapRatio: finite.min(0).max(1), maximumIntersectionArea: finite.nonnegative(), overlappingPairsSample: z.array(z.object({ firstId: z.string(), secondId: z.string(), intersectionArea: finite.nonnegative() }).strict()) }).strict(),
  wrapping: z.object({ rowGroups: z.array(group), columnGroups: z.array(group) }).strict(),
  sizing: z.record(z.unknown()), sourceEvidence: z.record(z.unknown())
}).strict();
export const layoutEvidenceDocumentSchema = z.object({
  evidenceVersion: z.literal("1.0"),
  source: z.object({ modelVersion: z.literal("1.0"), requestedUrl: z.string().url(), finalUrl: z.string().url(), capturedAt: z.string().datetime() }).strict(),
  entries: z.array(entry),
  metrics: z.object({ entryCount: z.number().int().nonnegative(), flexSourceCount: z.number().int().nonnegative(), gridSourceCount: z.number().int().nonnegative(), blockSourceCount: z.number().int().nonnegative(), containersWithMultipleChildren: z.number().int().nonnegative(), containersWithOverlap: z.number().int().nonnegative(), containersWithWrappingCandidates: z.number().int().nonnegative(), containersWithPositionedChildren: z.number().int().nonnegative(), evidenceTimeMs: finite.nonnegative() }).strict(),
  warnings: z.array(z.object({ code: z.enum(["INSUFFICIENT_CHILDREN", "MIXED_TEXT_AND_ELEMENT_CHILDREN", "OVERLAP_ANALYSIS_LIMITED", "UNCOMPARABLE_PADDING", "GEOMETRY_INCONSISTENT", "LAYOUT_EVIDENCE_PARTIAL"]), message: z.string(), nodeId: z.string().optional(), severity: z.enum(["INFO", "WARNING"]) }).strict())
}).strict();
