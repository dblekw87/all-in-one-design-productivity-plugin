import type { CaptureSnapshot, CaptureSnapshotWarning } from "@aio/shared-contracts";
import type { BrowserPageMetadata } from "../../contracts/messages.js";
import { collectPageMetadata } from "../../content/page-metadata.js";
import type { BrowserCaptureRequest } from "../contracts/browser-capture-request.js";
import type { BrowserCaptureMetrics, BrowserCaptureResult, BrowserCaptureSummary } from "../contracts/browser-capture-result.js";
import { browserCaptureError } from "../contracts/browser-capture-errors.js";
import { createCaptureContext } from "./capture-context.js";
import { normalizeCaptureOptions } from "./capture-limits.js";
import { browserCaptureCancellation } from "./capture-cancellation.js";
import { captureDomTree } from "../dom/capture-dom-tree.js";
import { captureComputedStyles } from "../style/capture-computed-style.js";
import { captureGeometry } from "../geometry/capture-geometry.js";
import { capturePseudoElements } from "../pseudo/capture-pseudo-element.js";
import { captureInlineSvg } from "../svg/capture-inline-svg.js";
import { captureAssetReferences } from "../assets/capture-asset-reference.js";
import { validateBrowserCaptureSnapshot } from "../validation/validate-browser-capture.js";
import { validateCapturedDomSemantics } from "../validation/validate-capture-semantics.js";

const CAPTURE_SNAPSHOT_VERSION = "1.0";

export async function runBrowserCapture(request: BrowserCaptureRequest, doc: Document = document, view: Window = window): Promise<BrowserCaptureResult> {
  const options = normalizeCaptureOptions(request.options);
  const normalizedRequest: BrowserCaptureRequest = { ...request, options };
  const metadata = collectPageMetadata(doc, view);
  const context = createCaptureContext(normalizedRequest, metadata, () => browserCaptureCancellation.isCancelled(request.sessionId));
  context.addProgress("PREPARING_CAPTURE");
  if (context.isCancelled()) return cancelledResult(context.startedAt, metadata);

  try {
    await waitForStableDom(doc, options.waitForStableDomMs, () => context.isCancelled());
    if (context.isCancelled()) return cancelledResult(context.startedAt, metadata);

    context.addProgress("CAPTURING_DOM");
    const domOutput = await captureDomTree(doc, context);
    if (context.isCancelled()) return cancelledResult(context.startedAt, metadata);

    context.addProgress("CAPTURING_STYLES");
    const styles = captureComputedStyles(domOutput.elementsByCaptureNodeId);
    context.addProgress("CAPTURING_GEOMETRY");
    const geometry = captureGeometry(domOutput.elementsByCaptureNodeId);
    context.addProgress("CAPTURING_PSEUDO");
    const pseudo = options.includePseudo ? capturePseudoElements(domOutput.elementsByCaptureNodeId) : { entries: [] };
    context.addProgress("CAPTURING_SVG");
    const svg = options.includeInlineSvg ? captureInlineSvg(domOutput.elementsByCaptureNodeId, context) : { entries: [] };
    context.addProgress("CAPTURING_ASSETS");
    const assets = options.includeAssets ? captureAssetReferences(domOutput.elementsByCaptureNodeId, styles, pseudo, context) : { references: [] };
    context.addProgress("VALIDATING_SNAPSHOT");

    const durationMs = Math.max(0, Date.now() - context.startedAt);
    const metrics = buildMetrics(domOutput.dom, styles.entries.length, geometry.entries.length, pseudo.entries.length, svg.entries.length, assets.references.length, context, durationMs);
    const snapshot = buildSnapshot(metadata, domOutput.dom, styles, geometry, pseudo, svg, assets, context.warnings.map(toSnapshotWarning), metrics);
    const semanticValidation = validateCapturedDomSemantics(domOutput.dom);
    const runtimeValidation = validateBrowserCaptureSnapshot(snapshot);
    for (const error of [...semanticValidation.errors, ...runtimeValidation.errors]) {
      context.addWarning({ code: "CAPTURE_SEMANTIC_INVALID", message: error, severity: "ERROR" });
    }
    snapshot.warnings = context.warnings.map(toSnapshotWarning);
    snapshot.metrics.warningCount = snapshot.warnings.length;
    const ok = semanticValidation.ok && runtimeValidation.ok;
    context.addProgress("COMPLETED");
    return {
      status: !ok ? "FAILED" : context.truncated ? "PARTIAL" : "COMPLETED",
      ...(ok ? { snapshot } : {}),
      warnings: context.warnings,
      metrics: { ...metrics, durationMs },
      progress: context.progress,
      ...(!ok ? { error: browserCaptureError("CAPTURE_SNAPSHOT_INVALID", "Capture snapshot validation failed.", false) } : {})
    };
  } catch {
    return {
      status: "FAILED",
      warnings: context.warnings,
      metrics: buildEmptyMetrics(Math.max(0, Date.now() - context.startedAt)),
      progress: context.progress,
      error: browserCaptureError("CAPTURE_DOM_FAILED", "Browser capture failed without exposing page content.", true)
    };
  } finally {
    browserCaptureCancellation.clear(request.sessionId);
  }
}

