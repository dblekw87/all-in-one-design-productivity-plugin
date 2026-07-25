import type { Page } from "playwright";
import { parseDomSnapshot, type DomSnapshotDocument } from "@aio/dom-snapshot";
import type { DomExtractionOptions } from "./dom-extraction-options.js";
import { DomExtractionError } from "./dom-errors.js";
import { serializePageFunction } from "../serialize-page-function.js";

export async function extractDomSnapshot(
  page: Page,
  source: { requestedUrl: string; finalUrl: string; title: string },
  options: DomExtractionOptions
): Promise<DomSnapshotDocument> {
  const extractionStartedAtMs = Date.now();
  let raw: unknown;
  try {
    const input = {
      source,
      options,
      capturedAt: new Date().toISOString()
    };
    raw = await page.evaluate(`(${serializePageFunction(extractDomSnapshotInPage)})(${JSON.stringify(input)})`);
  } catch (error) {
    const message = error instanceof Error ? error.message : typeof error === "object" && error !== null && "message" in error ? String((error as { message?: unknown }).message ?? "") : "";
    console.info(`[parser] DOM_EVALUATE_FAILED ${message.slice(0, 160)}`);
    const cause = message.match(/(?:ReferenceError|TypeError|Error):?\s*[^\n]{1,100}/)?.[0];
    throw new DomExtractionError("DOM_EXTRACTION_FAILED", cause ? `The browser DOM could not be extracted (${cause}).` : "The browser DOM could not be extracted.");
  }

  try {
    const snapshot = parseDomSnapshot(raw);
    snapshot.metrics.extractionTimeMs = Math.max(0, Date.now() - extractionStartedAtMs);
    return snapshot;
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown validation error";
    console.info(`[parser] DOM_SNAPSHOT_PARSE_FAILED ${message.slice(0, 160)}`);
    throw new DomExtractionError("DOM_SNAPSHOT_INVALID", "The extracted DOM snapshot is invalid.");
  }
}

interface InPageInput {
  source: { requestedUrl: string; finalUrl: string; title: string };
  capturedAt: string;
  options: DomExtractionOptions;
}

