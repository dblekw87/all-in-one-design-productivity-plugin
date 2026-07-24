import type { AssetReferenceDocument } from "@aio/asset-reference";
import type { LayoutInferenceDocument } from "@aio/layout-inference";
import type { NormalizedPageModel } from "@aio/page-model";
import type { ResolvedAssetDocument } from "@aio/resolved-assets";
import type { SizingInferenceDocument } from "@aio/sizing-inference";

export type DesignIrNodeType = "DOCUMENT" | "FRAME" | "TEXT" | "IMAGE" | "VECTOR" | "UNSUPPORTED";
export type DesignIrLayoutMode = "NONE" | "VERTICAL" | "HORIZONTAL" | "WRAPPED_HORIZONTAL" | "WRAPPED_VERTICAL" | "GRID_REFERENCE" | "FREEFORM";
export type DesignIrSizingMode = "CONTENT" | "STRETCH" | "FIXED" | "RELATIVE" | "INTRINSIC" | "UNKNOWN";
export type DesignIrRenderPolicy = "RENDER" | "SKIP" | "PLACEHOLDER" | "ABSOLUTE_FALLBACK" | "MANUAL_REVIEW";
export type DesignIrWarningCode = "LOW_CONFIDENCE_LAYOUT_FALLBACK" | "LOW_CONFIDENCE_SIZING_FALLBACK" | "UNRESOLVED_ASSET_PLACEHOLDER" | "UNSUPPORTED_ELEMENT" | "COMPLEX_GRID_FALLBACK" | "FREEFORM_LAYOUT_FALLBACK" | "TEXT_STYLE_PARTIAL" | "VECTOR_REFERENCE_ONLY" | "BACKGROUND_STYLE_PARTIAL" | "EFFECT_STYLE_UNSUPPORTED" | "NODE_SKIPPED";
export type DesignIrUnsupportedReason = "IFRAME" | "CANVAS" | "VIDEO" | "COMPLEX_SVG" | "COMPLEX_GRID" | "LOW_CONFIDENCE_LAYOUT" | "INVALID_GEOMETRY" | "UNRESOLVED_ASSET" | "UNSUPPORTED_ELEMENT" | "OTHER";
export type DesignIrFallback = "PRESERVE_BOUNDS" | "PLACEHOLDER" | "SKIP_CHILDREN" | "PRESERVE_CHILDREN" | "RASTERIZE_LATER" | "MANUAL_REVIEW";

export interface DesignIrColor { r: number; g: number; b: number; a: number; }
export interface DesignIrEdges<T> { top: T; right: T; bottom: T; left: T; }
export interface DesignIrCorners<T> { topLeft: T; topRight: T; bottomRight: T; bottomLeft: T; }
export interface DesignIrGeometry { x: number; y: number; width: number; height: number; coordinateSpace: "DOCUMENT" | "PARENT"; source: "MEASURED_BOUNDING_RECT" | "NORMALIZED_PARENT_RELATIVE" | "FALLBACK"; }
export interface DesignIrVisibility { visible: boolean; renderPolicy: DesignIrRenderPolicy; reasons: string[]; }
export interface DesignIrConfidence { layout: number; horizontalSizing: number; verticalSizing: number; }
export interface DesignIrLayout { mode: DesignIrLayoutMode; primaryAlignment: string; counterAlignment: string; gap?: { primary?: number; cross?: number }; padding: DesignIrEdges<number>; positionedChildIds: string[]; confidence: number; fallbackApplied: boolean; }
export interface DesignIrAxisSizing { mode: DesignIrSizingMode; value?: number; confidence: number; constraints?: { min?: number; max?: number }; fallback: "USE_MEASURED_SIZE" | "USE_CONTENT" | "USE_STRETCH" | "PRESERVE_RELATIVE" | "PRESERVE_INTRINSIC"; }
export interface DesignIrSizing { horizontal: DesignIrAxisSizing; vertical: DesignIrAxisSizing; }
export interface DesignIrBorder { width: DesignIrEdges<number>; style: DesignIrEdges<string>; color: DesignIrEdges<DesignIrColor | undefined>; }
export interface DesignIrBackgroundLayer { type: "SOLID" | "IMAGE" | "GRADIENT_RAW" | "UNSUPPORTED"; color?: DesignIrColor; assetBindingId?: string; rawValue?: string; }
export interface DesignIrVisualStyle { opacity: number; backgrounds: DesignIrBackgroundLayer[]; border: DesignIrBorder; radius: DesignIrCorners<number>; shadows: string[]; overflow: "VISIBLE" | "HIDDEN" | "SCROLL" | "AUTO" | "UNKNOWN"; }
export interface DesignIrTypography { fontFamilies: string[]; fontSize?: number; fontWeight?: number; fontStyle?: string; lineHeight?: number; letterSpacing?: number; color?: DesignIrColor; textAlign: string; textDecoration?: string; textTransform?: string; whiteSpace?: string; }
export interface DesignIrAssetBinding { bindingId: string; assetId: string; resolutionStatus: string; mediaType: string; sha256?: string; byteLength?: number; usageNodeIds: string[]; renderStrategy: "RASTER_IMAGE" | "SANITIZED_SVG" | "PLACEHOLDER" | "SKIP" | "MANUAL_REVIEW"; }
export interface DesignIrWarning { code: DesignIrWarningCode; count: number; sampleNodeIds: string[]; message: string; }
export interface DesignIrFallbackRecord { nodeId: string; reason: string; strategy: string; }

