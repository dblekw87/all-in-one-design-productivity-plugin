import type { Page } from "playwright";
import { parseDomSnapshot } from "@aio/dom-snapshot";
import { parseStyleSnapshot, STYLE_PROPERTY_MAP, validateStyleSnapshotReferences, type StyleSnapshotDocument } from "@aio/style-snapshot";
import type { DomSnapshotDocument } from "@aio/dom-snapshot";
import type { StyleExtractionOptions } from "./style-extraction-options.js";
import { StyleExtractionError } from "./style-errors.js";
import { serializePageFunction } from "../serialize-page-function.js";

export async function extractStyleSnapshot(
  page: Page,
  domSnapshot: DomSnapshotDocument,
  source: { requestedUrl: string; finalUrl: string; capturedAt: string },
  options: StyleExtractionOptions
): Promise<StyleSnapshotDocument> {
  let raw: unknown;
  try {
    const input = {
      source,
      options,
      properties: Object.entries(STYLE_PROPERTY_MAP).map(([key, css]) => ({ key, css }))
    };
    raw = await page.evaluate(`(${serializePageFunction(extractStyleSnapshotInPage)})(${JSON.stringify(input)})`);
  } catch {
    throw new StyleExtractionError("STYLE_EXTRACTION_FAILED", "Computed styles could not be extracted.");
  }
  let snapshot: StyleSnapshotDocument;
  try {
    snapshot = parseStyleSnapshot(raw);
  } catch {
    throw new StyleExtractionError("STYLE_SNAPSHOT_INVALID", "The computed style snapshot is invalid.");
  }
  try {
    validateStyleSnapshotReferences(snapshot, parseDomSnapshot(domSnapshot));
    return snapshot;
  } catch {
    throw new StyleExtractionError("STYLE_SNAPSHOT_MISMATCH", "Computed styles do not match the DOM snapshot.");
  }
}

interface InPageInput {
  source: { requestedUrl: string; finalUrl: string; capturedAt: string };
  options: StyleExtractionOptions;
  properties: Array<{ key: string; css: string }>;
}

function extractStyleSnapshotInPage(input: InPageInput): unknown {
  const excludedTags = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE", "META", "LINK", "BASE", "TITLE"]);
  const entries: Array<Record<string, unknown>> = [];
  const warnings: Array<Record<string, unknown>> = [];
  let nextId = 1;
  let visitedNodes = 0;
  let maxDepthObserved = 0;
  let pseudoBeforeCount = 0;
  let pseudoAfterCount = 0;
  let flexContainerCount = 0;
  let gridContainerCount = 0;
  let hiddenByDisplayCount = 0;
  let hiddenByVisibilityCount = 0;
  let transparentElementCount = 0;
  let entryLimitReached = false;

  function idFor(): string {
    return `dom_${String(nextId++).padStart(6, "0")}`;
  }
  function addWarning(warning: Record<string, unknown>): void {
    if (warnings.length < input.options.maxWarnings) warnings.push(warning);
  }
  function readStyles(style: CSSStyleDeclaration): Record<string, string> {
    const values: Record<string, string> = {};
    for (const property of input.properties) {
      const value = style.getPropertyValue(property.css).trim();
      if (value) values[property.key] = value;
    }
    return values;
  }
  function pseudo(element: Element, pseudoType: "BEFORE" | "AFTER", selector: "::before" | "::after"):
    { pseudoType: "BEFORE" | "AFTER"; content: string; styles: Record<string, string> } | undefined {
    try {
      const style = getComputedStyle(element, selector);
      const content = style.getPropertyValue("content").trim();
      const display = style.getPropertyValue("display").trim();
      if (!content || content === "none" || content === "normal" || display === "none") return undefined;
      return { pseudoType, content, styles: readStyles(style) };
    } catch {
      addWarning({ code: "PSEUDO_STYLE_EXTRACTION_FAILED", message: "A pseudo-element style could not be extracted.", severity: "WARNING" });
      return undefined;
    }
  }

  function visit(node: Node, depth: number): void {
    maxDepthObserved = Math.max(maxDepthObserved, depth);
    if (depth > input.options.maxDepth || entryLimitReached) return;
    if (node.nodeType === Node.TEXT_NODE) {
      visitedNodes += 1;
      idFor();
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const element = node as Element;
    const tagName = element.tagName.toUpperCase();
    if (excludedTags.has(tagName)) return;
    if (visitedNodes >= input.options.maxEntries) {
      entryLimitReached = true;
      addWarning({ code: "STYLE_ENTRY_LIMIT_REACHED", message: "The style snapshot entry limit was reached.", severity: "WARNING" });
      return;
    }
    visitedNodes += 1;
    const snapshotId = idFor();
    const styles = readStyles(getComputedStyle(element));
    if (styles.display === "none") hiddenByDisplayCount += 1;
    if (styles.visibility === "hidden" || styles.visibility === "collapse") hiddenByVisibilityCount += 1;
    if (styles.opacity === "0") transparentElementCount += 1;
    if (styles.display === "flex" || styles.display === "inline-flex") flexContainerCount += 1;
    if (styles.display === "grid" || styles.display === "inline-grid") gridContainerCount += 1;
    const before = input.options.includePseudoElements ? pseudo(element, "BEFORE", "::before") : undefined;
    const after = input.options.includePseudoElements ? pseudo(element, "AFTER", "::after") : undefined;
    if (before) pseudoBeforeCount += 1;
    if (after) pseudoAfterCount += 1;
    entries.push({
      snapshotId,
      styles,
      ...(before || after ? { pseudo: { ...(before ? { before } : {}), ...(after ? { after } : {}) } } : {})
    });
    if (tagName !== "IFRAME" && tagName !== "CANVAS") {
      for (const child of Array.from(element.childNodes)) visit(child, depth + 1);
    }
  }

  const startedAt = Date.now();
  if (!document.body) throw new Error("Document body is missing");
  visit(document.body, 0);
  return {
    styleSnapshotVersion: "1.0",
    source: { domSnapshotVersion: "1.0", ...input.source },
    entries,
    metrics: {
      entryCount: entries.length,
      pseudoBeforeCount,
      pseudoAfterCount,
      flexContainerCount,
      gridContainerCount,
      hiddenByDisplayCount,
      hiddenByVisibilityCount,
      transparentElementCount,
      extractionTimeMs: Math.max(0, Date.now() - startedAt) + maxDepthObserved * 0
    },
    warnings
  };
}
