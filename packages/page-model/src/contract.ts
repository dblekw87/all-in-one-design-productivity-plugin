import type { DomSnapshotVersion, DomSnapshotSemantic } from "@aio/dom-snapshot";
import type { StyleSnapshotDocument } from "@aio/style-snapshot";
import type { GeometryEvidenceDocument } from "@aio/geometry-evidence";
import type { PageModelVersion } from "./version.js";

export type NormalizedLength =
  | { type: "PX"; value: number }
  | { type: "PERCENT"; value: number }
  | { type: "EM"; value: number }
  | { type: "REM"; value: number }
  | { type: "VW"; value: number }
  | { type: "VH"; value: number }
  | { type: "AUTO" }
  | { type: "NONE" }
  | { type: "NORMAL" }
  | { type: "KEYWORD"; value: string }
  | { type: "UNPARSED"; raw: string };

export interface ParsedCssValue<T> { raw: string; parsed: boolean; value?: T | undefined; }
export type NormalizedNumber = number | { type: "KEYWORD"; value: string };
export type NormalizedColor =
  | { type: "RGBA"; r: number; g: number; b: number; a: number; raw: string }
  | { type: "TRANSPARENT"; raw: string }
  | { type: "UNPARSED"; raw: string };
export type NormalizedDisplay = "BLOCK" | "INLINE" | "INLINE_BLOCK" | "FLEX" | "INLINE_FLEX" | "GRID" | "INLINE_GRID" | "NONE" | "TABLE" | "CONTENTS" | "OTHER";
export type NormalizedPosition = "STATIC" | "RELATIVE" | "ABSOLUTE" | "FIXED" | "STICKY" | "OTHER";

