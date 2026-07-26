import { createServer, type Server } from "node:http";
import { readFileSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PlaywrightBrowserManager } from "../src/browser/playwright-browser-manager.js";
import { PlaywrightBrowserRuntime } from "../src/browser/playwright-browser-runtime.js";
import { BrowserRuntimeError } from "../src/browser/browser-errors.js";
import type { SafeRequestInspector } from "../src/browser/security/safe-request-inspector.js";
import type { DomSnapshotElementNode, DomSnapshotNode } from "@aio/dom-snapshot";
import { normalizePage } from "../src/normalization/normalize-page.js";
import { buildLayoutEvidence } from "../src/layout/evidence/build-layout-evidence.js";
import { inferPageLayout } from "../src/layout/inference/infer-page-layout.js";
import { inferPageSizing } from "../src/sizing/infer-page-sizing.js";
import { extractAssetReferences } from "../src/assets/reference/extract-asset-references.js";
import { buildDesignIr } from "../src/design-ir/build-design-ir.js";
import type { DesignIrNode } from "@aio/design-ir";

const fixtureRoot = resolve(import.meta.dirname, "../../fixture-website");
const manager = new PlaywrightBrowserManager({ launchTimeoutMs: 30_000, closeTimeoutMs: 5_000 });
const fixtureInspector: SafeRequestInspector = {
  async inspect(request) {
    const url = new URL(request.url);
    if (url.hostname === "127.0.0.1" && (url.protocol === "http:" || url.protocol === "https:")) {
      return { allowed: true, normalizedUrl: request.url, resourceType: request.resourceType };
    }

    if (request.url === "about:blank") {
      return { allowed: true, normalizedUrl: request.url, resourceType: request.resourceType };
    }

    return {
      allowed: false,
      code: "BROWSER_REQUEST_BLOCKED",
      reason: "Only fixture requests are allowed.",
      resourceType: request.resourceType
    };
  }
};
const runtime = new PlaywrightBrowserRuntime(manager, {
  inspector: fixtureInspector,
  maxNetworkRequests: 50,
  maxRedirects: 5
});

let server: Server;
let baseUrl: string;

