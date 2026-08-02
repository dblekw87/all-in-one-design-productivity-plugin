import { parseDesignIr, validateDesignIrSemantics, type DesignIrColor, type DesignIrDocument, type DesignIrNode, type DesignIrRenderPolicy } from "@aio/design-ir";
import type { CaptureSnapshot } from "@aio/shared-contracts";

interface SnapshotDomNode {
  captureNodeId: string;
  parentCaptureNodeId?: string;
  childCaptureNodeIds: string[];
  nodeType: "DOCUMENT" | "ELEMENT" | "TEXT";
  tagName?: string;
  textContent?: string;
  attributes?: Record<string, string>;
  semantic?: { role?: string; landmark?: string; ariaLabel?: string };
  hidden?: { hidden?: boolean; displayNone?: boolean; ariaHidden?: boolean; hiddenAttribute?: boolean };
}

interface SnapshotStyleEntry {
  captureNodeId: string;
  properties: Record<string, string>;
  evidence?: { isFlexContainer?: boolean; isGridContainer?: boolean };
}

interface SnapshotGeometryEntry {
  captureNodeId: string;
  documentX: number;
  documentY: number;
  width: number;
  height: number;
}

interface SnapshotAssetReference {
  assetReferenceId: string;
  sourceNodeId: string;
  source: string;
  url: string;
  dataUrl?: string;
  mediaType?: string;
  unsupported?: boolean;
}

interface SnapshotInlineSvgEntry {
  captureNodeId: string;
  outerHTML: string;
  safety?: { unsafe?: boolean };
  truncated?: boolean;
}

interface SnapshotScreenshotCapture {
  type?: string;
  dataUrl?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  deviceScaleFactor?: number;
}

type Context = {
  snapshot: CaptureSnapshot;
  nodes: Map<string, SnapshotDomNode>;
  styles: Map<string, SnapshotStyleEntry>;
  geometry: Map<string, SnapshotGeometryEntry>;
  inlineSvgs: Map<string, SnapshotInlineSvgEntry>;
  assetRefs: Map<string, SnapshotAssetReference[]>;
  irIds: Map<string, string>;
  sourceIds: Map<string, string>;
  rootCaptureNodeId?: string;
  rootOffset: { x: number; y: number };
  nextId: number;
  nextSourceId: number;
};

export interface BrowserSnapshotDesignIrOptions {
  includeScreenshotReference?: boolean;
  includeEditableLayers?: boolean;
}

