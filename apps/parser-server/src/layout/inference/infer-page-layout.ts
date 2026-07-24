import type { LayoutEvidenceDocument, LayoutEvidenceEntry } from "@aio/layout-evidence";
import { parseLayoutInference, validateLayoutInferenceSemantics, type InferredCounterAlignment, type InferredLayoutMode, type InferredPrimaryAlignment, type LayoutCandidate, type LayoutConflict, type LayoutInferenceDocument, type LayoutInferenceEntry, type LayoutReason, type InferredPadding, type InferredPaddingSide, type InferredNumericValue } from "@aio/layout-inference";
import type { NormalizedElementNode, NormalizedPageModel, NormalizedLength, ParsedCssValue } from "@aio/page-model";
import { DEFAULT_LAYOUT_INFERENCE_THRESHOLDS, type LayoutInferenceThresholds } from "@aio/layout-inference";

const clamp = (value: number) => Math.max(0, Math.min(1, value));
const finite = (value: number | undefined): value is number => value !== undefined && Number.isFinite(value);
const px = (value: ParsedCssValue<NormalizedLength> | undefined) => { const parsed = value?.value; return value?.parsed && parsed?.type === "PX" && "value" in parsed && finite(parsed.value) ? parsed.value : undefined; };
const message = (code: string) => code.toLowerCase().replaceAll("_", " ");

