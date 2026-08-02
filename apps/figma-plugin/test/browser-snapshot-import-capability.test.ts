import { describe, expect, it, vi } from "vitest";
import type { DesignIrDocument, DesignIrFrameNode } from "@aio/design-ir";
import { createOperationId, type CaptureSnapshot, type SelectionSummary } from "@aio/shared-contracts";
import { browserSnapshotImportCapability, createBrowserSnapshotImportCapability } from "../src/main/capabilities/browser-snapshot-import/browser-snapshot-import-capability";

const emptySelection: SelectionSummary = {
  selectionCount: 0,
  nodeTypes: [],
  textNodeCount: 0,
  frameNodeCount: 0,
  componentNodeCount: 0,
  instanceNodeCount: 0,
  pageId: "page-1",
  version: 0,
  nodes: []
};

const snapshot: CaptureSnapshot = {
  version: "1.0",
  capture: {
    mode: "BROWSER_TAB",
    providerId: "browser-extension",
    source: {
      mode: "BROWSER_TAB",
      inputUrl: "https://example.com/",
      normalizedUrl: "https://example.com/",
      providerId: "browser-extension",
      trustedLocalInput: true
    }
  },
  document: {
    requestedUrl: "https://example.com/",
    finalUrl: "https://example.com/",
    title: "Example",
    contentType: "text/html",
    capturedAt: "2026-07-26T00:00:00.000Z"
  },
  viewport: { width: 1440, height: 1200, deviceScaleFactor: 1 },
  scroll: { x: 0, y: 0 },
  metadata: {
    captureMode: "BROWSER_TAB",
    captureProvider: "browser-extension",
    browser: "chrome",
    captureTime: "2026-07-26T00:00:00.000Z",
    locale: "en-US",
    theme: "light",
    devicePixelRatio: 1,
    viewport: { width: 1440, height: 1200, deviceScaleFactor: 1 },
    scroll: { x: 0, y: 0 }
  },
  dom: {
    rootCaptureNodeId: "node_document",
    nodes: [
      { captureNodeId: "node_document", childCaptureNodeIds: ["node_html"], nodeType: "DOCUMENT", sourceOrder: 0, depth: 0 },
      { captureNodeId: "node_html", parentCaptureNodeId: "node_document", childCaptureNodeIds: ["node_body"], nodeType: "ELEMENT", tagName: "HTML", attributes: {}, semantic: {}, sourceOrder: 1, depth: 1 },
      { captureNodeId: "node_body", parentCaptureNodeId: "node_html", childCaptureNodeIds: ["node_app"], nodeType: "ELEMENT", tagName: "BODY", attributes: {}, semantic: {}, sourceOrder: 2, depth: 2 },
      { captureNodeId: "node_app", parentCaptureNodeId: "node_body", childCaptureNodeIds: ["node_text", "node_svg"], nodeType: "ELEMENT", tagName: "DIV", attributes: { id: "__next" }, semantic: {}, sourceOrder: 3, depth: 3 },
      { captureNodeId: "node_text", parentCaptureNodeId: "node_app", childCaptureNodeIds: [], nodeType: "TEXT", textContent: "Hello snapshot", sourceOrder: 4, depth: 4 },
      { captureNodeId: "node_svg", parentCaptureNodeId: "node_app", childCaptureNodeIds: [], nodeType: "ELEMENT", tagName: "SVG", attributes: {}, semantic: {}, sourceOrder: 5, depth: 4 }
    ]
  },
  styles: {
    entries: [
      { captureNodeId: "node_html", properties: { display: "block", "background-color": "rgb(255, 255, 255)", overflow: "visible" }, evidence: { isFlexContainer: false, isGridContainer: false } },
      { captureNodeId: "node_body", properties: { display: "block", "background-color": "rgb(255, 255, 255)", color: "rgb(17, 24, 39)", "font-size": "16px", "font-family": "Inter", overflow: "visible" }, evidence: { isFlexContainer: false, isGridContainer: false } },
      { captureNodeId: "node_app", properties: { display: "flex", "flex-direction": "column", gap: "8px", "background-color": "rgb(255, 255, 255)", color: "rgb(17, 24, 39)", "font-size": "16px", "font-family": "Inter", overflow: "visible" }, evidence: { isFlexContainer: true, isGridContainer: false } },
      { captureNodeId: "node_svg", properties: { display: "block", overflow: "visible" }, evidence: { isFlexContainer: false, isGridContainer: false } }
    ]
  },
  geometry: {
    entries: [
      { captureNodeId: "node_html", documentX: 0, documentY: 0, viewportX: 0, viewportY: 0, width: 1440, height: 1200, top: 0, right: 1440, bottom: 1200, left: 0, client: {}, transformAppliedInBounds: false },
      { captureNodeId: "node_body", documentX: 0, documentY: 0, viewportX: 0, viewportY: 0, width: 1440, height: 1200, top: 0, right: 1440, bottom: 1200, left: 0, client: {}, transformAppliedInBounds: false },
      { captureNodeId: "node_app", documentX: 510, documentY: 0, viewportX: 510, viewportY: 0, width: 420, height: 300, top: 0, right: 930, bottom: 300, left: 510, client: {}, transformAppliedInBounds: false },
      { captureNodeId: "node_svg", documentX: 530, documentY: 40, viewportX: 530, viewportY: 40, width: 24, height: 24, top: 40, right: 554, bottom: 64, left: 530, client: {}, transformAppliedInBounds: false }
    ]
  },
  assets: { references: [] },
  pseudo: { beforeCount: 0, afterCount: 0 },
  svg: { count: 1, inlineCount: 1, externalCount: 0, entries: [{ captureNodeId: "node_svg", outerHTML: "<svg viewBox=\"0 0 24 24\" xmlns=\"http://www.w3.org/2000/svg\"><circle cx=\"12\" cy=\"12\" r=\"10\" fill=\"red\"/></svg>", referencedAssetUrls: [], safety: { unsafe: false }, truncated: false }] },
  screenshots: { captures: [
    { type: "VIEWPORT", mediaType: "image/png", dataUrl: "data:image/png;base64,AA==", x: 0, y: 0, width: 1440, height: 1200, deviceScaleFactor: 1, capturedAt: "2026-07-26T00:00:00.000Z" },
    { type: "VIEWPORT", mediaType: "image/png", dataUrl: "data:image/png;base64,AA==", x: 0, y: 900, width: 1440, height: 1200, deviceScaleFactor: 1, capturedAt: "2026-07-26T00:00:00.000Z" }
  ] },
  warnings: [],
  metrics: { domCount: 6, styleCount: 4, geometryCount: 4, svgCount: 1, pseudoCount: 0, assetCount: 0, warningCount: 0, durationMs: 1 }
};