export function buildDesignIrFromBrowserSnapshot(snapshot: CaptureSnapshot, options: BrowserSnapshotDesignIrOptions = {}): DesignIrDocument {
  const started = Date.now();
  const context: Context = {
    snapshot,
    nodes: new Map(domNodes(snapshot).map((node) => [node.captureNodeId, node])),
    styles: new Map(styleEntries(snapshot).map((entry) => [entry.captureNodeId, entry])),
    geometry: new Map(geometryEntries(snapshot).map((entry) => [entry.captureNodeId, entry])),
    inlineSvgs: new Map(inlineSvgEntries(snapshot).map((entry) => [entry.captureNodeId, entry])),
    assetRefs: groupAssets(assetReferences(snapshot)),
    irIds: new Map(),
    sourceIds: new Map(),
    rootOffset: { x: 0, y: 0 },
    nextId: 1,
    nextSourceId: 1
  };

  const sourceRoot = rootElement(context);
  if (sourceRoot) context.rootCaptureNodeId = sourceRoot.captureNodeId;
  const rootSize = visibleContentBounds(context);
  context.rootOffset = { x: rootSize.x, y: rootSize.y };
  const rootChild = sourceRoot ? buildNode(context, sourceRoot, undefined) : unsupportedRoot(context);
  const includeScreenshotReference = options.includeScreenshotReference ?? true;
  const includeEditableLayers = options.includeEditableLayers ?? true;
  const screenshots = includeScreenshotReference ? screenshotNodes(context) : [];
  const screenshotGroup = screenshots.length > 0 ? groupFrame(context, "Screenshot Reference", screenshots, rootSize, "SCREENSHOT_REFERENCE") : undefined;
  const editableGroup = includeEditableLayers ? groupFrame(context, "Editable Layers", [rootChild], rootSize, "EDITABLE_LAYERS") : undefined;
  const children = [screenshotGroup, editableGroup].filter((child): child is DesignIrNode => Boolean(child));
  const root = {
    nodeType: "DOCUMENT" as const,
    id: nextIrId(context),
    name: snapshot.document.title || "Browser Snapshot",
    geometry: { x: 0, y: 0, width: rootSize.width, height: rootSize.height, coordinateSpace: "DOCUMENT" as const, source: "MEASURED_BOUNDING_RECT" as const },
    visibility: { visible: true, renderPolicy: "RENDER" as const, reasons: [] },
    confidence: { layout: 0.6, horizontalSizing: 0.6, verticalSizing: 0.6 },
    renderPolicy: "RENDER" as const,
    viewport: snapshot.viewport,
    documentSize: { width: rootSize.width, height: rootSize.height },
    children
  };
  const all: DesignIrNode[] = [];
  visit(root as DesignIrNode, all);
  const payload = {
    irVersion: "1.0" as const,
    source: {
      modelVersion: "1.0" as const,
      layoutInferenceVersion: "1.0" as const,
      sizingInferenceVersion: "1.0" as const,
      assetReferenceVersion: "1.0" as const,
      assetResolutionVersion: "1.0" as const,
      requestedUrl: snapshot.document.requestedUrl ?? snapshot.capture.source.inputUrl ?? "browser-snapshot://unknown",
      finalUrl: snapshot.document.finalUrl ?? snapshot.capture.source.normalizedUrl ?? "browser-snapshot://unknown",
      generatedAt: new Date().toISOString()
    },
    root,
    assetBindings: [],
    fallbacks: includeEditableLayers ? [{ nodeId: rootChild.id, reason: "BROWSER_SNAPSHOT_DIRECT_FREEFORM", strategy: "ABSOLUTE_FALLBACK" }] : [],
    metrics: {
      totalNodeCount: all.length,
      documentNodeCount: all.filter((node) => node.nodeType === "DOCUMENT").length,
      frameNodeCount: all.filter((node) => node.nodeType === "FRAME").length,
      textNodeCount: all.filter((node) => node.nodeType === "TEXT").length,
      imageNodeCount: all.filter((node) => node.nodeType === "IMAGE").length,
      vectorNodeCount: all.filter((node) => node.nodeType === "VECTOR").length,
      unsupportedNodeCount: all.filter((node) => node.nodeType === "UNSUPPORTED").length,
      renderedNodeCount: all.filter((node) => node.renderPolicy === "RENDER").length,
      skippedNodeCount: all.filter((node) => node.renderPolicy === "SKIP").length,
      placeholderNodeCount: all.filter((node) => node.renderPolicy === "PLACEHOLDER").length,
      fallbackNodeCount: includeEditableLayers ? 1 : 0,
      assetBindingCount: 0,
      unresolvedAssetBindingCount: 0,
      buildTimeMs: Math.max(0, Date.now() - started)
    },
    warnings: includeEditableLayers ? [{ code: "FREEFORM_LAYOUT_FALLBACK" as const, count: 1, sampleNodeIds: [rootChild.id], message: "Browser Snapshot import uses measured geometry until Snapshot layout inference is implemented." }] : []
  };
  const document = parseDesignIr(payload);
  validateDesignIrSemantics(document);
  return document;
}