function nodesById(root: NormalizedElementNode) { const map = new Map<string, NormalizedElementNode>(); const visit = (node: NormalizedElementNode) => { map.set(node.id, node); for (const child of node.children) if (child.nodeType === "ELEMENT") visit(child); }; visit(root); return map; }
function gapValue(entry: LayoutEvidenceEntry, axis: "horizontal" | "vertical", node: NormalizedElementNode): InferredNumericValue | undefined {
  const declared = axis === "horizontal" ? px(node.style.flex.columnGap) ?? px(node.style.grid.columnGap) : px(node.style.flex.rowGap) ?? px(node.style.grid.rowGap);
  const evidence = axis === "horizontal" ? entry.spacing.horizontalGap : entry.spacing.verticalGap;
  const observed = evidence.median ?? evidence.average;
  if (declared !== undefined) return { value: declared, source: "DECLARED_STYLE", confidence: observed === undefined || Math.abs(declared - observed) <= 4 ? 0.95 : 0.55 };
  if (evidence.median !== undefined) return { value: evidence.median, source: "OBSERVED_MEDIAN", confidence: 0.7 };
  if (evidence.average !== undefined) return { value: evidence.average, source: "OBSERVED_AVERAGE", confidence: 0.55 };
  return undefined;
}
function padding(entry: LayoutEvidenceEntry, node: NormalizedElementNode, thresholds: LayoutInferenceThresholds): InferredPadding {
  const side = (declared: number | undefined, observed: number | undefined): InferredPaddingSide => {
    if (declared !== undefined) return { value: declared, source: "DECLARED_STYLE", confidence: observed === undefined || Math.abs(declared - observed) <= thresholds.paddingTolerancePx ? 0.95 : 0.55 };
    if (observed !== undefined && observed >= 0) return { value: observed, source: "OBSERVED_GEOMETRY", confidence: 0.45 };
    return { source: "UNRESOLVED", confidence: 0 };
  };
  return { top: side(entry.spacing.parentPadding.declared.top, entry.spacing.parentPadding.observed.top), right: side(entry.spacing.parentPadding.declared.right, entry.spacing.parentPadding.observed.right), bottom: side(entry.spacing.parentPadding.declared.bottom, entry.spacing.parentPadding.observed.bottom), left: side(entry.spacing.parentPadding.declared.left, entry.spacing.parentPadding.observed.left) };
}
function alignment(entry: LayoutEvidenceEntry, node: NormalizedElementNode, primary: "HORIZONTAL" | "VERTICAL"): { primary: InferredPrimaryAlignment; counter: InferredCounterAlignment } {
  const style = primary === "HORIZONTAL" ? node.style.flex.justifyContent : undefined;
  const counterStyle = primary === "HORIZONTAL" ? node.style.flex.alignItems : undefined;
  const primaryValue = style?.toUpperCase();
  const counterValue = counterStyle?.toUpperCase();
  const primaryMap: Record<string, InferredPrimaryAlignment> = { FLEX_START: "START", START: "START", FLEX_END: "END", END: "END", CENTER: "CENTER", SPACE_BETWEEN: "SPACE_BETWEEN", SPACE_AROUND: "SPACE_AROUND", SPACE_EVENLY: "SPACE_EVENLY" };
  const counterMap: Record<string, InferredCounterAlignment> = { FLEX_START: "START", START: "START", FLEX_END: "END", END: "END", CENTER: "CENTER", STRETCH: "STRETCH", BASELINE: "BASELINE" };
  if (primaryValue && primaryMap[primaryValue]) return { primary: primaryMap[primaryValue], counter: counterValue && counterMap[counterValue] ? counterMap[counterValue] : "UNKNOWN" };
  const axis = primary === "HORIZONTAL" ? entry.axes.horizontal : entry.axes.vertical;
  const cross = primary === "HORIZONTAL" ? entry.axes.vertical : entry.axes.horizontal;
  return { primary: axis.averageGap !== undefined && axis.averageGap > 0 ? "START" : "UNKNOWN", counter: cross.alignmentRatio >= 0.8 ? "CENTER" : "UNKNOWN" };
}
function conflict(code: LayoutConflict["code"], penalty: number): LayoutConflict { return { code, penalty, message: message(code) }; }
function reason(code: LayoutReason["code"]): LayoutReason { return { code, message: message(code) }; }
function candidate(mode: InferredLayoutMode, score: number, reasons: LayoutReason["code"][], conflicts: LayoutConflict[] = []): LayoutCandidate { return { mode, score: clamp(score), evidenceCodes: reasons, penaltyCodes: conflicts.map((item) => item.code) }; }
function sourceAndGeometry(node: NormalizedElementNode, entry: LayoutEvidenceEntry, thresholds: LayoutInferenceThresholds) {
  const elements = node.children.filter((child): child is NormalizedElementNode => child.nodeType === "ELEMENT");
  const flow = elements.filter((child) => child.style.position.value !== "ABSOLUTE" && child.style.position.value !== "FIXED");
  const flex = node.style.flex.isFlexContainer;
  const grid = node.style.grid.isGridContainer;
  const direction = (node.style.flex.direction ?? "row").toLowerCase();
  const wrap = (node.style.flex.wrap ?? "nowrap").toLowerCase();
  const horizontal = entry.axes.horizontal;
  const vertical = entry.axes.vertical;
  const row = direction.startsWith("row");
  const flowCandidate: LayoutCandidate[] = [];
  const flexReasons: LayoutReason["code"][] = flex ? ["SOURCE_DISPLAY_FLEX"] : [];
  const flexConflicts: LayoutConflict[] = [];
  if (flex && row) flexReasons.push("SOURCE_FLEX_DIRECTION_ROW");
  if (flex && !row) flexReasons.push("SOURCE_FLEX_DIRECTION_COLUMN");
  if (flex && wrap !== "nowrap") flexReasons.push("SOURCE_FLEX_WRAP");
  if (flex && flow.length < thresholds.minimumChildrenForFlowInference) flexConflicts.push(conflict("INSUFFICIENT_FLOW_CHILDREN", 0.15));
  if (flex && row && horizontal.overlapRatio < thresholds.moderateAxisAlignmentRatio) flexConflicts.push(conflict("FLEX_SOURCE_GEOMETRY_MISMATCH", thresholds.sourceGeometryConflictPenalty));
  if (flex && !row && vertical.overlapRatio < thresholds.moderateAxisAlignmentRatio) flexConflicts.push(conflict("FLEX_SOURCE_GEOMETRY_MISMATCH", thresholds.sourceGeometryConflictPenalty));
  const flexScore = flex ? 0.72 + (row ? horizontal.alignmentRatio : vertical.alignmentRatio) * 0.18 - flexConflicts.reduce((sum, item) => sum + item.penalty, 0) : 0;
  if (flex) flowCandidate.push(candidate(wrap !== "nowrap" && (row ? entry.wrapping.rowGroups.length > 1 : entry.wrapping.columnGroups.length > 1) ? row ? "FLEX_ROW_WRAP" : "FLEX_COLUMN_WRAP" : row ? "FLEX_ROW" : "FLEX_COLUMN", flexScore, flexReasons, flexConflicts));
  if (grid) {
    const gridReasons: LayoutReason["code"][] = ["SOURCE_DISPLAY_GRID"];
    if (entry.wrapping.rowGroups.length > 1) gridReasons.push("GRID_ROW_GROUPS_DETECTED");
    if (entry.wrapping.columnGroups.length > 1) gridReasons.push("GRID_COLUMN_GROUPS_DETECTED");
    if (entry.sizing.widthCoefficientOfVariation !== undefined && entry.sizing.widthCoefficientOfVariation < 0.2) gridReasons.push("CHILD_SIZE_SIMILARITY_HIGH");
    const gridConflicts = entry.overlap.overlapRatio > thresholds.moderateOverlapRatio ? [conflict("GRID_SOURCE_GEOMETRY_MISMATCH", thresholds.sourceGeometryConflictPenalty)] : [];
    flowCandidate.push(candidate("GRID", 0.76 + (entry.wrapping.rowGroups.length > 1 ? 0.08 : 0) + (entry.wrapping.columnGroups.length > 1 ? 0.08 : 0) - gridConflicts.reduce((sum, item) => sum + item.penalty, 0), gridReasons, gridConflicts));
  }
  const block = node.style.display.value === "BLOCK" || node.style.display.value === "INLINE_BLOCK";
  if (block) flowCandidate.push(candidate("FLOW_VERTICAL", 0.48 + (vertical.ordered ? 0.18 : 0) + (vertical.alignmentRatio > thresholds.moderateAxisAlignmentRatio ? 0.12 : 0) - (entry.overlap.overlapRatio > thresholds.moderateOverlapRatio ? 0.12 : 0), ["SOURCE_BLOCK_LIKE", ...(vertical.ordered ? ["VERTICAL_ORDERING_STRONG" as const] : [])]));
  if (!flex && !grid && flow.length >= thresholds.minimumChildrenForFlowInference && horizontal.ordered && horizontal.alignmentRatio >= thresholds.moderateAxisAlignmentRatio) flowCandidate.push(candidate("FLOW_HORIZONTAL", Math.min(thresholds.maxGeometryFlowConfidence, 0.45 + horizontal.alignmentRatio * 0.35), ["HORIZONTAL_ORDERING_STRONG", "CROSS_AXIS_ALIGNMENT_STRONG"]));
  if (flow.length >= thresholds.minimumChildrenForFlowInference && vertical.ordered && vertical.alignmentRatio >= thresholds.moderateAxisAlignmentRatio) flowCandidate.push(candidate("FLOW_VERTICAL", 0.42 + vertical.alignmentRatio * 0.3, ["VERTICAL_ORDERING_STRONG"]));
  const positionedRatio = elements.length ? entry.children.positionedElementIds.length / elements.length : 0;
  if (entry.overlap.overlapRatio >= thresholds.highOverlapRatio || positionedRatio > 0.5 || entry.spacing.horizontalGap.values.some((value) => value < 0) || entry.spacing.verticalGap.values.some((value) => value < 0)) flowCandidate.push(candidate("FREEFORM", 0.65 + Math.min(0.25, positionedRatio * 0.25 + entry.overlap.overlapRatio * 0.25), ["OVERLAP_HIGH"], positionedRatio > 0.5 ? [conflict("POSITIONED_CHILDREN_DOMINANT", thresholds.positionedChildRatioPenalty)] : []));
  return { elements, flow, candidates: flowCandidate, positionedRatio, row };
}
function inferEntry(node: NormalizedElementNode, evidence: LayoutEvidenceEntry | undefined, thresholds: LayoutInferenceThresholds): LayoutInferenceEntry {
  const elements = node.children.filter((child): child is NormalizedElementNode => child.nodeType === "ELEMENT");
  const excluded = elements.filter((child) => child.style.display.value === "NONE" || child.state.hiddenAttribute || child.geometry.zeroSize.area).map((child) => ({ nodeId: child.id, reason: child.style.display.value === "NONE" ? "DISPLAY_NONE" as const : child.state.hiddenAttribute ? "HIDDEN_ATTRIBUTE" as const : "ZERO_AREA" as const }));
  const active = elements.filter((child) => !excluded.some((item) => item.nodeId === child.id));
  const flow = active.filter((child) => child.style.position.value !== "ABSOLUTE" && child.style.position.value !== "FIXED");
  const positioned = active.filter((child) => child.style.position.value === "ABSOLUTE" || child.style.position.value === "FIXED");
  const reasons: LayoutReason[] = []; const conflicts: LayoutConflict[] = [];
  if (!evidence || flow.length === 0) return { nodeId: node.id, parentId: node.parentId, mode: "LEAF", confidence: 0.98, source: { display: node.style.display.raw, position: node.style.position.raw }, candidates: [candidate("LEAF", 0.98, [])], reasons, conflicts, arrangement: { wraps: false }, spacing: { padding: undefined }, alignment: {}, children: { flowChildIds: [], positionedChildIds: positioned.map((child) => child.id), excludedChildIds: excluded }, fallback: "PRESERVE_SOURCE_ORDER" };
  const analysis = sourceAndGeometry(node, evidence, thresholds); const candidates = analysis.candidates.sort((a, b) => b.score - a.score).slice(0, 3);
  if (!candidates.length) candidates.push(candidate("UNKNOWN", 0.15, ["INSUFFICIENT_EVIDENCE"]));
  const winner = candidates[0]!; const second = candidates[1]; const ambiguous = second !== undefined && winner.score - second.score < thresholds.candidateAmbiguityDelta;
  const mode = winner.score < thresholds.minimumCandidateScore ? "UNKNOWN" : ambiguous ? "UNKNOWN" : winner.mode;
  const confidence = clamp(ambiguous ? Math.min(winner.score, 0.55) : winner.score);
  reasons.push(...winner.evidenceCodes.map(reason)); conflicts.push(...winner.penaltyCodes.map((code) => conflict(code, thresholds.sourceGeometryConflictPenalty)));
  if (positioned.length && positioned.length / elements.length > 0.5) conflicts.push(conflict("POSITIONED_CHILDREN_DOMINANT", thresholds.positionedChildRatioPenalty));
  if (node.children.some((child) => child.nodeType === "TEXT") && elements.length) conflicts.push(conflict("MIXED_TEXT_ELEMENT_CONTENT", 0.08));
  const primaryAxis = mode.includes("ROW") || mode === "FLOW_HORIZONTAL" ? "HORIZONTAL" : mode.includes("COLUMN") || mode === "FLOW_VERTICAL" ? "VERTICAL" : undefined;
  const primaryGap = primaryAxis === "HORIZONTAL" ? gapValue(evidence, "horizontal", node) : primaryAxis === "VERTICAL" ? gapValue(evidence, "vertical", node) : undefined;
  const crossGap = primaryAxis === "HORIZONTAL" ? gapValue(evidence, "vertical", node) : primaryAxis === "VERTICAL" ? gapValue(evidence, "horizontal", node) : undefined;
  const inferredAlignment = primaryAxis ? alignment(evidence, node, primaryAxis) : {};
  return { nodeId: node.id, parentId: node.parentId, mode, confidence, source: { display: node.style.display.raw, position: node.style.position.raw }, candidates, reasons, conflicts, arrangement: { primaryAxis, wraps: mode === "FLEX_ROW_WRAP" || mode === "FLEX_COLUMN_WRAP", rowCount: evidence.wrapping.rowGroups.length, columnCount: evidence.wrapping.columnGroups.length }, spacing: { primaryGap, crossGap, padding: padding(evidence, node, thresholds) }, alignment: inferredAlignment, children: { flowChildIds: flow.map((child) => child.id), positionedChildIds: positioned.map((child) => child.id), excludedChildIds: excluded }, fallback: mode === "FREEFORM" || mode === "UNKNOWN" || mode === "GRID" ? "PRESERVE_ABSOLUTE_GEOMETRY" : "USE_INFERRED_FLOW" };
}