function extractDomSnapshotInPage(input: InPageInput): unknown {
  const excludedTags = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE", "META", "LINK", "BASE", "TITLE"]);
  const landmarkTags = new Set(["HEADER", "NAV", "MAIN", "SECTION", "ARTICLE", "ASIDE", "FOOTER", "FORM"]);
  const sourceRoot = document.body;
  if (!sourceRoot) throw new Error("Document body is missing");

  let nextId = 1;
  let elementNodeCount = 0;
  let textNodeCount = 0;
  let maxDepthObserved = 0;
  let iframeCount = 0;
  let canvasCount = 0;
  let svgCount = 0;
  let imageCount = 0;
  let hiddenAttributeCount = 0;
  let ariaHiddenCount = 0;
  let truncatedTextNodeCount = 0;
  let skippedNodeCount = 0;
  let nodeLimitReached = false;
  let depthLimitReached = false;
  const warnings: Array<{ code: string; message: string; snapshotId?: string; severity: "INFO" | "WARNING" }> = [];

  function idFor(): string {
    return `dom_${String(nextId++).padStart(6, "0")}`;
  }
  function canAdd(): boolean {
    if (elementNodeCount + textNodeCount >= input.options.maxNodes) {
      if (!nodeLimitReached) warnings.push({ code: "DOM_NODE_LIMIT_REACHED", message: "The DOM snapshot node limit was reached.", severity: "WARNING" });
      nodeLimitReached = true;
      return false;
    }
    return true;
  }

  function hasWarning(code: string): boolean {
    for (const warning of warnings) {
      if (warning.code === code) return true;
    }
    return false;
  }

  function sanitizeAttributeValue(name: string, value: string): string {
    const sensitive = /token|secret|password|passwd|api[_-]?key|authorization|cookie/i.test(name);
    if (sensitive) return "[REDACTED]";
    if (!/^(href|src|srcset|data-[^\s]+)$/i.test(name)) return value;
    try {
      const url = new URL(value, document.baseURI);
      for (const key of Array.from(url.searchParams.keys())) {
        if (/token|secret|password|passwd|api[_-]?key|authorization|signature/i.test(key)) {
          url.searchParams.set(key, "[REDACTED]");
        }
      }
      return url.href;
    } catch {
      return value;
    }
  }

  function readAttributes(element: Element): Record<string, string> {
    const result: Record<string, string> = {};
    for (const attribute of Array.from(element.attributes)) {
      const name = attribute.name.toLowerCase();
      const allowed = name === "id" || name === "class" || name === "role" || name.startsWith("aria-") ||
        name.startsWith("data-") || ["href", "src", "srcset", "alt", "title", "type", "name", "placeholder", "disabled", "checked", "selected", "hidden", "inert", "contenteditable"].includes(name);
      if (!allowed || ["nonce", "integrity", "value"].includes(name)) continue;
      result[name] = sanitizeAttributeValue(name, attribute.value);
    }
    return result;
  }

  function visit(node: Node, parentSnapshotId: string | undefined, depth: number): Record<string, unknown> | null {
    maxDepthObserved = Math.max(maxDepthObserved, depth);
    if (depth > input.options.maxDepth) {
      depthLimitReached = true;
      skippedNodeCount += 1;
      if (!hasWarning("DOM_DEPTH_LIMIT_REACHED")) {
        warnings.push({ code: "DOM_DEPTH_LIMIT_REACHED", message: "The DOM snapshot depth limit was reached.", severity: "WARNING" });
      }
      return null;
    }
    if (node.nodeType === Node.TEXT_NODE) {
      if (!canAdd()) return null;
      const text = node.textContent ?? "";
      const whitespaceOnly = text.trim().length === 0;
      const truncated = text.length > input.options.maxTextNodeLength;
      if (truncated) {
        truncatedTextNodeCount += 1;
        warnings.push({ code: "TEXT_NODE_TRUNCATED", message: "A text node exceeded the configured length limit.", severity: "WARNING" });
      }
      textNodeCount += 1;
      return {
        nodeType: "TEXT",
        snapshotId: idFor(),
        parentSnapshotId,
        text: truncated ? text.slice(0, input.options.maxTextNodeLength) : text,
        flags: { whitespaceOnly }
      };
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return null;
    const element = node as Element;
    const tagName = element.tagName.toUpperCase();
    if (excludedTags.has(tagName)) {
      skippedNodeCount += 1;
      return null;
    }
    if (!canAdd()) return null;
    const snapshotId = idFor();
    elementNodeCount += 1;
    const hiddenAttribute = element.hasAttribute("hidden");
    const ariaHidden = element.getAttribute("aria-hidden") === "true";
    if (hiddenAttribute) hiddenAttributeCount += 1;
    if (ariaHidden) ariaHiddenCount += 1;
    if (tagName === "IFRAME") iframeCount += 1;
    if (tagName === "CANVAS") canvasCount += 1;
    if (tagName === "SVG") svgCount += 1;
    if (tagName === "IMG" || tagName === "PICTURE") imageCount += 1;
    const role = element.getAttribute("role") ?? undefined;
    const semantic = {
      ...(role ? { role } : {}),
      ...(element.getAttribute("aria-label") ? { ariaLabel: element.getAttribute("aria-label")! } : {}),
      ...(element.getAttribute("aria-description") ? { ariaDescription: element.getAttribute("aria-description")! } : {}),
      ...(element.getAttribute("aria-labelledby") ? { ariaLabelledBy: element.getAttribute("aria-labelledby")! } : {}),
      ...(element.getAttribute("aria-describedby") ? { ariaDescribedBy: element.getAttribute("aria-describedby")! } : {}),
      ...(landmarkTags.has(tagName) ? { landmark: tagName.toLowerCase() } : {})
    };
    if (element.shadowRoot && !hasWarning("SHADOW_ROOT_SKIPPED")) {
      warnings.push({ code: "SHADOW_ROOT_SKIPPED", message: "Open shadow root content was not extracted.", severity: "INFO" });
    }
    const children: unknown[] = [];
    if (tagName === "IFRAME") {
      warnings.push({ code: "IFRAME_CONTENT_SKIPPED", message: "Iframe document content was not extracted.", snapshotId, severity: "INFO" });
    } else if (tagName === "CANVAS") {
      warnings.push({ code: "CANVAS_CONTENT_SKIPPED", message: "Canvas drawing content was not extracted.", snapshotId, severity: "INFO" });
    } else {
      for (const child of Array.from(element.childNodes)) {
        const childSnapshot = visit(child, snapshotId, depth + 1);
        if (childSnapshot) children.push(childSnapshot);
      }
    }
    return {
      nodeType: "ELEMENT",
      snapshotId,
      ...(parentSnapshotId ? { parentSnapshotId } : {}),
      tagName: tagName.toLowerCase(),
      ...(element.namespaceURI ? { namespace: element.namespaceURI } : {}),
      attributes: readAttributes(element),
      semantic,
      flags: {
        hiddenAttribute,
        ariaHidden,
        inert: element.hasAttribute("inert"),
        disabled: element.hasAttribute("disabled"),
        contentEditable: element.getAttribute("contenteditable") === "true"
      },
      children
    };
  }

  const root = visit(sourceRoot, undefined, 0);
  if (!root) throw new Error("Document body could not be serialized");
  if (input.options.includePseudoElements) {
    warnings.push({ code: "PSEUDO_ELEMENT_EXTRACTION_DEFERRED", message: "Pseudo-element extraction is deferred to the style snapshot step.", severity: "INFO" });
  }
  return {
    snapshotVersion: "1.0",
    source: { ...input.source, capturedAt: input.capturedAt },
    root,
    metrics: {
      elementNodeCount, textNodeCount, totalNodeCount: elementNodeCount + textNodeCount,
      maxDepthObserved, iframeCount, canvasCount, svgCount, imageCount,
      hiddenAttributeCount, ariaHiddenCount, truncatedTextNodeCount, skippedNodeCount,
      nodeLimitReached, depthLimitReached, extractionTimeMs: 0
    },
    warnings,
    extractionOptions: {
      excludeHidden: input.options.excludeHidden,
      excludeIframes: input.options.excludeIframes,
      excludeCanvas: input.options.excludeCanvas,
      includePseudoElements: input.options.includePseudoElements
    }
  };
}