function buildNode(context: Context, node: SnapshotDomNode, parent: SnapshotDomNode | undefined): DesignIrNode {
  const id = getIrId(context, node.captureNodeId);
  if (node.nodeType === "TEXT") return textNode(context, node, parent, id);
  if (node.nodeType !== "ELEMENT") return unsupportedNode(context, node, parent, id, "OTHER", "SKIP");

  const tagName = (node.tagName ?? "div").toUpperCase();
  if (tagName === "IMG") return imageNode(context, node, parent, id);
  if (tagName === "SVG") return vectorNode(context, node, parent, id);
  if (["IFRAME", "CANVAS", "VIDEO"].includes(tagName)) return unsupportedNode(context, node, parent, id, tagName === "IFRAME" ? "IFRAME" : tagName === "CANVAS" ? "CANVAS" : "VIDEO", "PLACEHOLDER");

  const children = node.childCaptureNodeIds
    .map((childId) => context.nodes.get(childId))
    .filter((child): child is SnapshotDomNode => Boolean(child))
    .map((child) => buildNode(context, child, node));
  const style = styleProps(context, node.captureNodeId);
  const policy = renderPolicy(node);
  return {
    nodeType: "FRAME",
    ...base(context, node, parent, id, policy),
    layout: freeformLayout(style),
    sizing: fixedSizing(context, node.captureNodeId),
    box: { padding: edge(style, "padding"), border: { width: edge(style, "border-width"), style: stringEdge(style, "border-style"), color: colorEdge(style, "border-color") }, radius: radius(style) },
    visual: { opacity: number(style.opacity) ?? 1, backgrounds: backgrounds(style, context, node.captureNodeId), border: { width: edge(style, "border-width"), style: stringEdge(style, "border-style"), color: colorEdge(style, "border-color") }, radius: radius(style), shadows: style["box-shadow"] && style["box-shadow"] !== "none" ? [style["box-shadow"]] : [], overflow: overflow(style.overflow) },
    clipping: { clipsContent: style.overflow === "hidden", source: style.overflow === "hidden" ? "STYLE" : "UNKNOWN" },
    children
  };
}

function textNode(context: Context, node: SnapshotDomNode, parent: SnapshotDomNode | undefined, id: string): DesignIrNode {
  const style = styleProps(context, parent?.captureNodeId);
  const text = node.textContent ?? "";
  return {
    nodeType: "TEXT",
    ...base(context, node, parent, id, text.trim() ? "RENDER" : "SKIP"),
    text,
    typography: {
      fontFamilies: style["font-family"] ? [style["font-family"]] : [],
      ...optionalNumber("fontSize", px(style["font-size"])),
      ...optionalNumber("lineHeight", px(style["line-height"])),
      ...optionalNumber("letterSpacing", px(style["letter-spacing"])),
      ...optionalNumber("fontWeight", number(style["font-weight"])),
      ...optionalColor("color", parseColor(style.color)),
      textAlign: style["text-align"] ?? "UNKNOWN",
      ...(style["font-style"] ? { fontStyle: style["font-style"] } : {}),
      ...(style["text-decoration-line"] ? { textDecoration: style["text-decoration-line"] } : {}),
      ...(style["text-transform"] ? { textTransform: style["text-transform"] } : {}),
      ...(style["white-space"] ? { whiteSpace: style["white-space"] } : {})
    },
    sizing: { horizontal: { mode: "CONTENT", confidence: 0.3, fallback: "USE_CONTENT" }, vertical: { mode: "CONTENT", confidence: 0.3, fallback: "USE_CONTENT" } }
  };
}

function imageNode(context: Context, node: SnapshotDomNode, parent: SnapshotDomNode | undefined, id: string): DesignIrNode {
  const dataUrl = assetDataUrl(context, node.captureNodeId, (reference) => reference.source.startsWith("img-") || reference.source === "srcset");
  return {
    nodeType: "IMAGE",
    ...base(context, node, parent, id, dataUrl ? "RENDER" : "PLACEHOLDER"),
    ...(dataUrl ? { inlineDataUrl: dataUrl } : {}),
    sizing: fixedSizing(context, node.captureNodeId),
    fit: { mode: "UNKNOWN" },
    opacity: number(styleProps(context, node.captureNodeId).opacity) ?? 1
  };
}

