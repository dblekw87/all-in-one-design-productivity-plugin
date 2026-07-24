import type { DomSnapshotDocument, DomSnapshotElementNode, DomSnapshotNode } from "@aio/dom-snapshot";
import { validateStyleSnapshotReferences, type StyleSnapshotDocument, type StyleSnapshotEntry } from "@aio/style-snapshot";
import { validateGeometryEvidenceCrossSnapshot, type GeometryEvidenceDocument, type GeometryEvidenceEntry } from "@aio/geometry-evidence";
import { parseNormalizedPageModel, type NormalizedColor, type NormalizedDisplay, type NormalizedElementNode, type NormalizedLength, type NormalizedNumber, type NormalizedPageModel, type NormalizedPosition, type ParsedCssValue } from "@aio/page-model";
import { parseColor, parseLength, parseNumber } from "./css-values.js";

interface WarningState { count: number; sampleNodeIds: string[]; message: string; }

export function normalizePage(dom: DomSnapshotDocument, style: StyleSnapshotDocument, geometry: GeometryEvidenceDocument): NormalizedPageModel {
  validateStyleSnapshotReferences(style, dom);
  validateGeometryEvidenceCrossSnapshot(geometry, dom, style);
  const startedAt = Date.now();
  const styleMap = new Map(style.entries.map((entry) => [entry.snapshotId, entry]));
  const geometryMap = new Map(geometry.entries.map((entry) => [entry.snapshotId, entry]));
  const warnings = new Map<string, WarningState>();
  const metrics = { totalNodeCount: 0, elementNodeCount: 0, textNodeCount: 0, flexContainerCount: 0, gridContainerCount: 0, absoluteElementCount: 0, fixedElementCount: 0, stickyElementCount: 0, unparsedLengthCount: 0, unparsedColorCount: 0, unparsedNumberCount: 0, normalizationTimeMs: 0 };
  const addWarning = (code: string, message: string, nodeId?: string) => { const item = warnings.get(code) ?? { count: 0, sampleNodeIds: [], message }; item.count += 1; if (nodeId && item.sampleNodeIds.length < 3 && !item.sampleNodeIds.includes(nodeId)) item.sampleNodeIds.push(nodeId); warnings.set(code, item); };
  const trackedLength = (raw: string | undefined, nodeId: string): ParsedCssValue<NormalizedLength> => { const parsed = parseLength(raw); if (!parsed.parsed) { metrics.unparsedLengthCount += 1; addWarning("CSS_LENGTH_UNPARSED", "A CSS length was preserved without parsing.", nodeId); } return parsed; };
  const trackedColor = (raw: string | undefined, nodeId: string): ParsedCssValue<NormalizedColor> => { const parsed = parseColor(raw); if (!parsed.parsed) { metrics.unparsedColorCount += 1; addWarning("CSS_COLOR_UNPARSED", "A CSS color was preserved without parsing.", nodeId); } return parsed; };
  const trackedNumber = (raw: string | undefined, nodeId: string) => { const parsed = parseNumber(raw); if (!parsed.parsed) { metrics.unparsedNumberCount += 1; addWarning("CSS_NUMBER_UNPARSED", "A CSS number was preserved without parsing.", nodeId); } return parsed; };

  const visit = (node: DomSnapshotNode, parentId: string | undefined): NormalizedElementNode | { nodeType: "TEXT"; id: string; parentId: string; text: string; whitespaceOnly: boolean } => {
    metrics.totalNodeCount += 1;
    if (node.nodeType === "TEXT") { metrics.textNodeCount += 1; return { nodeType: "TEXT", id: node.snapshotId, parentId: node.parentSnapshotId, text: node.text, whitespaceOnly: node.flags.whitespaceOnly }; }
    metrics.elementNodeCount += 1;
    const styleEntry = styleMap.get(node.snapshotId);
    const geometryEntry = geometryMap.get(node.snapshotId);
    if (!styleEntry || !geometryEntry) throw new Error("Normalization source entry is missing");
    const normalized = normalizeElement(node, parentId, styleEntry, geometryEntry, trackedLength, trackedColor, trackedNumber, addWarning);
    const display = styleEntry.styles.display;
    const position = styleEntry.styles.position;
    if (display === "flex" || display === "inline-flex") metrics.flexContainerCount += 1;
    if (display === "grid" || display === "inline-grid") metrics.gridContainerCount += 1;
    if (position === "absolute") metrics.absoluteElementCount += 1;
    if (position === "fixed") metrics.fixedElementCount += 1;
    if (position === "sticky") metrics.stickyElementCount += 1;
    normalized.children = node.children.map((child) => visit(child, node.snapshotId));
    return normalized;
  };
  const root = visit(dom.root, undefined);
  if (root.nodeType !== "ELEMENT") throw new Error("Normalized root must be an element");
  metrics.normalizationTimeMs = Math.max(0, Date.now() - startedAt);
  return parseNormalizedPageModel({
    modelVersion: "1.0",
    source: { domSnapshotVersion: dom.snapshotVersion, styleSnapshotVersion: style.styleSnapshotVersion, geometryVersion: geometry.geometryVersion, requestedUrl: dom.source.requestedUrl, finalUrl: dom.source.finalUrl, capturedAt: dom.source.capturedAt },
    viewport: geometry.viewport,
    document: geometry.document,
    root,
    metrics,
    warnings: [...warnings.entries()].map(([code, warning]) => ({ code, ...warning }))
  });
}

