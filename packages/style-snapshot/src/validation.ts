import type { DomSnapshotDocument, DomSnapshotNode } from "@aio/dom-snapshot";
import type { StyleSnapshotDocument } from "./contract.js";
import { styleSnapshotDocumentSchema } from "./schema.js";

export function parseStyleSnapshot(value: unknown): StyleSnapshotDocument {
  const parsed = styleSnapshotDocumentSchema.parse(value) as StyleSnapshotDocument;
  validateStyleSnapshot(parsed, undefined);
  return parsed;
}

export function validateStyleSnapshot(style: StyleSnapshotDocument, dom: DomSnapshotDocument | undefined): void {
  const ids = new Set<string>();
  const elementIds = dom ? collectElementIds(dom.root, new Set<string>()) : undefined;
  for (const entry of style.entries) {
    if (ids.has(entry.snapshotId)) throw new Error(`Duplicate style entry: ${entry.snapshotId}`);
    ids.add(entry.snapshotId);
    if (elementIds && !elementIds.has(entry.snapshotId)) throw new Error(`Style entry does not reference a DOM element: ${entry.snapshotId}`);
  }
  if (dom && style.source.domSnapshotVersion !== dom.snapshotVersion) {
    throw new Error("DOM and style snapshot versions do not match");
  }
}

export function validateStyleSnapshotReferences(style: StyleSnapshotDocument, dom: DomSnapshotDocument): void {
  validateStyleSnapshot(style, dom);
  const elementIds = collectElementIds(dom.root, new Set<string>());
  if (style.entries.some((entry) => !elementIds.has(entry.snapshotId))) {
    throw new Error("Style snapshot references a non-element node");
  }
}

function collectElementIds(node: DomSnapshotNode, ids: Set<string>): Set<string> {
  if (node.nodeType !== "ELEMENT") return ids;
  ids.add(node.snapshotId);
  for (const child of node.children) collectElementIds(child, ids);
  return ids;
}