function vectorNode(context: Context, node: SnapshotDomNode, parent: SnapshotDomNode | undefined, id: string): DesignIrNode {
  const svg = context.inlineSvgs.get(node.captureNodeId);
  const canRenderInline = Boolean(svg?.outerHTML && !svg.safety?.unsafe && !svg.truncated);
  return {
    nodeType: "VECTOR",
    ...base(context, node, parent, id, canRenderInline ? "RENDER" : "PLACEHOLDER"),
    ...(canRenderInline ? { inlineSvg: svg!.outerHTML } : {}),
    vectorStatus: canRenderInline ? "INLINE_SVG_AVAILABLE" : "UNSUPPORTED",
    sizing: fixedSizing(context, node.captureNodeId)
  };
}

function unsupportedNode(context: Context, node: SnapshotDomNode, parent: SnapshotDomNode | undefined, id: string, reason: "IFRAME" | "CANVAS" | "VIDEO" | "OTHER", policy: DesignIrRenderPolicy): DesignIrNode {
  return { nodeType: "UNSUPPORTED", ...base(context, node, parent, id, policy), unsupportedReason: reason, fallback: policy === "SKIP" ? "PRESERVE_BOUNDS" : "PLACEHOLDER" };
}

function unsupportedRoot(context: Context): DesignIrNode {
  return { nodeType: "UNSUPPORTED", id: nextIrId(context), name: "Snapshot", geometry: { x: 0, y: 0, width: context.snapshot.viewport.width, height: context.snapshot.viewport.height, coordinateSpace: "DOCUMENT", source: "FALLBACK" }, visibility: { visible: false, renderPolicy: "PLACEHOLDER", reasons: ["SNAPSHOT_DOM_MISSING"] }, confidence: { layout: 0, horizontalSizing: 0, verticalSizing: 0 }, renderPolicy: "PLACEHOLDER", unsupportedReason: "OTHER", fallback: "PLACEHOLDER" };
}

function screenshotNodes(context: Context): DesignIrNode[] {
  return screenshotCaptures(context.snapshot)
    .filter((entry) => typeof entry.dataUrl === "string" && entry.dataUrl.startsWith("data:image/"))
    .map((capture, index): DesignIrNode => screenshotNode(context, capture, index));
}

function screenshotNode(context: Context, capture: SnapshotScreenshotCapture, index: number): DesignIrNode {
  const dataUrl = capture.dataUrl;
  if (!dataUrl) throw new Error("SCREENSHOT_DATA_URL_MISSING");
  const width = positive(capture.width) ?? context.snapshot.viewport.width;
  const height = positive(capture.height) ?? context.snapshot.viewport.height;
  return {
    nodeType: "IMAGE",
    id: nextIrId(context),
    name: `Viewport Screenshot ${index + 1}`,
    geometry: {
      x: (capture.x ?? context.snapshot.scroll.x ?? 0) - context.rootOffset.x,
      y: (capture.y ?? context.snapshot.scroll.y ?? 0) - context.rootOffset.y,
      width,
      height,
      coordinateSpace: "DOCUMENT",
      source: "MEASURED_BOUNDING_RECT"
    },
    visibility: { visible: true, renderPolicy: "RENDER", reasons: [] },
    confidence: { layout: 1, horizontalSizing: 1, verticalSizing: 1 },
    renderPolicy: "RENDER",
    inlineDataUrl: dataUrl,
    sizing: {
      horizontal: { mode: "FIXED", value: width, confidence: 1, fallback: "USE_MEASURED_SIZE" },
      vertical: { mode: "FIXED", value: height, confidence: 1, fallback: "USE_MEASURED_SIZE" }
    },
    fit: { mode: "FILL" },
    opacity: 1
  };
}

