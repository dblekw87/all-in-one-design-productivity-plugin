import { z } from "zod";

const finite = z.number().finite();
const parsed = z.object({ raw: z.string(), parsed: z.boolean(), value: z.unknown().optional() }).strict();
const edge = (schema: z.ZodTypeAny) => z.object({ top: schema, right: schema, bottom: schema, left: schema }).strict();
const corner = (schema: z.ZodTypeAny) => z.object({ topLeft: schema, topRight: schema, bottomRight: schema, bottomLeft: schema }).strict();
const rect = z.object({ x: finite, y: finite, width: finite, height: finite }).strict();
const boxMetrics = z.object({
  clientWidth: finite.nonnegative(), clientHeight: finite.nonnegative(),
  offsetWidth: finite.nonnegative(), offsetHeight: finite.nonnegative(),
  scrollWidth: finite.nonnegative(), scrollHeight: finite.nonnegative()
}).strict();
const typography = z.object({
  fontFamily: z.string().optional(), fontSize: parsed.optional(), fontWeight: parsed.optional(),
  fontStyle: z.string().optional(), lineHeight: parsed.optional(), letterSpacing: parsed.optional(),
  color: parsed.optional(), textAlign: z.string().optional(), textTransform: z.string().optional(),
  textDecoration: z.string().optional(), whiteSpace: z.string().optional(), wordBreak: z.string().optional(),
  overflowWrap: z.string().optional()
}).strict();
const pseudo = z.object({ type: z.enum(["BEFORE", "AFTER"]), contentRaw: z.string(), style: z.record(z.unknown()) }).strict();
const style = z.object({
  display: parsed, position: parsed, visibility: z.string().optional(), opacity: parsed.optional(),
  overflow: z.string().optional(), overflowX: z.string().optional(), overflowY: z.string().optional(),
  box: z.object({
    padding: edge(parsed), margin: edge(parsed), borderWidth: edge(parsed), borderStyle: edge(z.string()),
    borderColor: edge(parsed), radius: corner(parsed)
  }).strict(),
  typography,
  sizing: z.record(z.unknown()),
  visual: z.record(z.unknown()), flex: z.record(z.unknown()), grid: z.record(z.unknown()),
  pseudo: z.array(pseudo),
  visibilityEvidence: z.object({
    hiddenAttribute: z.boolean(), ariaHidden: z.boolean(), inert: z.boolean(), displayNone: z.boolean(),
    visibilityHidden: z.boolean(), opacityZero: z.boolean(), zeroArea: z.boolean(), intersectsViewport: z.boolean()
  }).strict()
}).strict();

export const normalizedNodeSchema: z.ZodTypeAny = z.lazy(() => z.discriminatedUnion("nodeType", [
  z.object({
    nodeType: z.literal("ELEMENT"), id: z.string().regex(/^dom_\d{6}$/),
    parentId: z.string().regex(/^dom_\d{6}$/).optional(), tagName: z.string().min(1),
    attributes: z.record(z.string()), inlineSvg: z.string().max(200_000).optional(), semantic: z.record(z.string()), state: z.record(z.boolean()), style,
    geometry: z.object({
      viewportRect: rect, documentRect: rect, boxMetrics,
      viewportState: z.object({ intersects: z.boolean(), fullyInside: z.boolean() }).strict(),
      zeroSize: z.object({ width: z.boolean(), height: z.boolean(), area: z.boolean() }).strict(),
      overflow: z.object({ ownBox: z.boolean() }).strict()
    }).strict(),
    children: z.array(normalizedNodeSchema)
  }).strict(),
  z.object({
    nodeType: z.literal("TEXT"), id: z.string().regex(/^dom_\d{6}$/),
    parentId: z.string().regex(/^dom_\d{6}$/), text: z.string(), whitespaceOnly: z.boolean()
  }).strict()
]));

export const normalizedPageModelSchema = z.object({
  modelVersion: z.literal("1.0"),
  source: z.object({
    domSnapshotVersion: z.literal("1.0"), styleSnapshotVersion: z.literal("1.0"), geometryVersion: z.literal("1.0"),
    requestedUrl: z.string().url(), finalUrl: z.string().url(), capturedAt: z.string().datetime()
  }).strict(),
  viewport: z.object({ width: finite.positive(), height: finite.positive(), deviceScaleFactor: finite.positive(), scrollX: finite, scrollY: finite }).strict(),
  document: z.object({ scrollWidth: finite.nonnegative(), scrollHeight: finite.nonnegative(), clientWidth: finite.nonnegative(), clientHeight: finite.nonnegative() }).strict(),
  root: normalizedNodeSchema,
  metrics: z.object({
    totalNodeCount: z.number().int().nonnegative(), elementNodeCount: z.number().int().nonnegative(), textNodeCount: z.number().int().nonnegative(),
    flexContainerCount: z.number().int().nonnegative(), gridContainerCount: z.number().int().nonnegative(), absoluteElementCount: z.number().int().nonnegative(),
    fixedElementCount: z.number().int().nonnegative(), stickyElementCount: z.number().int().nonnegative(), unparsedLengthCount: z.number().int().nonnegative(),
    unparsedColorCount: z.number().int().nonnegative(), unparsedNumberCount: z.number().int().nonnegative(), normalizationTimeMs: finite.nonnegative()
  }).strict(),
  warnings: z.array(z.object({ code: z.string(), message: z.string(), count: z.number().int().positive(), sampleNodeIds: z.array(z.string()) }).strict())
}).strict();
