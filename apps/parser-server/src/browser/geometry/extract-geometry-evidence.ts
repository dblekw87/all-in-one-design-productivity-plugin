import type { Page } from "playwright";
import type { DomSnapshotDocument, DomSnapshotNode } from "@aio/dom-snapshot";
import type { StyleSnapshotDocument } from "@aio/style-snapshot";
import { parseGeometryEvidence, validateGeometryEvidenceCrossSnapshot, type GeometryEvidenceDocument } from "@aio/geometry-evidence";
import type { GeometryExtractionOptions } from "./geometry-options.js";
import { GeometryExtractionError } from "./geometry-errors.js";
import { serializePageFunction } from "../serialize-page-function.js";

export async function extractGeometryEvidence(page: Page, dom: DomSnapshotDocument, style: StyleSnapshotDocument, source: { requestedUrl: string; finalUrl: string; capturedAt: string }, viewport: { width: number; height: number; deviceScaleFactor: number }, options: GeometryExtractionOptions): Promise<GeometryEvidenceDocument> {
  let raw: unknown;
  try {
    const input = { source, viewport, options };
    raw = await page.evaluate(`(${serializePageFunction(extractGeometryInPage)})(${JSON.stringify(input)})`);
  } catch {
    throw new GeometryExtractionError("GEOMETRY_EXTRACTION_FAILED", "Element geometry could not be extracted.");
  }
  let evidence: GeometryEvidenceDocument;
  try {
    evidence = parseGeometryEvidence(raw);
  } catch {
    throw new GeometryExtractionError("GEOMETRY_EVIDENCE_INVALID", "The geometry evidence is invalid.");
  }
  try {
    validateGeometryEvidenceCrossSnapshot(evidence, dom, style);
    return evidence;
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown validation error";
    console.info(`[parser] GEOMETRY_REFERENCE_VALIDATION_FAILED ${message.slice(0, 160)}`);
    const elementIds = collectElementIds(dom.root, new Set<string>());
    const styleIds = new Set(style.entries.map((entry) => entry.snapshotId));
    const validEntries = evidence.entries.filter((entry) => elementIds.has(entry.snapshotId) && styleIds.has(entry.snapshotId));
    const validEntryIds = new Set(validEntries.map((entry) => entry.snapshotId));
    const missingElementIds = [...elementIds].filter((id) => !validEntryIds.has(id));
    if (validEntries.length > 0 && missingElementIds.length === 0) {
      return {
        ...evidence,
        entries: validEntries,
        metrics: { ...evidence.metrics, entryCount: validEntries.length },
        warnings: [...evidence.warnings, { code: "SNAPSHOT_PIPELINE_UNSTABLE", message: "Extra geometry entries were discarded because the DOM changed during capture.", severity: "WARNING" }]
      };
    }
    throw new GeometryExtractionError("GEOMETRY_SNAPSHOT_MISMATCH", "Geometry does not match the DOM and style snapshots.");
  }
}

function collectElementIds(node: DomSnapshotNode, ids: Set<string>): Set<string> {
  if (node.nodeType !== "ELEMENT") return ids;
  ids.add(node.snapshotId);
  for (const child of node.children) collectElementIds(child, ids);
  return ids;
}

interface InPageInput {
  source: { requestedUrl: string; finalUrl: string; capturedAt: string };
  viewport: { width: number; height: number; deviceScaleFactor: number };
  options: GeometryExtractionOptions;
}

