import type { DomSnapshotDocument, DomSnapshotNode } from "@aio/dom-snapshot";
import type { StyleSnapshotDocument } from "@aio/style-snapshot";
import type { GeometryEvidenceDocument } from "./contract.js";
import { geometryEvidenceDocumentSchema } from "./schema.js";

export function parseGeometryEvidence(value: unknown): GeometryEvidenceDocument {
  const parsed = geometryEvidenceDocumentSchema.parse(value) as GeometryEvidenceDocument;
  validateGeometryEvidence(parsed);
  return parsed;
}

export function validateGeometryEvidenceCrossSnapshot(geometry: GeometryEvidenceDocument, dom: DomSnapshotDocument, style: StyleSnapshotDocument): void {
  validateGeometryEvidence(geometry);
  if (geometry.source.domSnapshotVersion !== dom.snapshotVersion || geometry.source.styleSnapshotVersion !== style.styleSnapshotVersion) throw new Error("Snapshot versions do not match");
  const elementIds = collectElementIds(dom.root, new Set<string>());
  const styleIds = new Set(style.entries.map((entry) => entry.snapshotId));
  const geometryIds = new Set(geometry.entries.map((entry) => entry.snapshotId));
  if (geometry.entries.some((entry) => !elementIds.has(entry.snapshotId))) throw new Error("Geometry references a non-element node");
  if (geometry.entries.some((entry) => !styleIds.has(entry.snapshotId))) throw new Error("Geometry is missing a style entry");
  if (geometryIds.size !== geometry.entries.length) throw new Error("Duplicate geometry entry");
  if (geometryIds.size !== elementIds.size || styleIds.size !== elementIds.size) throw new Error("Snapshot entry sets are not aligned");
}

function validateGeometryEvidence(document: GeometryEvidenceDocument): void {
  const epsilon = 0.01;
  for (const entry of document.entries) {
    const rect = entry.boundingRect;
    if (Math.abs(rect.right - (rect.left + rect.width)) > epsilon || Math.abs(rect.bottom - (rect.top + rect.height)) > epsilon) throw new Error("Bounding rect relationship is invalid");
  }
}

function collectElementIds(node: DomSnapshotNode, ids: Set<string>): Set<string> {
  if (node.nodeType !== "ELEMENT") return ids;
  ids.add(node.snapshotId);
  for (const child of node.children) collectElementIds(child, ids);
  return ids;
}
