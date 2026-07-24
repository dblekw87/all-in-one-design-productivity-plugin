import { designIrSchema } from "./schema.js";
import type { DesignIrDocument, DesignIrNode } from "./contract.js";

export function parseDesignIr(value: unknown): DesignIrDocument { return designIrSchema.parse(value) as DesignIrDocument; }
export function safeParseDesignIr(value: unknown) { return designIrSchema.safeParse(value); }
export const parseDesignDocument = parseDesignIr;
export const safeParseDesignDocument = safeParseDesignIr;

export function validateDesignIrSemantics(document: DesignIrDocument): void {
  const ids = new Set<string>();
  const bindingIds = new Set(document.assetBindings.map((binding) => binding.bindingId));
  const visit = (node: DesignIrNode, expectedParent?: string): void => {
    if (expectedParent && !node.parentId) node.parentId = expectedParent;
    if (ids.has(node.id)) throw new Error("DESIGN_IR_SEMANTIC_INVALID: duplicate id");
    if ((node.parentId ?? undefined) !== expectedParent) throw new Error(`DESIGN_IR_SEMANTIC_INVALID: parent mismatch for ${node.id} actual=${node.parentId ?? "none"} expected=${expectedParent ?? "none"}`);
    ids.add(node.id);
    if ((node.nodeType === "DOCUMENT" || node.nodeType === "FRAME" || node.nodeType === "UNSUPPORTED") && "children" in node) for (const child of node.children ?? []) visit(child, node.id);
    if ((node.nodeType === "TEXT" || node.nodeType === "IMAGE" || node.nodeType === "VECTOR") && "children" in node) throw new Error("DESIGN_IR_SEMANTIC_INVALID: leaf children");
    if ((node.nodeType === "IMAGE" || node.nodeType === "VECTOR") && node.assetBindingId && !bindingIds.has(node.assetBindingId)) throw new Error("DESIGN_IR_ASSET_BINDING_INVALID");
  };
  if (document.root.nodeType !== "DOCUMENT" || document.root.parentId !== undefined) throw new Error("DESIGN_IR_SEMANTIC_INVALID: invalid root");
  visit(document.root);
  if (ids.size !== document.metrics.totalNodeCount) throw new Error("DESIGN_IR_SEMANTIC_INVALID: metrics mismatch");
}
