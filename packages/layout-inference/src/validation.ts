import type { NormalizedElementNode, NormalizedPageModel } from "@aio/page-model";
import type { LayoutInferenceDocument } from "./contract.js";
import { layoutInferenceSchema } from "./schema.js";

function elements(node: NormalizedElementNode, result = new Map<string, NormalizedElementNode>()) { result.set(node.id, node); for (const child of node.children) if (child.nodeType === "ELEMENT") elements(child, result); return result; }
export function parseLayoutInference(value: unknown): LayoutInferenceDocument { return layoutInferenceSchema.parse(value) as LayoutInferenceDocument; }
export function validateLayoutInferenceSemantics(document: LayoutInferenceDocument, model: NormalizedPageModel): void {
  const nodes = elements(model.root); const ids = new Set<string>();
  for (const entry of document.entries) {
    if (ids.has(entry.nodeId)) throw new Error("LAYOUT_INFERENCE_SEMANTIC_INVALID"); ids.add(entry.nodeId);
    if (!nodes.has(entry.nodeId)) throw new Error("LAYOUT_INFERENCE_SOURCE_MISMATCH");
    const childIds = new Set(nodes.get(entry.nodeId)!.children.filter((child) => child.nodeType === "ELEMENT").map((child) => child.id));
    const assigned = [...entry.children.flowChildIds, ...entry.children.positionedChildIds, ...entry.children.excludedChildIds.map((child) => child.nodeId)];
    if (new Set(assigned).size !== assigned.length || assigned.some((id) => !childIds.has(id))) throw new Error("LAYOUT_INFERENCE_SEMANTIC_INVALID");
    if ((entry.mode === "FLEX_ROW" || entry.mode === "FLOW_HORIZONTAL") && entry.arrangement.primaryAxis !== "HORIZONTAL") throw new Error("LAYOUT_INFERENCE_SEMANTIC_INVALID");
    if ((entry.mode === "FLEX_COLUMN" || entry.mode === "FLOW_VERTICAL") && entry.arrangement.primaryAxis !== "VERTICAL") throw new Error("LAYOUT_INFERENCE_SEMANTIC_INVALID");
    if ((entry.mode === "FLEX_ROW_WRAP" || entry.mode === "FLEX_COLUMN_WRAP") && !entry.arrangement.wraps) throw new Error("LAYOUT_INFERENCE_SEMANTIC_INVALID");
    if (entry.mode === "GRID" && entry.arrangement.rowCount === undefined && entry.arrangement.columnCount === undefined) throw new Error("LAYOUT_INFERENCE_SEMANTIC_INVALID");
    if (entry.mode === "FREEFORM" && entry.fallback === "USE_INFERRED_FLOW") throw new Error("LAYOUT_INFERENCE_SEMANTIC_INVALID");
  }
  if (document.metrics.entryCount !== document.entries.length) throw new Error("LAYOUT_INFERENCE_SEMANTIC_INVALID");
}
