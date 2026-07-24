import type { Browser } from "playwright";
import type { BrowserNavigationRequest, BrowserNavigationResult, BrowserRuntime } from "./browser-runtime.js";
import { BrowserRuntimeError } from "./browser-errors.js";
import { onAbort, throwIfAborted } from "./cancellation.js";
import type { PlaywrightBrowserManager } from "./playwright-browser-manager.js";
import type { SafeRequestInspector } from "./security/safe-request-inspector.js";
import { UrlSecuritySafeRequestInspector } from "./security/safe-request-inspector.js";
import { BrowserNetworkGuard } from "./security/browser-network-guard.js";
import { MutableSecurityReport } from "./security/security-report.js";
import type { DnsResolver } from "../security/dns-resolver.js";
import { extractDomSnapshot } from "./dom/extract-dom-snapshot.js";
import { extractStyleSnapshot } from "./style/extract-style-snapshot.js";
import { StyleExtractionError } from "./style/style-errors.js";
import type { StyleSnapshotDocument } from "@aio/style-snapshot";
import { extractGeometryEvidence } from "./geometry/extract-geometry-evidence.js";
import { GeometryExtractionError } from "./geometry/geometry-errors.js";
import type { GeometryEvidenceDocument } from "@aio/geometry-evidence";

export class PlaywrightBrowserRuntime implements BrowserRuntime {
  constructor(
    private readonly browserManager: Pick<PlaywrightBrowserManager, "getBrowser" | "close">,
    private readonly options: {
      inspector?: SafeRequestInspector;
      resolver?: DnsResolver;
      maxUrlLength?: number;
      maxRedirects?: number;
      maxNetworkRequests?: number;
      maxDomDepth?: number;
      maxDomNodes?: number;
      maxTextNodeLength?: number;
      maxStyleEntries?: number;
      maxStyleWarnings?: number;
      maxGeometryEntries?: number;
    } = {}
  ) {}

  async navigate(
    request: BrowserNavigationRequest,
    options: { signal?: AbortSignal } = {}
  ): Promise<BrowserNavigationResult> {
    const startedAtMs = Date.now();
    const startedAt = new Date(startedAtMs).toISOString();
    throwIfAborted(options.signal);

    const browser = await this.getConnectedBrowser();
    const context = await this.createContext(browser, request);
    const securityReport = new MutableSecurityReport();
    const guard = new BrowserNetworkGuard({
      inspector: this.createInspector(),
      maxRequests: this.options.maxNetworkRequests ?? 500,
      maxRedirects: this.options.maxRedirects ?? 5,
      report: securityReport
    });
    await guard.install(context);
    const removeAbortListener = onAbort(options.signal, () => {
      void context.close().catch(() => undefined);
    });

    try {
      throwIfAborted(options.signal);
      const page = await context.newPage().catch(() => {
        throw new BrowserRuntimeError("BROWSER_PAGE_CREATION_FAILED", "Browser page could not be created.");
      });
      page.on("popup", (popup) => {
        securityReport.recordBlocked("BROWSER_POPUP_BLOCKED", "Popup pages are blocked.");
        void popup.close().catch(() => undefined);
      });
      page.on("download", (download) => {
        securityReport.recordBlocked("BROWSER_DOWNLOAD_BLOCKED", "Downloads are blocked.");
        void download.cancel().catch(() => undefined);
      });

      throwIfAborted(options.signal);
      const response = await page
        .goto(request.url, {
          waitUntil: "domcontentloaded",
          timeout: request.timeoutMs
        })
        .catch((error: unknown) => {
          throw mapNavigationError(error, options.signal);
        });

      throwIfAborted(options.signal);
      const title = await page.title().catch(() => "");
      await this.validateFinalUrl(page.url());
      this.validateMainResponse(response?.status() ?? null, response?.headers()["content-type"] ?? null);
      guard.assertNoBlockedRequests();
      const snapshot = await extractDomSnapshot(
        page,
        { requestedUrl: request.url, finalUrl: page.url(), title },
        request.extraction ?? {
          excludeHidden: true,
          excludeIframes: true,
          excludeCanvas: true,
          includePseudoElements: true,
          maxDepth: this.options.maxDomDepth ?? 100,
          maxNodes: this.options.maxDomNodes ?? 5_000,
          maxTextNodeLength: this.options.maxTextNodeLength ?? 10_000
        }
      );
      let styleSnapshot: StyleSnapshotDocument;
      try {
        styleSnapshot = await extractStyleSnapshot(
          page,
          snapshot,
          { requestedUrl: request.url, finalUrl: page.url(), capturedAt: snapshot.source.capturedAt },
          request.styleExtraction ?? {
            maxDepth: this.options.maxDomDepth ?? 100,
            maxEntries: this.options.maxStyleEntries ?? 5_000,
            maxWarnings: this.options.maxStyleWarnings ?? 100,
            includePseudoElements: request.extraction?.includePseudoElements ?? true
          }
        );
      } catch (error) {
        if (error instanceof StyleExtractionError) {
          throw new BrowserRuntimeError(error.code, error.message);
        }
        throw error;
      }
      let geometry: GeometryEvidenceDocument;
      try {
        geometry = await extractGeometryEvidence(
          page,
          snapshot,
          styleSnapshot,
          { requestedUrl: request.url, finalUrl: page.url(), capturedAt: snapshot.source.capturedAt },
          request.viewport,
          request.geometryExtraction ?? { maxDepth: this.options.maxDomDepth ?? 100, maxEntries: this.options.maxGeometryEntries ?? 5_000 }
        );
      } catch (error) {
        if (error instanceof GeometryExtractionError) throw new BrowserRuntimeError(error.code, error.message);
        throw error;
      }
      const completedAtMs = Date.now();

      return {
        requestedUrl: request.url,
        finalUrl: page.url(),
        statusCode: response?.status() ?? null,
        title,
        contentType: response?.headers()["content-type"] ?? null,
        viewport: request.viewport,
        timing: {
          startedAt,
          completedAt: new Date(completedAtMs).toISOString(),
          durationMs: Math.max(0, completedAtMs - startedAtMs)
        },
        security: securityReport.snapshot(),
        snapshot,
        styleSnapshot,
        geometry
      };
    } finally {
      removeAbortListener();
      await context.close().catch(() => undefined);
    }
  }