export function cancelBrowserCapture(sessionId: string): void {
  browserCaptureCancellation.cancel(sessionId);
}

export function summarizeBrowserCaptureResult(sessionId: string, result: BrowserCaptureResult): BrowserCaptureSummary {
  return {
    status: result.status,
    sessionId,
    ...(result.snapshot ? { snapshotVersion: result.snapshot.version } : {}),
    nodeCount: result.metrics.nodeCount,
    elementCount: result.metrics.elementCount,
    textNodeCount: result.metrics.textNodeCount,
    styleCount: result.metrics.styleCount,
    geometryCount: result.metrics.geometryCount,
    pseudoCount: result.metrics.pseudoCount,
    inlineSvgCount: result.metrics.inlineSvgCount,
    assetReferenceCount: result.metrics.assetReferenceCount,
    hiddenCount: result.metrics.hiddenCount,
    skippedNodeCount: result.metrics.skippedNodeCount,
    warningCount: result.warnings.length,
    durationMs: result.metrics.durationMs,
    truncated: result.metrics.truncated
  };
}

async function waitForStableDom(doc: Document, maxWaitMs: number, isCancelled: () => boolean): Promise<void> {
  if (maxWaitMs <= 0 || !doc.defaultView) return;
  const stableWindowMs = Math.min(700, Math.max(150, Math.floor(maxWaitMs / 3)));
  const startedAt = Date.now();
  let lastMutationAt = Date.now();
  let changed = false;
  const observer = new MutationObserver(() => {
    changed = true;
    lastMutationAt = Date.now();
  });
  observer.observe(doc.documentElement ?? doc, { childList: true, subtree: true, characterData: true, attributes: true });
  try {
    await new Promise<void>((resolve) => {
      const tick = () => {
        if (isCancelled()) return resolve();
        const elapsed = Date.now() - startedAt;
        const quietFor = Date.now() - lastMutationAt;
        if (elapsed >= maxWaitMs || (changed && quietFor >= stableWindowMs)) return resolve();
        doc.defaultView?.setTimeout(tick, 100);
      };
      doc.defaultView?.setTimeout(tick, 100);
    });
  } finally {
    observer.disconnect();
  }
}