function groupFrame(context: Context, name: string, children: DesignIrNode[], bounds: { width: number; height: number }, role: string): DesignIrNode {
  const id = nextIrId(context);
  return {
    nodeType: "FRAME",
    id,
    name,
    sourceNodeId: getSourceId(context, `group_${role.toLowerCase()}`),
    geometry: { x: 0, y: 0, width: bounds.width, height: bounds.height, coordinateSpace: "DOCUMENT", source: "MEASURED_BOUNDING_RECT" },
    visibility: { visible: true, renderPolicy: "RENDER", reasons: [] },
    confidence: { layout: 1, horizontalSizing: 1, verticalSizing: 1 },
    renderPolicy: "RENDER",
    layout: { mode: "FREEFORM", primaryAlignment: "UNKNOWN", counterAlignment: "UNKNOWN", padding: { top: 0, right: 0, bottom: 0, left: 0 }, positionedChildIds: [], confidence: 1, fallbackApplied: false },
    sizing: {
      horizontal: { mode: "FIXED", value: bounds.width, confidence: 1, fallback: "USE_MEASURED_SIZE" },
      vertical: { mode: "FIXED", value: bounds.height, confidence: 1, fallback: "USE_MEASURED_SIZE" }
    },
    box: { padding: { top: 0, right: 0, bottom: 0, left: 0 }, border: { width: { top: 0, right: 0, bottom: 0, left: 0 }, style: { top: "none", right: "none", bottom: "none", left: "none" }, color: { top: undefined, right: undefined, bottom: undefined, left: undefined } }, radius: { topLeft: 0, topRight: 0, bottomRight: 0, bottomLeft: 0 } },
    visual: { opacity: 1, backgrounds: [], border: { width: { top: 0, right: 0, bottom: 0, left: 0 }, style: { top: "none", right: "none", bottom: "none", left: "none" }, color: { top: undefined, right: undefined, bottom: undefined, left: undefined } }, radius: { topLeft: 0, topRight: 0, bottomRight: 0, bottomLeft: 0 }, shadows: [], overflow: "VISIBLE" },
    clipping: { clipsContent: false, source: "UNKNOWN" },
    children: children.map((child) => ({ ...child, parentId: id }))
  };
}

function base(context: Context, node: SnapshotDomNode, parent: SnapshotDomNode | undefined, id: string, policy: DesignIrRenderPolicy) {
  const rect = relativeRect(context, node.captureNodeId, parent?.captureNodeId);
  const tagName = node.tagName?.toUpperCase();
  return {
    id,
    name: node.attributes?.id || tagName || "Text",
    ...(parent ? { parentId: getIrId(context, parent.captureNodeId) } : {}),
    sourceNodeId: getSourceId(context, node.captureNodeId),
    ...(tagName || node.semantic ? { semantic: { ...(tagName ? { tagName } : {}), ...(node.semantic?.role ? { role: node.semantic.role } : {}), ...(node.semantic?.landmark ? { landmark: node.semantic.landmark } : {}), ...(node.semantic?.ariaLabel ? { ariaLabel: node.semantic.ariaLabel } : {}) } } : {}),
    geometry: { ...rect, coordinateSpace: parent ? "PARENT" as const : "DOCUMENT" as const, source: context.geometry.has(node.captureNodeId) ? "MEASURED_BOUNDING_RECT" as const : "FALLBACK" as const },
    visibility: { visible: policy === "RENDER", renderPolicy: policy, reasons: visibilityReasons(node) },
    confidence: { layout: 0.35, horizontalSizing: 0.45, verticalSizing: 0.45 },
    renderPolicy: policy
  };
}

function domNodes(snapshot: CaptureSnapshot): SnapshotDomNode[] {
  const dom = snapshot.dom as { nodes?: SnapshotDomNode[] } | undefined;
  return Array.isArray(dom?.nodes) ? dom.nodes : [];
}

function styleEntries(snapshot: CaptureSnapshot): SnapshotStyleEntry[] {
  const styles = snapshot.styles as { entries?: SnapshotStyleEntry[] } | undefined;
  return Array.isArray(styles?.entries) ? styles.entries : [];
}

function geometryEntries(snapshot: CaptureSnapshot): SnapshotGeometryEntry[] {
  const geometry = snapshot.geometry as { entries?: SnapshotGeometryEntry[] } | undefined;
  return Array.isArray(geometry?.entries) ? geometry.entries : [];
}

