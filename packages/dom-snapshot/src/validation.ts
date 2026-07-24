import type { DomSnapshotDocument, DomSnapshotNode } from "./contract.js";
import { domSnapshotDocumentSchema } from "./schema.js";

export function parseDomSnapshot(value: unknown): DomSnapshotDocument {
  const parsed = domSnapshotDocumentSchema.parse(value) as unknown as DomSnapshotDocument;
  validateTree(parsed.root);
  return parsed;
}

export function safeParseDomSnapshot(value: unknown) {
  const parsed = domSnapshotDocumentSchema.safeParse(value);
  if (!parsed.success) return parsed;
  try {
    validateTree((parsed.data as { root: DomSnapshotNode }).root);
    return { success: true as const, data: parsed.data as unknown as DomSnapshotDocument };
  } catch (error) {
    return {
      success: false as const,
      error: new Error(error instanceof Error ? error.message : "Invalid DOM snapshot tree")
    };
  }
}

function validateTree(root: DomSnapshotNode): void {
  const ids = new Set<string>();
  visit(root, undefined, ids);
}

function visit(node: DomSnapshotNode, parentId: string | undefined, ids: Set<string>): void {
  if (ids.has(node.snapshotId)) throw new Error(`Duplicate snapshot id: ${node.snapshotId}`);
  ids.add(node.snapshotId);
  if (node.parentSnapshotId !== parentId) throw new Error(`Invalid parent reference for ${node.snapshotId}`);
  if (node.nodeType === "ELEMENT") {
    for (const child of node.children) visit(child, node.snapshotId, ids);
  }
}
