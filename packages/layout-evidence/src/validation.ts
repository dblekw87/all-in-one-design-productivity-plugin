import type { NormalizedPageModel } from "@aio/page-model";
import type { LayoutEvidenceDocument } from "./contract.js";
import { layoutEvidenceDocumentSchema } from "./schema.js";
export function parseLayoutEvidence(value: unknown): LayoutEvidenceDocument { const result = layoutEvidenceDocumentSchema.parse(value) as unknown as LayoutEvidenceDocument; validateLayoutEvidence(result); return result; }
export function validateLayoutEvidence(evidence: LayoutEvidenceDocument, model?: NormalizedPageModel): void {
  const ids = new Set(evidence.entries.map((entry) => entry.nodeId));
  if (ids.size !== evidence.entries.length) throw new Error("Duplicate layout evidence entry");
  if (evidence.metrics.entryCount !== evidence.entries.length) throw new Error("Layout evidence metrics mismatch");
  if (model) { const modelIds = new Set<string>(); const visit = (node: NormalizedPageModel["root"]) => { modelIds.add(node.id); if (node.nodeType === "ELEMENT") node.children.filter((child) => child.nodeType === "ELEMENT").forEach((child) => visit(child)); }; visit(model.root); for (const id of ids) if (!modelIds.has(id)) throw new Error("Layout evidence references an unknown node"); }
}