function assetReferences(snapshot: CaptureSnapshot): SnapshotAssetReference[] {
  const assets = snapshot.assets as { references?: SnapshotAssetReference[] } | undefined;
  return Array.isArray(assets?.references) ? assets.references : [];
}

function inlineSvgEntries(snapshot: CaptureSnapshot): SnapshotInlineSvgEntry[] {
  const svg = snapshot.svg as { entries?: SnapshotInlineSvgEntry[] } | undefined;
  return Array.isArray(svg?.entries) ? svg.entries : [];
}

function screenshotCaptures(snapshot: CaptureSnapshot): SnapshotScreenshotCapture[] {
  const screenshots = snapshot.screenshots as { captures?: SnapshotScreenshotCapture[] } | undefined;
  return Array.isArray(screenshots?.captures) ? screenshots.captures : [];
}

function groupAssets(references: SnapshotAssetReference[]): Map<string, SnapshotAssetReference[]> {
  const map = new Map<string, SnapshotAssetReference[]>();
  for (const reference of references) {
    const list = map.get(reference.sourceNodeId) ?? [];
    list.push(reference);
    map.set(reference.sourceNodeId, list);
  }
  return map;
}

function rootElement(context: Context): SnapshotDomNode | undefined {
  const documentNode = [...context.nodes.values()].find((node) => node.nodeType === "DOCUMENT");
  const childId = documentNode?.childCaptureNodeIds[0];
  return childId ? context.nodes.get(childId) : [...context.nodes.values()].find((node) => node.nodeType === "ELEMENT");
}

function getIrId(context: Context, sourceId: string): string {
  const existing = context.irIds.get(sourceId);
  if (existing) return existing;
  const id = nextIrId(context);
  context.irIds.set(sourceId, id);
  return id;
}

function nextIrId(context: Context): string {
  return `ir_${String(context.nextId++).padStart(6, "0")}`;
}

function getSourceId(context: Context, captureNodeId: string): string {
  const existing = context.sourceIds.get(captureNodeId);
  if (existing) return existing;
  const id = `dom_${String(context.nextSourceId++).padStart(6, "0")}`;
  context.sourceIds.set(captureNodeId, id);
  return id;
}

function styleProps(context: Context, nodeId?: string): Record<string, string> {
  return nodeId ? context.styles.get(nodeId)?.properties ?? {} : {};
}

function relativeRect(context: Context, nodeId: string, parentId?: string) {
  const rect = context.geometry.get(nodeId);
  const parent = parentId ? context.geometry.get(parentId) : undefined;
  if (!rect) return { x: 0, y: 0, width: 0, height: 0 };
  return {
    x: parent ? rect.documentX - parent.documentX : rect.documentX - context.rootOffset.x,
    y: parent ? rect.documentY - parent.documentY : rect.documentY - context.rootOffset.y,
    width: rect.width,
    height: rect.height
  };
}

function visibleContentBounds(context: Context) {
  const candidates = [...context.geometry.values()].filter((entry) => {
    const node = context.nodes.get(entry.captureNodeId);
    if (!node || node.nodeType !== "ELEMENT") return false;
    if (node.hidden?.displayNone || node.hidden?.hidden || node.hidden?.ariaHidden) return false;
    if (!Number.isFinite(entry.width) || !Number.isFinite(entry.height) || entry.width <= 0 || entry.height <= 0) return false;
    const tagName = node.tagName?.toUpperCase();
    if (tagName === "HTML" || tagName === "BODY") return false;
    return entry.width < context.snapshot.viewport.width * 0.9;
  });
  if (candidates.length === 0) return { x: 0, y: 0, width: documentWidth(context), height: documentHeight(context) };

  const left = Math.min(...candidates.map((entry) => entry.documentX));
  const top = Math.min(...candidates.map((entry) => entry.documentY));
  const right = Math.max(...candidates.map((entry) => entry.documentX + entry.width));
  const bottom = Math.max(...candidates.map((entry) => entry.documentY + entry.height));
  return {
    x: Math.max(0, left),
    y: Math.max(0, top),
    width: Math.max(1, right - left),
    height: Math.max(1, bottom - top)
  };
}