function buildSnapshot(
  metadata: BrowserPageMetadata,
  dom: unknown,
  styles: unknown,
  geometry: unknown,
  pseudo: { entries: unknown[] },
  svg: { entries: unknown[] },
  assets: { references: unknown[] },
  warnings: CaptureSnapshotWarning[],
  metrics: BrowserCaptureMetrics
): CaptureSnapshot {
  const captureTime = new Date().toISOString();
  return {
    version: CAPTURE_SNAPSHOT_VERSION,
    capture: {
      mode: "BROWSER_TAB",
      providerId: "browser-extension",
      source: {
        mode: "BROWSER_TAB",
        inputUrl: metadata.url,
        normalizedUrl: metadata.url,
        providerId: "browser-extension",
        trustedLocalInput: true
      }
    },
    document: {
      requestedUrl: metadata.url,
      finalUrl: metadata.url,
      title: metadata.title,
      capturedAt: captureTime
    },
    viewport: { width: metadata.viewportWidth, height: metadata.viewportHeight, deviceScaleFactor: metadata.devicePixelRatio },
    scroll: { x: metadata.scrollX, y: metadata.scrollY },
    metadata: {
      captureMode: "BROWSER_TAB",
      captureProvider: "browser-extension",
      browser: "chrome",
      platform: "chrome-extension",
      captureTime,
      locale: metadata.language,
      theme: metadata.theme,
      devicePixelRatio: metadata.devicePixelRatio,
      viewport: { width: metadata.viewportWidth, height: metadata.viewportHeight, deviceScaleFactor: metadata.devicePixelRatio },
      scroll: { x: metadata.scrollX, y: metadata.scrollY }
    },
    dom,
    styles,
    geometry,
    assets,
    pseudo: { beforeCount: pseudo.entries.filter((entry) => (entry as { pseudoType?: string }).pseudoType === "before").length, afterCount: pseudo.entries.filter((entry) => (entry as { pseudoType?: string }).pseudoType === "after").length },
    svg: { count: svg.entries.length, inlineCount: svg.entries.length, externalCount: 0, entries: svg.entries },
    screenshots: { captures: [] },
    warnings,
    metrics: {
      domCount: metrics.nodeCount,
      styleCount: metrics.styleCount,
      geometryCount: metrics.geometryCount,
      svgCount: metrics.inlineSvgCount,
      pseudoCount: metrics.pseudoCount,
      assetCount: metrics.assetReferenceCount,
      warningCount: warnings.length,
      durationMs: metrics.durationMs
    }
  };
}

function buildMetrics(dom: { nodes: Array<{ nodeType: string; hidden?: { hidden: boolean } }> }, styleCount: number, geometryCount: number, pseudoCount: number, svgCount: number, assetCount: number, context: { skippedNodeCount: number; hiddenCount: number; truncated: boolean }, durationMs: number): BrowserCaptureMetrics {
  return {
    nodeCount: dom.nodes.length,
    elementCount: dom.nodes.filter((node) => node.nodeType === "ELEMENT").length,
    textNodeCount: dom.nodes.filter((node) => node.nodeType === "TEXT").length,
    styleCount,
    geometryCount,
    pseudoCount,
    inlineSvgCount: svgCount,
    assetReferenceCount: assetCount,
    skippedNodeCount: context.skippedNodeCount,
    hiddenCount: context.hiddenCount,
    flexContainerCount: 0,
    gridContainerCount: 0,
    durationMs,
    truncated: context.truncated
  };
}

function buildEmptyMetrics(durationMs: number): BrowserCaptureMetrics {
  return {
    nodeCount: 0,
    elementCount: 0,
    textNodeCount: 0,
    styleCount: 0,
    geometryCount: 0,
    pseudoCount: 0,
    inlineSvgCount: 0,
    assetReferenceCount: 0,
    skippedNodeCount: 0,
    hiddenCount: 0,
    flexContainerCount: 0,
    gridContainerCount: 0,
    durationMs,
    truncated: false
  };
}

function cancelledResult(startedAt: number, metadata: BrowserPageMetadata): BrowserCaptureResult {
  return {
    status: "CANCELLED",
    warnings: [{ code: "CAPTURE_CANCELLED", message: "Capture was cancelled.", severity: "INFO" }],
    metrics: buildEmptyMetrics(Math.max(0, Date.now() - startedAt)),
    progress: [{ currentStage: "COMPLETED", completedNodes: 0, totalEstimate: 0, warningCount: 1 }],
    error: browserCaptureError("CAPTURE_CANCELLED", `Capture cancelled for ${metadata.title || "current tab"}.`, true)
  };
}

function toSnapshotWarning(warning: { code: string; message: string; severity: "INFO" | "WARNING" | "ERROR"; sourceNodeId?: string }): CaptureSnapshotWarning {
  return {
    code: warning.code,
    message: warning.message,
    severity: warning.severity,
    source: "CAPTURE",
    ...(warning.sourceNodeId ? { sourceNodeId: warning.sourceNodeId } : {})
  };
}