describe("Browser Snapshot Import capability", () => {
  it("validates copied browser snapshot JSON", async () => {
    const validation = await browserSnapshotImportCapability.validate(
      {
        operationId: createOperationId(),
        capabilityId: "browser-snapshot-import",
        selection: emptySelection,
        signal: new AbortController().signal,
        reportProgress: vi.fn(),
        now: () => new Date().toISOString()
      },
      { snapshotJson: JSON.stringify(snapshot) }
    );

    if (!validation.valid) throw new Error(validation.failures.map((failure) => `${failure.code}: ${failure.message}`).join("\n"));
    expect(validation.valid).toBe(true);
  });

  it("returns NOT_IMPLEMENTED when no renderer is configured", async () => {
    const context = {
      operationId: createOperationId(),
      capabilityId: "browser-snapshot-import",
      selection: emptySelection,
      signal: new AbortController().signal,
      reportProgress: vi.fn(),
      now: () => new Date().toISOString()
    };
    const validation = await browserSnapshotImportCapability.validate(context, { snapshotJson: JSON.stringify(snapshot) });
    if (!validation.valid) throw new Error("Expected valid snapshot");

    const result = await browserSnapshotImportCapability.execute(context, validation.input);

    expect(result.success).toBe(false);
    expect(result.processedCount).toBe(6);
    expect(result.failures[0]?.code).toBe("NOT_IMPLEMENTED");
  });

  it("converts valid snapshots to Design IR and passes them to the renderer", async () => {
    const renderRequests: Array<{ document: DesignIrDocument }> = [];
    const renderer = {
      render: vi.fn(async (request: { document: DesignIrDocument }) => {
        renderRequests.push(request);
        return {
          status: "COMPLETED" as const,
          rootFigmaNodeId: "1:1",
          mappings: [],
          metrics: { requestedNodeCount: 4, createdNodeCount: 4, skippedNodeCount: 0, placeholderNodeCount: 0, rollbackNodeCount: 0, durationMs: 1 },
          warnings: [],
          failures: []
        };
      })
    };
    const capability = createBrowserSnapshotImportCapability(renderer);
    const context = {
      operationId: createOperationId(),
      capabilityId: "browser-snapshot-import",
      selection: emptySelection,
      signal: new AbortController().signal,
      reportProgress: vi.fn(),
      now: () => new Date().toISOString()
    };
    const validation = await capability.validate(context, { snapshotJson: JSON.stringify(snapshot) });
    if (!validation.valid) throw new Error("Expected valid snapshot");

    const result = await capability.execute(context, validation.input);

    expect(result.success).toBe(true);
    expect(renderer.render).toHaveBeenCalledOnce();
    const renderRequest = renderRequests[0];
    expect(renderRequest?.document.root.geometry.width).toBe(420);
    expect(renderRequest?.document.root.geometry.height).toBe(300);
    expect(renderRequest?.document.metrics.totalNodeCount).toBeGreaterThanOrEqual(5);
    expect(renderRequest?.document.root.children[0]?.nodeType).toBe("FRAME");
    expect(renderRequest?.document.root.children[0]?.name).toBe("Screenshot Reference");
    expect(renderRequest?.document.root.children[1]?.nodeType).toBe("FRAME");
    expect(renderRequest?.document.root.children[1]?.name).toBe("Editable Layers");
    const screenshotGroup = renderRequest?.document.root.children[0];
    if (!screenshotGroup || !("children" in screenshotGroup)) throw new Error("Expected screenshot group");
    expect(screenshotGroup.children[0]?.nodeType).toBe("IMAGE");
    expect(screenshotGroup.children[1]?.nodeType).toBe("IMAGE");
    const screenshotNode = screenshotGroup.children[0];
    expect(screenshotNode?.geometry.x).toBe(-510);
    expect(screenshotNode?.geometry.y).toBe(0);
    if (screenshotNode?.nodeType !== "IMAGE") throw new Error("Expected screenshot image node");
    expect(screenshotNode.inlineDataUrl).toContain("data:image/png");
    expect(screenshotGroup.children[1]?.geometry.y).toBe(900);
    const editableGroup = renderRequest?.document.root.children[1];
    if (!editableGroup || !("children" in editableGroup)) throw new Error("Expected editable group");
    expect(editableGroup.children[0]?.geometry.x).toBe(-510);
    expect(editableGroup.children[0]?.geometry.y).toBe(0);
    const rootChild = editableGroup.children[0];
    if (!rootChild || !("children" in rootChild)) throw new Error("Expected root child with children");
    const bodyFrame = rootChild.children[0];
    if (!bodyFrame || !("children" in bodyFrame)) throw new Error("Expected body frame with children");
    const appFrame = bodyFrame.children[0];
    expect(appFrame?.nodeType).toBe("FRAME");
    if (appFrame?.nodeType !== "FRAME") throw new Error("Expected app frame");
    const narrowedAppFrame: DesignIrFrameNode = appFrame;
    expect(narrowedAppFrame.layout.mode).toBe("FREEFORM");
    expect(narrowedAppFrame.layout.gap?.primary).toBe(8);
    const svgNode = narrowedAppFrame.children.find((node) => node.nodeType === "VECTOR");
    expect(svgNode?.nodeType).toBe("VECTOR");
    if (svgNode?.nodeType !== "VECTOR") throw new Error("Expected vector node");
    expect(svgNode.vectorStatus).toBe("INLINE_SVG_AVAILABLE");
    expect(svgNode.inlineSvg).toContain("<svg");
  });

  it("rejects invalid JSON", async () => {
    const validation = await browserSnapshotImportCapability.validate(
      {
        operationId: createOperationId(),
        capabilityId: "browser-snapshot-import",
        selection: emptySelection,
        signal: new AbortController().signal,
        reportProgress: vi.fn(),
        now: () => new Date().toISOString()
      },
      { snapshotJson: "{invalid" }
    );

    expect(validation.valid).toBe(false);
    if (!validation.valid) expect(validation.failures[0]?.code).toBe("SNAPSHOT_JSON_INVALID");
  });
});