function normalizeElement(node: DomSnapshotElementNode, parentId: string | undefined, styleEntry: StyleSnapshotEntry, geometryEntry: GeometryEvidenceEntry, length: (raw: string | undefined, id: string) => ParsedCssValue<NormalizedLength>, color: (raw: string | undefined, id: string) => ParsedCssValue<NormalizedColor>, number: (raw: string | undefined, id: string) => ParsedCssValue<NormalizedNumber>, warning: (code: string, message: string, id?: string) => void): NormalizedElementNode {
  const s = styleEntry.styles;
  const display = normalizeDisplay(s.display, node.snapshotId, warning);
  const position = normalizePosition(s.position, node.snapshotId, warning);
  const opacity = number(s.opacity, node.snapshotId);
  const geometry = { viewportRect: { x: geometryEntry.boundingRect.x, y: geometryEntry.boundingRect.y, width: geometryEntry.boundingRect.width, height: geometryEntry.boundingRect.height }, documentRect: geometryEntry.documentRect, boxMetrics: geometryEntry.boxMetrics, viewportState: { intersects: geometryEntry.flags.intersectsViewport, fullyInside: geometryEntry.flags.fullyInsideViewport }, zeroSize: { width: geometryEntry.flags.zeroWidth, height: geometryEntry.flags.zeroHeight, area: geometryEntry.flags.zeroArea }, overflow: { ownBox: geometryEntry.flags.overflowsOwnBox } };
  const before = styleEntry.pseudo?.before; const after = styleEntry.pseudo?.after;
  const pseudo = [before, after].filter(Boolean).map((item) => ({ type: item!.pseudoType, contentRaw: item!.content, style: { display: item!.styles.display, position: item!.styles.position, color: item!.styles.color ? color(item!.styles.color, node.snapshotId) : undefined, backgroundColor: item!.styles.backgroundColor ? color(item!.styles.backgroundColor, node.snapshotId) : undefined, backgroundImageRaw: item!.styles.backgroundImage, opacity: item!.styles.opacity ? number(item!.styles.opacity, node.snapshotId) : undefined, transformRaw: item!.styles.transform, boxShadowRaw: item!.styles.boxShadow } }));
  const padding = edges(s, "padding", length, node.snapshotId); const margin = edges(s, "margin", length, node.snapshotId); const borderWidth = edges(s, "border", length, node.snapshotId); const borderStyle = stringEdges(s, "border"); const borderColor = colorEdges(s, "border", color, node.snapshotId); const radius = corners(s, length, node.snapshotId);
  const flex = { isFlexContainer: display.value === "FLEX" || display.value === "INLINE_FLEX", direction: s.flexDirection, wrap: s.flexWrap, justifyContent: s.justifyContent, alignItems: s.alignItems, alignContent: s.alignContent, alignSelf: s.alignSelf, flexGrow: s.flexGrow ? number(s.flexGrow, node.snapshotId) : undefined, flexShrink: s.flexShrink ? number(s.flexShrink, node.snapshotId) : undefined, flexBasis: s.flexBasis ? length(s.flexBasis, node.snapshotId) : undefined, order: s.order ? number(s.order, node.snapshotId) : undefined, rowGap: s.rowGap ? length(s.rowGap, node.snapshotId) : undefined, columnGap: s.columnGap ? length(s.columnGap, node.snapshotId) : undefined };
  const grid = { isGridContainer: display.value === "GRID" || display.value === "INLINE_GRID", templateColumnsRaw: s.gridTemplateColumns, templateRowsRaw: s.gridTemplateRows, autoColumnsRaw: s.gridAutoColumns, autoRowsRaw: s.gridAutoRows, autoFlowRaw: s.gridAutoFlow, columnStartRaw: s.gridColumnStart, columnEndRaw: s.gridColumnEnd, rowStartRaw: s.gridRowStart, rowEndRaw: s.gridRowEnd, rowGap: s.rowGap ? length(s.rowGap, node.snapshotId) : undefined, columnGap: s.columnGap ? length(s.columnGap, node.snapshotId) : undefined, justifyItems: s.justifyItems, alignItems: s.alignItems, justifySelf: s.justifySelf, alignSelf: s.alignSelf };
  const sizing = { cssWidth: s.width ? length(s.width, node.snapshotId) : undefined, cssHeight: s.height ? length(s.height, node.snapshotId) : undefined, minWidth: s.minWidth ? length(s.minWidth, node.snapshotId) : undefined, maxWidth: s.maxWidth ? length(s.maxWidth, node.snapshotId) : undefined, minHeight: s.minHeight ? length(s.minHeight, node.snapshotId) : undefined, maxHeight: s.maxHeight ? length(s.maxHeight, node.snapshotId) : undefined, top: s.top ? length(s.top, node.snapshotId) : undefined, right: s.right ? length(s.right, node.snapshotId) : undefined, bottom: s.bottom ? length(s.bottom, node.snapshotId) : undefined, left: s.left ? length(s.left, node.snapshotId) : undefined, aspectRatioRaw: s.aspectRatio, boxSizing: s.boxSizing };
  return { nodeType: "ELEMENT", id: node.snapshotId, parentId, tagName: node.tagName, attributes: node.attributes, semantic: node.semantic, state: node.flags, style: { display, position, visibility: s.visibility, opacity, overflow: s.overflow, overflowX: s.overflowX, overflowY: s.overflowY, box: { padding, margin, borderWidth, borderStyle, borderColor, radius }, typography: { fontFamily: s.fontFamily, fontSize: s.fontSize ? length(s.fontSize, node.snapshotId) : undefined, fontWeight: s.fontWeight ? number(s.fontWeight, node.snapshotId) : undefined, fontStyle: s.fontStyle, lineHeight: s.lineHeight ? length(s.lineHeight, node.snapshotId) : undefined, letterSpacing: s.letterSpacing ? length(s.letterSpacing, node.snapshotId) : undefined, color: s.color ? color(s.color, node.snapshotId) : undefined, textAlign: s.textAlign, textTransform: s.textTransform, textDecoration: s.textDecorationLine, whiteSpace: s.whiteSpace, wordBreak: s.wordBreak, overflowWrap: s.overflowWrap }, visual: { backgroundColor: s.backgroundColor ? color(s.backgroundColor, node.snapshotId) : undefined, backgroundImageRaw: s.backgroundImage, boxShadowRaw: s.boxShadow, filterRaw: s.filter, backdropFilterRaw: s.backdropFilter, transformRaw: s.transform, transformOriginRaw: s.transformOrigin }, flex, grid, sizing, pseudo, visibilityEvidence: { hiddenAttribute: node.flags.hiddenAttribute, ariaHidden: node.flags.ariaHidden, inert: node.flags.inert, displayNone: s.display === "none", visibilityHidden: s.visibility === "hidden" || s.visibility === "collapse", opacityZero: s.opacity === "0", zeroArea: geometryEntry.flags.zeroArea, intersectsViewport: geometryEntry.flags.intersectsViewport } }, geometry, children: [] };
}