export interface DesignIrNodeBase { id: string; nodeType: DesignIrNodeType; name: string; parentId?: string; sourceNodeId?: string; semantic?: { tagName?: string; role?: string; landmark?: string; ariaLabel?: string }; geometry: DesignIrGeometry; visibility: DesignIrVisibility; confidence: DesignIrConfidence; renderPolicy: DesignIrRenderPolicy; }
export interface DesignIrDocumentNode extends DesignIrNodeBase { nodeType: "DOCUMENT"; viewport: { width: number; height: number }; documentSize: { width: number; height: number }; children: DesignIrNode[]; }
export interface DesignIrFrameNode extends DesignIrNodeBase { nodeType: "FRAME"; layout: DesignIrLayout; sizing: DesignIrSizing; box: { padding: DesignIrEdges<number>; border: DesignIrBorder; radius: DesignIrCorners<number> }; visual: DesignIrVisualStyle; clipping: { clipsContent: boolean; source: "STYLE" | "FALLBACK" | "UNKNOWN" }; children: DesignIrNode[]; }
export interface DesignIrTextNode extends DesignIrNodeBase { nodeType: "TEXT"; text: string; typography: DesignIrTypography; sizing: DesignIrSizing; }
export interface DesignIrImageNode extends DesignIrNodeBase { nodeType: "IMAGE"; sizing: DesignIrSizing; assetBindingId?: string; fit: { mode: "FILL" | "FIT" | "CROP" | "TILE" | "NONE" | "UNKNOWN"; positionX?: number; positionY?: number }; opacity: number; }
export interface DesignIrVectorNode extends DesignIrNodeBase { nodeType: "VECTOR"; assetBindingId?: string; vectorStatus: "SANITIZED_SVG_AVAILABLE" | "REFERENCE_ONLY" | "UNSUPPORTED"; sizing: DesignIrSizing; }
export interface DesignIrUnsupportedNode extends DesignIrNodeBase { nodeType: "UNSUPPORTED"; unsupportedReason: DesignIrUnsupportedReason; fallback: DesignIrFallback; children?: DesignIrNode[]; }
export type DesignIrNode = DesignIrDocumentNode | DesignIrFrameNode | DesignIrTextNode | DesignIrImageNode | DesignIrVectorNode | DesignIrUnsupportedNode;

export interface DesignIrMetrics { totalNodeCount: number; documentNodeCount: number; frameNodeCount: number; textNodeCount: number; imageNodeCount: number; vectorNodeCount: number; unsupportedNodeCount: number; renderedNodeCount: number; skippedNodeCount: number; placeholderNodeCount: number; fallbackNodeCount: number; assetBindingCount: number; unresolvedAssetBindingCount: number; buildTimeMs: number; }
export interface DesignIrDocument { irVersion: "1.0"; source: { modelVersion: "1.0"; layoutInferenceVersion: "1.0"; sizingInferenceVersion: "1.0"; assetReferenceVersion: "1.0"; assetResolutionVersion: "1.0"; requestedUrl: string; finalUrl: string; generatedAt: string }; root: DesignIrDocumentNode; assetBindings: DesignIrAssetBinding[]; fallbacks: DesignIrFallbackRecord[]; metrics: DesignIrMetrics; warnings: DesignIrWarning[]; }
export type DesignIrInput = { model: NormalizedPageModel; layout: LayoutInferenceDocument; sizing: SizingInferenceDocument; assetReferences: AssetReferenceDocument; resolvedAssets: ResolvedAssetDocument };