export interface NormalizedEdges<T> { top: T; right: T; bottom: T; left: T; }
export interface NormalizedCorners<T> { topLeft: T; topRight: T; bottomRight: T; bottomLeft: T; }
export type NormalizedSemantic = DomSnapshotSemantic;
export interface NormalizedElementState {
  hiddenAttribute: boolean; ariaHidden: boolean; inert: boolean;
  disabled: boolean; contentEditable: boolean;
}
export interface NormalizedVisibilityEvidence {
  hiddenAttribute: boolean; ariaHidden: boolean; inert: boolean;
  displayNone: boolean; visibilityHidden: boolean; opacityZero: boolean;
  zeroArea: boolean; intersectsViewport: boolean;
}
export interface NormalizedRect { x: number; y: number; width: number; height: number; }
export interface NormalizedGeometry {
  viewportRect: NormalizedRect;
  documentRect: NormalizedRect;
  boxMetrics: GeometryEvidenceDocument["entries"][number]["boxMetrics"];
  viewportState: { intersects: boolean; fullyInside: boolean };
  zeroSize: { width: boolean; height: boolean; area: boolean };
  overflow: { ownBox: boolean };
}
export interface NormalizedTypography {
  fontFamily?: string | undefined; fontSize?: ParsedCssValue<NormalizedLength> | undefined; fontWeight?: ParsedCssValue<NormalizedNumber> | undefined;
  fontStyle?: string | undefined; lineHeight?: ParsedCssValue<NormalizedLength> | undefined; letterSpacing?: ParsedCssValue<NormalizedLength> | undefined;
  color?: ParsedCssValue<NormalizedColor> | undefined; textAlign?: string | undefined; textTransform?: string | undefined;
  textDecoration?: string | undefined; whiteSpace?: string | undefined; wordBreak?: string | undefined; overflowWrap?: string | undefined;
}
export interface NormalizedFlexEvidence {
  isFlexContainer: boolean; direction?: string | undefined; wrap?: string | undefined; justifyContent?: string | undefined;
  alignItems?: string | undefined; alignContent?: string | undefined; alignSelf?: string | undefined; flexGrow?: ParsedCssValue<NormalizedNumber> | undefined;
  flexShrink?: ParsedCssValue<NormalizedNumber> | undefined; flexBasis?: ParsedCssValue<NormalizedLength> | undefined; order?: ParsedCssValue<NormalizedNumber> | undefined;
  rowGap?: ParsedCssValue<NormalizedLength> | undefined; columnGap?: ParsedCssValue<NormalizedLength> | undefined;
}
export interface NormalizedGridEvidence {
  isGridContainer: boolean; templateColumnsRaw?: string | undefined; templateRowsRaw?: string | undefined;
  autoColumnsRaw?: string | undefined; autoRowsRaw?: string | undefined; autoFlowRaw?: string | undefined;
  columnStartRaw?: string | undefined; columnEndRaw?: string | undefined; rowStartRaw?: string | undefined; rowEndRaw?: string | undefined;
  rowGap?: ParsedCssValue<NormalizedLength> | undefined; columnGap?: ParsedCssValue<NormalizedLength> | undefined;
  justifyItems?: string | undefined; alignItems?: string | undefined; justifySelf?: string | undefined; alignSelf?: string | undefined;
}
export interface NormalizedSizingSource {
  cssWidth?: ParsedCssValue<NormalizedLength> | undefined;
  cssHeight?: ParsedCssValue<NormalizedLength> | undefined;
  minWidth?: ParsedCssValue<NormalizedLength> | undefined;
  maxWidth?: ParsedCssValue<NormalizedLength> | undefined;
  minHeight?: ParsedCssValue<NormalizedLength> | undefined;
  maxHeight?: ParsedCssValue<NormalizedLength> | undefined;
  top?: ParsedCssValue<NormalizedLength> | undefined;
  right?: ParsedCssValue<NormalizedLength> | undefined;
  bottom?: ParsedCssValue<NormalizedLength> | undefined;
  left?: ParsedCssValue<NormalizedLength> | undefined;
  aspectRatioRaw?: string | undefined;
  boxSizing?: string | undefined;
}
export interface NormalizedPseudoElement { type: "BEFORE" | "AFTER"; contentRaw: string; style: { display?: string | undefined; position?: string | undefined; color?: ParsedCssValue<NormalizedColor> | undefined; backgroundColor?: ParsedCssValue<NormalizedColor> | undefined; backgroundImageRaw?: string | undefined; opacity?: ParsedCssValue<NormalizedNumber> | undefined; transformRaw?: string | undefined; boxShadowRaw?: string | undefined }; }
export interface NormalizedStyle {
  display: ParsedCssValue<NormalizedDisplay>; position: ParsedCssValue<NormalizedPosition>;
  visibility?: string | undefined; opacity?: ParsedCssValue<NormalizedNumber> | undefined; overflow?: string | undefined; overflowX?: string | undefined; overflowY?: string | undefined;
  box: { padding: NormalizedEdges<ParsedCssValue<NormalizedLength>>; margin: NormalizedEdges<ParsedCssValue<NormalizedLength>>; borderWidth: NormalizedEdges<ParsedCssValue<NormalizedLength>>; borderStyle: NormalizedEdges<string>; borderColor: NormalizedEdges<ParsedCssValue<NormalizedColor>>; radius: NormalizedCorners<ParsedCssValue<NormalizedLength>> };
  typography: NormalizedTypography;
  visual: { backgroundColor?: ParsedCssValue<NormalizedColor> | undefined; backgroundImageRaw?: string | undefined; boxShadowRaw?: string | undefined; filterRaw?: string | undefined; backdropFilterRaw?: string | undefined; transformRaw?: string | undefined; transformOriginRaw?: string | undefined };
  flex: NormalizedFlexEvidence; grid: NormalizedGridEvidence; sizing: NormalizedSizingSource; pseudo: NormalizedPseudoElement[];
  visibilityEvidence: NormalizedVisibilityEvidence;
}
export type NormalizedNode = NormalizedElementNode | NormalizedTextNode;
export interface NormalizedElementNode { nodeType: "ELEMENT"; id: string; parentId?: string | undefined; tagName: string; attributes: Record<string, string>; inlineSvg?: string | undefined; semantic: NormalizedSemantic; state: NormalizedElementState; style: NormalizedStyle; geometry: NormalizedGeometry; children: NormalizedNode[]; }
export interface NormalizedTextNode { nodeType: "TEXT"; id: string; parentId: string; text: string; whitespaceOnly: boolean; }
export interface NormalizationWarning { code: string; message: string; count: number; sampleNodeIds: string[]; }
export interface NormalizationMetrics { totalNodeCount: number; elementNodeCount: number; textNodeCount: number; flexContainerCount: number; gridContainerCount: number; absoluteElementCount: number; fixedElementCount: number; stickyElementCount: number; unparsedLengthCount: number; unparsedColorCount: number; unparsedNumberCount: number; normalizationTimeMs: number; }
export interface NormalizedPageModel { modelVersion: PageModelVersion; source: { domSnapshotVersion: DomSnapshotVersion; styleSnapshotVersion: StyleSnapshotDocument["styleSnapshotVersion"]; geometryVersion: GeometryEvidenceDocument["geometryVersion"]; requestedUrl: string; finalUrl: string; capturedAt: string }; viewport: { width: number; height: number; deviceScaleFactor: number; scrollX: number; scrollY: number }; document: GeometryEvidenceDocument["document"]; root: NormalizedElementNode; metrics: NormalizationMetrics; warnings: NormalizationWarning[]; }