beforeAll(async () => {
  server = createServer((request, response) => {
    const url = request.url === "/fixtures/basic-landing-v1" ? "/index.html" : request.url ?? "/index.html";
    const pathname = url.split("?")[0] ?? "/index.html";
    const filePath = join(fixtureRoot, pathname.startsWith("/assets") || pathname.startsWith("/styles") ? "public" : "", pathname);
    try {
      const body = readFileSync(filePath);
      response.statusCode = 200;
      response.setHeader("content-type", contentType(filePath));
      response.end(body);
    } catch {
      response.statusCode = 404;
      response.end("not found");
    }
  });
  await new Promise<void>((resolveServer) => {
    server.listen(0, "127.0.0.1", resolveServer);
  });
  const address = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${address.port}`;
});

afterAll(async () => {
  await runtime.close();
  await new Promise<void>((resolveServer) => server.close(() => resolveServer()));
});

describe("playwright browser runtime", () => {
  it("navigates to the fixture website and collects metadata", async () => {
    const result = await runtime.navigate({
      url: `${baseUrl}/fixtures/basic-landing-v1`,
      viewport: { width: 1440, height: 1200, deviceScaleFactor: 1 },
      timeoutMs: 15_000
    });

    expect(result.statusCode).toBe(200);
    expect(result.finalUrl).toBe(`${baseUrl}/fixtures/basic-landing-v1`);
    expect(result.title).toBe("Fixture Basic Landing v1");
    expect(result.contentType).toContain("text/html");
    expect(result.viewport).toEqual({ width: 1440, height: 1200, deviceScaleFactor: 1 });
    expect(result.timing.durationMs).toBeGreaterThanOrEqual(0);
    expect(result.security.blockedRequests).toBe(0);
    expect(result.security.totalRequests).toBeGreaterThan(0);
    expect(result.snapshot.snapshotVersion).toBe("1.0");
    expect(result.snapshot.root.tagName).toBe("body");
    expect(findElements(result.snapshot.root, "header")).toHaveLength(1);
    expect(findElements(result.snapshot.root, "main")).toHaveLength(1);
    expect(findElements(result.snapshot.root, "footer")).toHaveLength(1);
    expect(findElements(result.snapshot.root, "article")).toHaveLength(3);
    expect(findElements(result.snapshot.root, "img")).toHaveLength(2);
    expect(findElements(result.snapshot.root, "svg").length).toBeGreaterThan(0);
    expect(findElements(result.snapshot.root, "script")).toHaveLength(0);
    expect(findElements(result.snapshot.root, "style")).toHaveLength(0);
    expect(findElements(result.snapshot.root, "p").some((node) => node.flags.hiddenAttribute)).toBe(true);
    expect(findElements(result.snapshot.root, "span").some((node) => node.flags.ariaHidden)).toBe(true);
    expect(result.snapshot.metrics.totalNodeCount).toBeGreaterThan(10);
    expect(new Set(flattenIds(result.snapshot.root)).size).toBe(result.snapshot.metrics.totalNodeCount);
    expect(result.styleSnapshot.styleSnapshotVersion).toBe("1.0");
    expect(result.styleSnapshot.entries.length).toBe(result.snapshot.metrics.elementNodeCount);
    expect(result.styleSnapshot.entries.some((entry) => entry.styles.display === "flex")).toBe(true);
    expect(result.styleSnapshot.entries.some((entry) => entry.styles.display === "grid")).toBe(true);
    expect(result.styleSnapshot.entries.some((entry) => entry.styles.fontWeight === "700")).toBe(true);
    expect(result.styleSnapshot.entries.some((entry) => entry.styles.borderTopLeftRadius !== undefined)).toBe(true);
    expect(result.styleSnapshot.entries.some((entry) => entry.pseudo?.before?.content)).toBe(true);
    expect(result.styleSnapshot.metrics.flexContainerCount).toBeGreaterThan(0);
    expect(result.styleSnapshot.metrics.gridContainerCount).toBeGreaterThan(0);
    expect(result.geometry.geometryVersion).toBe("1.0");
    expect(result.geometry.entries.length).toBe(result.snapshot.metrics.elementNodeCount);
    expect(result.geometry.entries.every((entry) => entry.boundingRect.width >= 0 && entry.boundingRect.height >= 0)).toBe(true);
    expect(result.geometry.entries.some((entry) => entry.flags.intersectsViewport)).toBe(true);
    expect(result.geometry.entries.some((entry) => entry.boxMetrics.scrollWidth >= entry.boxMetrics.clientWidth)).toBe(true);
    const headerGeometry = result.geometry.entries.find((entry) => entry.snapshotId === findElements(result.snapshot.root, "header")[0]?.snapshotId);
    const footerGeometry = result.geometry.entries.find((entry) => entry.snapshotId === findElements(result.snapshot.root, "footer")[0]?.snapshotId);
    expect(headerGeometry?.documentRect.y).toBeLessThan(footerGeometry?.documentRect.y ?? Number.POSITIVE_INFINITY);
    const model = normalizePage(result.snapshot, result.styleSnapshot, result.geometry);
    expect(model.modelVersion).toBe("1.0");
    expect(model.root.tagName).toBe("body");
    expect(model.metrics.flexContainerCount).toBeGreaterThan(0);
    expect(model.metrics.gridContainerCount).toBeGreaterThan(0);
    expect(model.metrics.elementNodeCount).toBe(result.snapshot.metrics.elementNodeCount);
    const evidence = buildLayoutEvidence(model);
    const inference = inferPageLayout(model, evidence);
    expect(evidence.evidenceVersion).toBe("1.0");
    expect(inference.inferenceVersion).toBe("1.0");
    expect(inference.entries.some((entry) => entry.mode === "FLEX_ROW" || entry.mode === "FLEX_COLUMN" || entry.mode === "GRID")).toBe(true);
    expect(inference.entries.every((entry) => entry.confidence >= 0 && entry.confidence <= 1)).toBe(true);
    const sizing = inferPageSizing(model, evidence, inference);
    expect(sizing.inferenceVersion).toBe("1.0");
    expect(sizing.entries.length).toBe(model.metrics.elementNodeCount);
    expect(sizing.entries.every((entry) => entry.horizontal.confidence >= 0 && entry.horizontal.confidence <= 1 && entry.vertical.confidence >= 0 && entry.vertical.confidence <= 1)).toBe(true);
    const assetReferences = await extractAssetReferences(model);
    expect(assetReferences.referenceVersion).toBe("1.0");
    expect(assetReferences.assets.length).toBeGreaterThan(0);
    expect(assetReferences.usages.length).toBeGreaterThanOrEqual(assetReferences.assets.length);
    expect(assetReferences.assets.some((asset) => asset.sourceType === "IMAGE_ELEMENT")).toBe(true);
    expect(assetReferences.assets.some((asset) => asset.sourceType === "INLINE_SVG")).toBe(true);
    expect(assetReferences.assets.some((asset) => asset.sourceType === "INLINE_SVG" && asset.status === "SUPPORTED_REFERENCE" && asset.mediaTypeHint === "SVG" && asset.reference.original.startsWith("data:image/svg+xml;charset=utf-8,"))).toBe(true);
    const designIr = buildDesignIr({
      model,
      layout: inference,
      sizing,
      assetReferences,
      resolvedAssets: {
        resolutionVersion: "1.0",
        source: { assetReferenceVersion: "1.0", requestedUrl: model.source.requestedUrl, finalUrl: model.source.finalUrl, resolvedAt: new Date().toISOString() },
        assets: [],
        metrics: {
          totalReferenceCount: assetReferences.assets.length,
          attemptedCount: 0,
          resolvedCount: 0,
          blockedCount: 0,
          failedCount: 0,
          skippedCount: 0,
          totalDownloadedBytes: 0,
          uniqueBinaryCount: 0,
          duplicateBinaryCount: 0,
          pngCount: 0,
          jpegCount: 0,
          webpCount: 0,
          gifCount: 0,
          avifCount: 0,
          svgCount: 0,
          sanitizedSvgCount: 0,
          rejectedSvgCount: 0,
          resolutionTimeMs: 0
        },
        warnings: []
      }
    });
    const eyebrowText = flattenDesignIr(designIr.root).find((node) => node.nodeType === "TEXT" && node.text.includes("fixture-basic-landing-v1"));
    expect(eyebrowText?.nodeType === "TEXT" ? eyebrowText.typography.color : undefined).toMatchObject({ r: 15 / 255, g: 118 / 255, b: 110 / 255, a: 1 });
  });

  it("cleans up context when navigation is cancelled", async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(
      runtime.navigate(
        {
          url: `${baseUrl}/fixtures/basic-landing-v1`,
          viewport: { width: 800, height: 600, deviceScaleFactor: 1 },
          timeoutMs: 15_000
        },
        { signal: controller.signal }
      )
    ).rejects.toMatchObject(new BrowserRuntimeError("BROWSER_NAVIGATION_CANCELLED", "Browser navigation was cancelled."));

    const result = await runtime.navigate({
      url: `${baseUrl}/fixtures/basic-landing-v1`,
      viewport: { width: 800, height: 600, deviceScaleFactor: 1 },
      timeoutMs: 15_000
    });
    expect(result.statusCode).toBe(200);
  });

  it("keeps analyzing when non-document requests are blocked by the request limit", async () => {
    const limitedRuntime = new PlaywrightBrowserRuntime(manager, {
      inspector: fixtureInspector,
      maxNetworkRequests: 1,
      maxRedirects: 5
    });

    const result = await limitedRuntime.navigate({
      url: `${baseUrl}/fixtures/basic-landing-v1`,
      viewport: { width: 800, height: 600, deviceScaleFactor: 1 },
      timeoutMs: 15_000
    });

    expect(result.statusCode).toBe(200);
    expect(result.security.blockedRequests).toBeGreaterThan(0);
    expect(result.security.warnings.some((warning) => warning.code === "NETWORK_REQUEST_LIMIT_EXCEEDED")).toBe(true);
  });

  it("rejects client error and non-html main document responses", async () => {
    await expect(
      runtime.navigate({
        url: `${baseUrl}/missing`,
        viewport: { width: 800, height: 600, deviceScaleFactor: 1 },
        timeoutMs: 15_000
      })
    ).rejects.toMatchObject({ code: "TARGET_HTTP_CLIENT_ERROR" });

    await expect(
      runtime.navigate({
        url: `${baseUrl}/assets/hero-card.png`,
        viewport: { width: 800, height: 600, deviceScaleFactor: 1 },
        timeoutMs: 15_000
      })
    ).rejects.toMatchObject({ code: "TARGET_CONTENT_TYPE_NOT_SUPPORTED" });
  });
});

function contentType(filePath: string): string {
  switch (extname(filePath)) {
    case ".css":
      return "text/css";
    case ".svg":
      return "image/svg+xml";
    case ".png":
      return "image/png";
    default:
      return "text/html";
  }
}

function findElements(node: DomSnapshotElementNode, tagName: string) {
  return flattenElements(node).filter((element) => element.tagName === tagName);
}

function flattenElements(node: DomSnapshotElementNode): DomSnapshotElementNode[] {
  return [node, ...node.children.filter((child) => child.nodeType === "ELEMENT").flatMap(flattenElements)];
}

function flattenIds(node: DomSnapshotNode): string[] {
  return [node.snapshotId, ...(node.nodeType === "ELEMENT" ? node.children.flatMap(flattenIds) : [])];
}

function flattenDesignIr(node: DesignIrNode): DesignIrNode[] {
  return [node, ...("children" in node ? (node.children ?? []).flatMap(flattenDesignIr) : [])];
}