export function inferPageLayout(model: NormalizedPageModel, evidence: LayoutEvidenceDocument, thresholds: LayoutInferenceThresholds = DEFAULT_LAYOUT_INFERENCE_THRESHOLDS): LayoutInferenceDocument {
  const startedAt = Date.now(); const map = new Map(evidence.entries.map((entry) => [entry.nodeId, entry])); const entries: LayoutInferenceEntry[] = []; const warnings = new Map<string, { count: number; sampleNodeIds: string[]; message: string }>();
  const nodes = nodesById(model.root); for (const node of nodes.values()) { const entry = inferEntry(node, map.get(node.id), thresholds); entries.push(entry); const code = entry.mode === "UNKNOWN" ? "UNKNOWN_LAYOUT" : entry.mode === "FREEFORM" ? "FREEFORM_FALLBACK" : entry.confidence < thresholds.mediumConfidence ? "LOW_CONFIDENCE_LAYOUT" : entry.candidates[1] && entry.candidates[0]!.score - entry.candidates[1].score < thresholds.candidateAmbiguityDelta ? "AMBIGUOUS_LAYOUT_CANDIDATES" : undefined; if (code) { const item = warnings.get(code) ?? { count: 0, sampleNodeIds: [], message: message(code) }; item.count += 1; if (item.sampleNodeIds.length < 5) item.sampleNodeIds.push(node.id); warnings.set(code, item); } }
  const counts = (mode: InferredLayoutMode) => entries.filter((entry) => entry.mode === mode).length; const high = entries.filter((entry) => entry.confidence >= thresholds.highConfidence).length; const medium = entries.filter((entry) => entry.confidence >= thresholds.mediumConfidence && entry.confidence < thresholds.highConfidence).length;
  const result = parseLayoutInference({ inferenceVersion: "1.0", source: { modelVersion: model.modelVersion, evidenceVersion: evidence.evidenceVersion, requestedUrl: model.source.requestedUrl, finalUrl: model.source.finalUrl, inferredAt: new Date().toISOString() }, entries, metrics: { entryCount: entries.length, leafCount: counts("LEAF"), flowVerticalCount: counts("FLOW_VERTICAL"), flowHorizontalCount: counts("FLOW_HORIZONTAL"), flexRowCount: counts("FLEX_ROW"), flexColumnCount: counts("FLEX_COLUMN"), flexWrapCount: entries.filter((entry) => entry.mode === "FLEX_ROW_WRAP" || entry.mode === "FLEX_COLUMN_WRAP").length, gridCount: counts("GRID"), freeformCount: counts("FREEFORM"), unknownCount: counts("UNKNOWN"), highConfidenceCount: high, mediumConfidenceCount: medium, lowConfidenceCount: entries.length - high - medium, conflictedEntryCount: entries.filter((entry) => entry.conflicts.length > 0).length, inferenceTimeMs: Math.max(0, Date.now() - startedAt) }, warnings: [...warnings.entries()].map(([code, value]) => ({ code, ...value })) }); validateLayoutInferenceSemantics(result, model); return result;
}
