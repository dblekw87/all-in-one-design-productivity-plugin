import type { NormalizedNode, NormalizedPageModel } from "./contract.js";
import { normalizedPageModelSchema } from "./schema.js";

export function parseNormalizedPageModel(value: unknown): NormalizedPageModel { const model = normalizedPageModelSchema.parse(value) as NormalizedPageModel; validateNormalizedPageModel(model); return model; }
export function validateNormalizedPageModel(model: NormalizedPageModel): void {
  const ids = new Set<string>();
  const visit = (node: NormalizedNode, parentId: string | undefined) => {
    if (ids.has(node.id)) throw new Error("Duplicate normalized node id");
    if (node.parentId !== parentId) throw new Error("Invalid normalized parent reference");
    ids.add(node.id);
    if (node.nodeType === "ELEMENT") node.children.forEach((child) => visit(child, node.id));
  };
  if (model.root.parentId !== undefined) throw new Error("Normalized root cannot have a parent");
  visit(model.root, undefined);
  if (model.metrics.totalNodeCount !== ids.size) throw new Error("Normalized node metrics do not match");
}