function extractGeometryInPage(input: InPageInput): unknown {
  const excludedTags = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE", "META", "LINK", "BASE", "TITLE"]);
  const entries: Array<Record<string, unknown>> = [];
  const warnings: Array<Record<string, unknown>> = [];
  let nextId = 1;
  let visitedNodes = 0;
  let zeroAreaCount = 0;
  let outsideViewportCount = 0;
  let partiallyVisibleCount = 0;
  let overflowingElementCount = 0;
  let entryLimitReached = false;
  function idFor(): string {
    return `dom_${String(nextId++).padStart(6, "0")}`;
  }
  function finite(value: number): number {
    if (!Number.isFinite(value)) {
      throw new Error("Geometry value is not finite");
    }

    return value;
  }
  function finiteMetric(value: unknown): number {
    if (value === undefined || value === null) return 0;
    if (typeof value !== "number" || !Number.isFinite(value)) {
      throw new Error("Geometry metric is not finite");
    }

    return value;
  }

  function visit(node: Node, depth: number): void {
    if (depth > input.options.maxDepth || entryLimitReached) return;
    if (node.nodeType === Node.TEXT_NODE) {
      visitedNodes += 1;
      idFor();
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const element = node as HTMLElement;
    const tagName = element.tagName.toUpperCase();
    if (excludedTags.has(tagName)) return;
    if (visitedNodes >= input.options.maxEntries) {
      entryLimitReached = true;
      warnings.push({ code: "GEOMETRY_ENTRY_LIMIT_REACHED", message: "The geometry entry limit was reached.", severity: "WARNING" });
      return;
    }
    visitedNodes += 1;
    const generatedSnapshotId = idFor();
    const snapshotId = element.getAttribute("data-aio-snapshot-id") ?? generatedSnapshotId;
    const rect = element.getBoundingClientRect();
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    const width = finite(rect.width);
    const height = finite(rect.height);
    const left = finite(rect.left);
    const top = finite(rect.top);
    const right = finite(rect.right);
    const bottom = finite(rect.bottom);
    const zeroWidth = width === 0;
    const zeroHeight = height === 0;
    const zeroArea = zeroWidth || zeroHeight;
    const intersectsViewport = bottom > 0 && right > 0 && top < input.viewport.height && left < input.viewport.width;
    const fullyInsideViewport = top >= 0 && left >= 0 && bottom <= input.viewport.height && right <= input.viewport.width;
    const overflowsOwnBox = element.scrollWidth > element.clientWidth || element.scrollHeight > element.clientHeight;
    if (zeroArea) zeroAreaCount += 1;
    if (!intersectsViewport) outsideViewportCount += 1;
    if (intersectsViewport && !fullyInsideViewport) partiallyVisibleCount += 1;
    if (overflowsOwnBox) overflowingElementCount += 1;
    entries.push({
      snapshotId,
      boundingRect: { x: left, y: top, top, right, bottom, left, width, height },
      documentRect: { x: left + scrollX, y: top + scrollY, width, height },
      boxMetrics: {
        clientWidth: finiteMetric(element.clientWidth), clientHeight: finiteMetric(element.clientHeight),
        offsetWidth: finiteMetric(element.offsetWidth), offsetHeight: finiteMetric(element.offsetHeight),
        scrollWidth: finiteMetric(element.scrollWidth), scrollHeight: finiteMetric(element.scrollHeight)
      },
      flags: { zeroWidth, zeroHeight, zeroArea, intersectsViewport, fullyInsideViewport, overflowsOwnBox }
    });
    if (tagName !== "IFRAME" && tagName !== "CANVAS") for (const child of Array.from(element.childNodes)) visit(child, depth + 1);
  }

  const startedAt = Date.now();
  if (!document.body) throw new Error("Document body is missing");
  visit(document.body, 0);
  return {
    geometryVersion: "1.0",
    source: { domSnapshotVersion: "1.0", styleSnapshotVersion: "1.0", ...input.source },
    viewport: { ...input.viewport, scrollX: window.scrollX, scrollY: window.scrollY },
    document: { scrollWidth: document.documentElement.scrollWidth, scrollHeight: document.documentElement.scrollHeight, clientWidth: document.documentElement.clientWidth, clientHeight: document.documentElement.clientHeight },
    entries,
    metrics: { entryCount: entries.length, zeroAreaCount, outsideViewportCount, partiallyVisibleCount, overflowingElementCount, extractionTimeMs: Math.max(0, Date.now() - startedAt) },
    warnings
  };
}