function fixedSizing(context: Context, nodeId: string) {
  const rect = context.geometry.get(nodeId);
  return {
    horizontal: { mode: "FIXED" as const, ...(rect ? { value: rect.width } : {}), confidence: rect ? 0.75 : 0.2, fallback: "USE_MEASURED_SIZE" as const },
    vertical: { mode: "FIXED" as const, ...(rect ? { value: rect.height } : {}), confidence: rect ? 0.75 : 0.2, fallback: "USE_MEASURED_SIZE" as const }
  };
}

function renderPolicy(node: SnapshotDomNode): DesignIrRenderPolicy {
  return node.hidden?.displayNone || node.hidden?.hidden ? "SKIP" : "RENDER";
}

function visibilityReasons(node: SnapshotDomNode): string[] {
  const reasons: string[] = [];
  if (node.hidden?.displayNone) reasons.push("DISPLAY_NONE");
  if (node.hidden?.hiddenAttribute) reasons.push("HIDDEN_ATTRIBUTE");
  if (node.hidden?.ariaHidden) reasons.push("ARIA_HIDDEN");
  return reasons;
}

function freeformLayout(style: Record<string, string>) {
  const cssMode = layoutMode(style);
  const horizontal = cssMode === "HORIZONTAL" || cssMode === "WRAPPED_HORIZONTAL";
  return {
    mode: "FREEFORM" as const,
    primaryAlignment: style["justify-content"] ?? "UNKNOWN",
    counterAlignment: style["align-items"] ?? "UNKNOWN",
    ...layoutGap(style, horizontal),
    padding: edge(style, "padding"),
    positionedChildIds: [],
    confidence: 0.45,
    fallbackApplied: cssMode !== "FREEFORM"
  };
}

function layoutMode(style: Record<string, string>) {
  const display = style.display ?? "";
  if (display.includes("grid")) return "GRID_REFERENCE" as const;
  if (display.includes("flex")) {
    const direction = style["flex-direction"] ?? "";
    const wraps = (style["flex-wrap"] ?? "").includes("wrap");
    if (direction.includes("column")) return wraps ? "WRAPPED_VERTICAL" as const : "VERTICAL" as const;
    return wraps ? "WRAPPED_HORIZONTAL" as const : "HORIZONTAL" as const;
  }
  return "FREEFORM" as const;
}

function layoutGap(style: Record<string, string>, horizontal: boolean) {
  const gap = px(style.gap);
  const rowGap = px(style["row-gap"]) ?? gap;
  const columnGap = px(style["column-gap"]) ?? gap;
  const primary = horizontal ? columnGap : rowGap;
  const cross = horizontal ? rowGap : columnGap;
  return primary !== undefined || cross !== undefined ? { gap: { ...(primary !== undefined ? { primary } : {}), ...(cross !== undefined ? { cross } : {}) } } : {};
}

function edge(style: Record<string, string>, prefix: string) {
  return { top: px(style[`${prefix}-top`]) ?? 0, right: px(style[`${prefix}-right`]) ?? 0, bottom: px(style[`${prefix}-bottom`]) ?? 0, left: px(style[`${prefix}-left`]) ?? 0 };
}

function stringEdge(style: Record<string, string>, prefix: string) {
  return { top: style[`${prefix}-top`] ?? "none", right: style[`${prefix}-right`] ?? "none", bottom: style[`${prefix}-bottom`] ?? "none", left: style[`${prefix}-left`] ?? "none" };
}

function colorEdge(style: Record<string, string>, prefix: string) {
  return { top: parseColor(style[`${prefix}-top`]), right: parseColor(style[`${prefix}-right`]), bottom: parseColor(style[`${prefix}-bottom`]), left: parseColor(style[`${prefix}-left`]) };
}