function normalizeDisplay(raw: string | undefined, id: string, warning: (code: string, message: string, id?: string) => void): ParsedCssValue<NormalizedDisplay> { const value = raw?.toLowerCase(); const map: Record<string, NormalizedDisplay> = { block: "BLOCK", inline: "INLINE", "inline-block": "INLINE_BLOCK", flex: "FLEX", "inline-flex": "INLINE_FLEX", grid: "GRID", "inline-grid": "INLINE_GRID", none: "NONE", table: "TABLE", contents: "CONTENTS" }; if (!value) return { raw: "", parsed: false }; if (!map[value]) warning("UNSUPPORTED_DISPLAY_VALUE", "A display value was preserved as OTHER.", id); return { raw: raw!, parsed: true, value: map[value] ?? "OTHER" }; }
function normalizePosition(raw: string | undefined, id: string, warning: (code: string, message: string, id?: string) => void): ParsedCssValue<NormalizedPosition> { const value = raw?.toLowerCase(); const map: Record<string, NormalizedPosition> = { static: "STATIC", relative: "RELATIVE", absolute: "ABSOLUTE", fixed: "FIXED", sticky: "STICKY" }; if (!value) return { raw: "", parsed: false }; if (!map[value]) warning("UNSUPPORTED_POSITION_VALUE", "A position value was preserved as OTHER.", id); return { raw: raw!, parsed: true, value: map[value] ?? "OTHER" }; }
function edges(s: Record<string, string>, prefix: string, parse: (raw: string | undefined, id: string) => ParsedCssValue<NormalizedLength>, id: string) { return { top: parse(s[`${prefix}Top${prefix === "border" ? "Width" : ""}`], id), right: parse(s[`${prefix}Right${prefix === "border" ? "Width" : ""}`], id), bottom: parse(s[`${prefix}Bottom${prefix === "border" ? "Width" : ""}`], id), left: parse(s[`${prefix}Left${prefix === "border" ? "Width" : ""}`], id) }; }
function stringEdges(s: Record<string, string>, prefix: string) { return { top: s[`${prefix}TopStyle`] ?? "", right: s[`${prefix}RightStyle`] ?? "", bottom: s[`${prefix}BottomStyle`] ?? "", left: s[`${prefix}LeftStyle`] ?? "" }; }
function colorEdges(s: Record<string, string>, prefix: string, parse: (raw: string | undefined, id: string) => ParsedCssValue<NormalizedColor>, id: string) { return { top: parse(s[`${prefix}TopColor`], id), right: parse(s[`${prefix}RightColor`], id), bottom: parse(s[`${prefix}BottomColor`], id), left: parse(s[`${prefix}LeftColor`], id) }; }
function corners(s: Record<string, string>, parse: (raw: string | undefined, id: string) => ParsedCssValue<NormalizedLength>, id: string) { return { topLeft: parse(s.borderTopLeftRadius, id), topRight: parse(s.borderTopRightRadius, id), bottomRight: parse(s.borderBottomRightRadius, id), bottomLeft: parse(s.borderBottomLeftRadius, id) }; }