  async close(): Promise<void> {
    await this.browserManager.close();
  }

  private async getConnectedBrowser(): Promise<Browser> {
    const browser = await this.browserManager.getBrowser();
    if (!browser.isConnected()) {
      throw new BrowserRuntimeError("BROWSER_DISCONNECTED", "Chromium is disconnected.");
    }
    return browser;
  }

  private async createContext(browser: Browser, request: BrowserNavigationRequest) {
    return browser
      .newContext({
        viewport: {
          width: request.viewport.width,
          height: request.viewport.height
        },
        deviceScaleFactor: request.viewport.deviceScaleFactor,
        javaScriptEnabled: true,
        ignoreHTTPSErrors: false,
        serviceWorkers: "block",
        acceptDownloads: false,
        locale: "en-US",
        timezoneId: "UTC",
        colorScheme: "light",
        reducedMotion: "reduce"
      })
      .catch(() => {
        throw new BrowserRuntimeError("BROWSER_CONTEXT_CREATION_FAILED", "Browser context could not be created.");
      });
  }

  private createInspector(): SafeRequestInspector {
    if (this.options.inspector) {
      return this.options.inspector;
    }

    if (!this.options.resolver) {
      throw new BrowserRuntimeError("BROWSER_RUNTIME_CLOSED", "Browser request inspector is not configured.");
    }

    return new UrlSecuritySafeRequestInspector({
      resolver: this.options.resolver,
      maxUrlLength: this.options.maxUrlLength ?? 2048,
      maxRedirects: this.options.maxRedirects ?? 5
    });
  }

  private async validateFinalUrl(finalUrl: string): Promise<void> {
    const decision = await this.createInspector().inspect({
      requestId: "browser_final_url",
      url: finalUrl,
      method: "GET",
      resourceType: "document",
      isNavigationRequest: true
    });
    if (!decision.allowed) {
      throw new BrowserRuntimeError("BROWSER_FINAL_URL_BLOCKED", "Final browser URL is not allowed.");
    }
  }

  private validateMainResponse(statusCode: number | null, contentType: string | null): void {
    if (statusCode === null) {
      throw new BrowserRuntimeError("BROWSER_RESPONSE_MISSING", "Browser response is missing.");
    }

    if (statusCode >= 400 && statusCode < 500) {
      throw new BrowserRuntimeError("TARGET_HTTP_CLIENT_ERROR", "Target returned an HTTP client error.");
    }

    if (statusCode >= 500) {
      throw new BrowserRuntimeError("TARGET_HTTP_SERVER_ERROR", "Target returned an HTTP server error.");
    }

    const normalizedContentType = contentType?.toLowerCase() ?? "";
    if (!normalizedContentType.includes("text/html") && !normalizedContentType.includes("application/xhtml+xml")) {
      throw new BrowserRuntimeError("TARGET_CONTENT_TYPE_NOT_SUPPORTED", "Target content type is not supported.");
    }
  }
}

function mapNavigationError(error: unknown, signal?: AbortSignal): BrowserRuntimeError {
  if (signal?.aborted) {
    return new BrowserRuntimeError("BROWSER_NAVIGATION_CANCELLED", "Browser navigation was cancelled.");
  }

  const message = error instanceof Error ? error.message : "";
  if (message.toLowerCase().includes("timeout")) {
    return new BrowserRuntimeError("BROWSER_NAVIGATION_TIMEOUT", "Browser navigation timed out.");
  }

  return new BrowserRuntimeError("BROWSER_NAVIGATION_FAILED", "Browser navigation failed.");
}