function radius(style: Record<string, string>) {
  return { topLeft: px(style["border-top-left-radius"]) ?? 0, topRight: px(style["border-top-right-radius"]) ?? 0, bottomRight: px(style["border-bottom-right-radius"]) ?? 0, bottomLeft: px(style["border-bottom-left-radius"]) ?? 0 };
}

function backgrounds(style: Record<string, string>, context?: Context, nodeId?: string) {
  const color = parseColor(style["background-color"]);
  const layers: Array<{ type: "SOLID"; color: DesignIrColor } | { type: "IMAGE"; inlineDataUrl: string; rawValue: string } | { type: "UNSUPPORTED"; rawValue: string }> = color && color.a > 0 ? [{ type: "SOLID", color }] : [];
  const inlineBackground = inlineImageDataUrl(style["background-image"]);
  const resolvedBackground = context && nodeId ? assetDataUrl(context, nodeId, (reference) => reference.source.includes("background-image")) : undefined;
  if (inlineBackground) layers.push({ type: "IMAGE", inlineDataUrl: inlineBackground, rawValue: style["background-image"]! });
  else if (resolvedBackground) layers.push({ type: "IMAGE", inlineDataUrl: resolvedBackground, rawValue: style["background-image"] ?? "resolved-background-image" });
  else if (style["background-image"] && style["background-image"] !== "none") layers.push({ type: "UNSUPPORTED", rawValue: style["background-image"] });
  return layers;
}

function assetDataUrl(context: Context, nodeId: string, predicate: (reference: SnapshotAssetReference) => boolean): string | undefined {
  return (context.assetRefs.get(nodeId) ?? []).find((reference) => predicate(reference) && reference.dataUrl?.startsWith("data:image/"))?.dataUrl;
}

function inlineImageDataUrl(value?: string): string | undefined {
  if (!value) return undefined;
  const match = /url\(["']?(data:image\/[^"')]+)["']?\)/i.exec(value);
  return match?.[1];
}

function overflow(value?: string) {
  return value === "hidden" ? "HIDDEN" as const : value === "scroll" ? "SCROLL" as const : value === "auto" ? "AUTO" as const : "VISIBLE" as const;
}

function px(value?: string): number | undefined {
  if (!value) return undefined;
  const match = /^(-?\d+(?:\.\d+)?)px$/.exec(value.trim());
  return match ? Number(match[1]) : undefined;
}

function number(value?: string): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function positive(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : undefined;
}

function parseColor(value?: string): DesignIrColor | undefined {
  if (!value || value === "transparent") return undefined;
  const rgba = /^rgba?\(([^)]+)\)$/.exec(value.trim());
  if (!rgba) return undefined;
  const parts = rgba[1]!.split(",").map((part) => Number(part.trim()));
  const [r, g, b, a = 1] = parts;
  if (![r, g, b, a].every((part) => Number.isFinite(part))) return undefined;
  return { r: Math.min(1, Math.max(0, r! / 255)), g: Math.min(1, Math.max(0, g! / 255)), b: Math.min(1, Math.max(0, b! / 255)), a: Math.min(1, Math.max(0, a!)) };
}

function optionalNumber<K extends string>(key: K, value: number | undefined): { [P in K]?: number } {
  return value === undefined ? {} : { [key]: value } as { [P in K]?: number };
}

function optionalColor<K extends string>(key: K, value: DesignIrColor | undefined): { [P in K]?: DesignIrColor } {
  return value === undefined ? {} : { [key]: value } as { [P in K]?: DesignIrColor };
}

function documentWidth(context: Context): number {
  return Math.max(context.snapshot.viewport.width, ...[...context.geometry.values()].map((entry) => entry.documentX + entry.width));
}

function documentHeight(context: Context): number {
  return Math.max(context.snapshot.viewport.height, ...[...context.geometry.values()].map((entry) => entry.documentY + entry.height));
}

function visit(node: DesignIrNode, all: DesignIrNode[]): void {
  all.push(node);
  if ("children" in node) for (const child of node.children ?? []) visit(child, all);
}
