import Fastify, { type FastifyInstance } from "fastify";
import { DESIGN_IR_VERSION } from "@aio/design-ir";
import { PluginMessageType } from "@aio/shared-contracts";
import type { ParserServerConfig } from "./config.js";
import { createNodeDnsResolver, type DnsResolver } from "./security/dns-resolver.js";
import { registerSecurityRoutes } from "./routes/security-routes.js";
import { registerAnalyzeRoutes } from "./routes/analyze-routes.js";
import { BrowserAnalyzeService } from "./analyze/browser-analyze-service.js";
import type { WebsiteAnalyzeService } from "./analyze/analyze-service.js";
import type { TargetInspector } from "./analyze/target-inspector.js";
import { validateWebsiteTarget } from "./security/inspect-target.js";
import { PlaywrightBrowserManager } from "./browser/playwright-browser-manager.js";
import { PlaywrightBrowserRuntime } from "./browser/playwright-browser-runtime.js";
import type { BrowserRuntime } from "./browser/browser-runtime.js";
import { InMemoryImportSessionStore } from "./import-session/in-memory-import-session-store.js";
import { registerImportSessionRoutes } from "./import-session/routes.js";
import type { ImportSessionStore } from "./import-session/import-session-store.js";

export interface HealthResponse {
  status: "ok";
  service: "parser-server";
  irVersion: string;
  contractMessageType: typeof PluginMessageType.PLUGIN_INITIALIZE_REQUEST;
}

export interface CreateAppOptions {
  resolver?: DnsResolver;
  analyzeService?: WebsiteAnalyzeService;
  targetInspector?: TargetInspector;
  browserRuntime?: BrowserRuntime;
  importSessionStore?: ImportSessionStore;
}

export function createApp(config: ParserServerConfig, options: CreateAppOptions = {}): FastifyInstance {
  const app = Fastify({
    logger: false,
    requestTimeout: config.requestTimeoutMs
  });
  const resolver = options.resolver ?? createNodeDnsResolver();
  const targetInspector =
    options.targetInspector ??
    ({
      inspect: (url: string) =>
        validateWebsiteTarget(url, {
          maxUrlLength: config.maxUrlLength,
          resolver
        })
    } satisfies TargetInspector);
  const browserRuntime =
    options.browserRuntime ??
    new PlaywrightBrowserRuntime(
      new PlaywrightBrowserManager({
        launchTimeoutMs: config.browserLaunchTimeoutMs,
        closeTimeoutMs: config.browserCloseTimeoutMs
      }),
      {
        resolver,
        maxUrlLength: config.maxUrlLength,
        maxRedirects: config.maxRedirects,
        maxNetworkRequests: config.maxNetworkRequests,
        maxDomDepth: config.maxDomDepth,
        maxDomNodes: config.maxDomNodes,
        maxTextNodeLength: config.maxTextNodeLength,
        maxStyleEntries: config.maxStyleEntries,
        maxStyleWarnings: config.maxStyleWarnings,
        maxGeometryEntries: config.maxGeometryEntries
      }
    );
  const importSessionStore = options.importSessionStore ?? new InMemoryImportSessionStore({
    ttlMs: config.importSessionTtlMs,
    maxSessions: config.maxImportSessions,
    maxAssetsPerSession: config.maxSessionAssets,
    maxBytesPerSession: config.maxSessionBytes,
    maxTotalBytes: config.maxTotalSessionBytes,
    maxDownloadsPerSession: config.maxAssetDownloadsPerSession
  });
  const analyzeService =
    options.analyzeService ??
    new BrowserAnalyzeService(browserRuntime, config.navigationTimeoutMs, {
      maxDepth: config.maxDomDepth,
      maxNodes: config.maxDomNodes,
      maxTextNodeLength: config.maxTextNodeLength,
      maxStyleEntries: config.maxStyleEntries,
      maxStyleWarnings: config.maxStyleWarnings,
      maxGeometryEntries: config.maxGeometryEntries,
      maxAssetReferences: config.maxAssetReferences,
      maxAssetUsages: config.maxAssetUsages,
      maxAssetWarnings: config.maxAssetWarnings,
      maxAssetBytes: config.maxAssetBytes,
      maxTotalAssetBytes: config.maxTotalAssetBytes,
      maxAssetConcurrency: config.maxAssetConcurrency,
      maxAssetRedirects: config.maxAssetRedirects,
      assetFetchTimeoutMs: config.assetFetchTimeoutMs,
      maxImageWidth: config.maxImageWidth,
      maxImageHeight: config.maxImageHeight,
      maxImagePixels: config.maxImagePixels
      ,importSessionStore
      ,importSessionLimits: {
        ttlMs: config.importSessionTtlMs,
        maxSessions: config.maxImportSessions,
        maxAssetsPerSession: config.maxSessionAssets,
        maxBytesPerSession: config.maxSessionBytes,
        maxTotalBytes: config.maxTotalSessionBytes,
        maxDownloadsPerSession: config.maxAssetDownloadsPerSession
      }
      ,assetSecurityValidator: async (url) => {
        const result = await validateWebsiteTarget(url, { maxUrlLength: config.maxUrlLength, resolver });
        return "error" in result ? { safe: false } : { safe: true };
      }
    });

  app.get("/health", async (): Promise<HealthResponse> => ({
    status: "ok",
    service: "parser-server",
    irVersion: DESIGN_IR_VERSION,
    contractMessageType: PluginMessageType.PLUGIN_INITIALIZE_REQUEST
  }));

  registerSecurityRoutes(app, { config, resolver });
  registerAnalyzeRoutes(app, { analyzeService, targetInspector });
  registerImportSessionRoutes(app, { store: importSessionStore });

  app.addHook("onClose", async () => {
    await browserRuntime.close();
    importSessionStore.close();
  });

  return app;
}
