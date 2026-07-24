import type { LayoutEvidenceDocument } from "@aio/layout-evidence";
import type { NormalizedPageModel } from "@aio/page-model";
import type { LayoutInferenceVersion } from "./version.js";

export type InferredLayoutMode = "LEAF" | "FLOW_VERTICAL" | "FLOW_HORIZONTAL" | "FLEX_ROW" | "FLEX_COLUMN" | "FLEX_ROW_WRAP" | "FLEX_COLUMN_WRAP" | "GRID" | "FREEFORM" | "UNKNOWN";
export type LayoutReasonCode = "SOURCE_DISPLAY_FLEX" | "SOURCE_FLEX_DIRECTION_ROW" | "SOURCE_FLEX_DIRECTION_COLUMN" | "SOURCE_FLEX_WRAP" | "SOURCE_DISPLAY_GRID" | "SOURCE_BLOCK_LIKE" | "HORIZONTAL_ORDERING_STRONG" | "VERTICAL_ORDERING_STRONG" | "CROSS_AXIS_ALIGNMENT_STRONG" | "GAP_CONSISTENT" | "DECLARED_GAP_MATCHES_GEOMETRY" | "PADDING_MATCHES_GEOMETRY" | "GRID_ROW_GROUPS_DETECTED" | "GRID_COLUMN_GROUPS_DETECTED" | "CHILD_SIZE_SIMILARITY_HIGH" | "POSITIONED_CHILD_RATIO_LOW" | "OVERLAP_HIGH" | "WRAPPING_DETECTED" | "INSUFFICIENT_EVIDENCE";
export type LayoutConflictCode = "FLEX_SOURCE_GEOMETRY_MISMATCH" | "GRID_SOURCE_GEOMETRY_MISMATCH" | "DECLARED_GAP_MISMATCH" | "DECLARED_PADDING_MISMATCH" | "OVERLAP_CONFLICTS_WITH_FLOW" | "POSITIONED_CHILDREN_DOMINANT" | "WRAP_SOURCE_GEOMETRY_MISMATCH" | "MIXED_TEXT_ELEMENT_CONTENT" | "NEGATIVE_GAP_PATTERN" | "INSUFFICIENT_FLOW_CHILDREN" | "UNSTABLE_GEOMETRY_EVIDENCE";
export type LayoutFallbackStrategy = "USE_INFERRED_FLOW" | "PRESERVE_ABSOLUTE_GEOMETRY" | "PRESERVE_SOURCE_ORDER" | "RASTERIZE_UNSUPPORTED_REGION" | "SKIP_CONTAINER" | "MANUAL_REVIEW";
export type InferredPrimaryAlignment = "START" | "CENTER" | "END" | "SPACE_BETWEEN" | "SPACE_AROUND" | "SPACE_EVENLY" | "UNKNOWN";
export type InferredCounterAlignment = "START" | "CENTER" | "END" | "STRETCH" | "BASELINE" | "UNKNOWN";

export interface LayoutReason { code: LayoutReasonCode; message: string; }
export interface LayoutConflict { code: LayoutConflictCode; message: string; penalty: number; }
export interface LayoutCandidate { mode: InferredLayoutMode; score: number; evidenceCodes: LayoutReasonCode[]; penaltyCodes: LayoutConflictCode[]; }
export interface InferredNumericValue { value: number; source: "DECLARED_STYLE" | "OBSERVED_MEDIAN" | "OBSERVED_AVERAGE"; confidence: number; }
export interface InferredPaddingSide { value?: number; source: "DECLARED_STYLE" | "OBSERVED_GEOMETRY" | "UNRESOLVED"; confidence: number; }
export interface InferredPadding { top: InferredPaddingSide; right: InferredPaddingSide; bottom: InferredPaddingSide; left: InferredPaddingSide; }
export interface ExcludedLayoutChild { nodeId: string; reason: "DISPLAY_NONE" | "HIDDEN_ATTRIBUTE" | "ZERO_AREA" | "GEOMETRY_INVALID" | "UNSUPPORTED_ELEMENT"; }

export interface LayoutInferenceEntry {
  nodeId: string;
  parentId?: string | undefined;
  mode: InferredLayoutMode;
  confidence: number;
  source: { display: string; position: string };
  candidates: LayoutCandidate[];
  reasons: LayoutReason[];
  conflicts: LayoutConflict[];
  arrangement: { primaryAxis?: "HORIZONTAL" | "VERTICAL" | undefined; wraps: boolean; rowCount?: number | undefined; columnCount?: number | undefined };
  spacing: { primaryGap?: InferredNumericValue | undefined; crossGap?: InferredNumericValue | undefined; padding?: InferredPadding | undefined };
  alignment: { primary?: InferredPrimaryAlignment; counter?: InferredCounterAlignment };
  children: { flowChildIds: string[]; positionedChildIds: string[]; excludedChildIds: ExcludedLayoutChild[] };
  fallback: LayoutFallbackStrategy;
}

export interface LayoutInferenceMetrics { entryCount: number; leafCount: number; flowVerticalCount: number; flowHorizontalCount: number; flexRowCount: number; flexColumnCount: number; flexWrapCount: number; gridCount: number; freeformCount: number; unknownCount: number; highConfidenceCount: number; mediumConfidenceCount: number; lowConfidenceCount: number; conflictedEntryCount: number; inferenceTimeMs: number; }
export type LayoutInferenceWarningCode = "LOW_CONFIDENCE_LAYOUT" | "AMBIGUOUS_LAYOUT_CANDIDATES" | "SOURCE_GEOMETRY_CONFLICT" | "COMPLEX_GRID_FALLBACK" | "FREEFORM_FALLBACK" | "UNKNOWN_LAYOUT" | "MIXED_CONTENT_LIMITATION";
export interface LayoutInferenceWarning { code: LayoutInferenceWarningCode; count: number; sampleNodeIds: string[]; message: string; }
export interface LayoutInferenceDocument { inferenceVersion: LayoutInferenceVersion; source: { modelVersion: "1.0"; evidenceVersion: "1.0"; requestedUrl: string; finalUrl: string; inferredAt: string }; entries: LayoutInferenceEntry[]; metrics: LayoutInferenceMetrics; warnings: LayoutInferenceWarning[]; }
export type LayoutInferenceInput = { model: NormalizedPageModel; evidence: LayoutEvidenceDocument };
