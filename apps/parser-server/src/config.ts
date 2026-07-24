import { z } from "zod";

export const parserServerConfigSchema = z.object({
  host: z.string().default("127.0.0.1"),
  port: z.coerce.number().int().positive().default(4000),
  requestTimeoutMs: z.coerce.number().int().positive().default(30_000),
  maxUrlLength: z.coerce.number().int().positive().default(2048),
  maxRedirects: z.coerce.number().int().nonnegative().default(5),
  maxResponseBytes: z.coerce.number().int().positive().default(10_485_760),
  browserConcurrency: z.coerce.number().int().positive().default(2),
  browserLaunchTimeoutMs: z.coerce.number().int().min(1_000).max(120_000).default(30_000),
  navigationTimeoutMs: z.coerce.number().int().min(1_000).max(120_000).default(15_000),
  browserCloseTimeoutMs: z.coerce.number().int().min(500).max(30_000).default(5_000),
  maxNetworkRequests: z.coerce.number().int().min(1).max(10_000).default(500),
  maxDomDepth: z.coerce.number().int().min(1).max(500).default(100),
  maxDomNodes: z.coerce.number().int().min(1).max(100_000).default(5_000),
  maxTextNodeLength: z.coerce.number().int().min(1).max(1_000_000).default(10_000),
  maxStyleEntries: z.coerce.number().int().min(1).max(100_000).default(5_000),
  maxStyleWarnings: z.coerce.number().int().min(1).max(10_000).default(100),
  maxGeometryEntries: z.coerce.number().int().min(1).max(100_000).default(5_000),
  maxAssetReferences: z.coerce.number().int().min(1).max(100_000).default(1_000),
  maxAssetUsages: z.coerce.number().int().min(1).max(100_000).default(5_000),
  maxAssetWarnings: z.coerce.number().int().min(1).max(10_000).default(100),
  maxAssetBytes: z.coerce.number().int().positive().default(5_242_880),
  maxTotalAssetBytes: z.coerce.number().int().positive().default(20_971_520),
  maxAssetConcurrency: z.coerce.number().int().positive().max(32).default(4),
  maxAssetRedirects: z.coerce.number().int().nonnegative().max(20).default(5),
  assetFetchTimeoutMs: z.coerce.number().int().positive().max(120_000).default(10_000),
  maxImageWidth: z.coerce.number().int().positive().default(16_384),
  maxImageHeight: z.coerce.number().int().positive().default(16_384),
  maxImagePixels: z.coerce.number().int().positive().default(100_000_000),
  importSessionTtlMs: z.coerce.number().int().positive().default(300_000),
  maxImportSessions: z.coerce.number().int().positive().default(100),
  maxSessionAssets: z.coerce.number().int().positive().default(1_000),
  maxSessionBytes: z.coerce.number().int().positive().default(20_971_520),
  maxTotalSessionBytes: z.coerce.number().int().positive().default(209_715_200),
  maxAssetDownloadsPerSession: z.coerce.number().int().positive().default(2_000),
  securityInspectionEnabled: z
    .enum(["true", "false"])
    .default("true")
    .transform((value) => value === "true")
});

export type ParserServerConfig = z.infer<typeof parserServerConfigSchema>;

export function loadParserServerConfig(env: NodeJS.ProcessEnv = process.env): ParserServerConfig {
  return parserServerConfigSchema.parse({
    host: env.PARSER_SERVER_HOST,
    port: env.PARSER_SERVER_PORT,
    requestTimeoutMs: env.PARSER_REQUEST_TIMEOUT_MS,
    maxUrlLength: env.PARSER_MAX_URL_LENGTH,
    maxRedirects: env.PARSER_MAX_REDIRECTS,
    maxResponseBytes: env.PARSER_MAX_RESPONSE_BYTES,
    browserConcurrency: env.PARSER_BROWSER_CONCURRENCY,
    browserLaunchTimeoutMs: env.PARSER_BROWSER_LAUNCH_TIMEOUT_MS,
    navigationTimeoutMs: env.PARSER_NAVIGATION_TIMEOUT_MS,
    browserCloseTimeoutMs: env.PARSER_BROWSER_CLOSE_TIMEOUT_MS,
    maxNetworkRequests: env.PARSER_MAX_NETWORK_REQUESTS,
    maxDomDepth: env.PARSER_MAX_DOM_DEPTH,
    maxDomNodes: env.PARSER_MAX_DOM_NODES,
    maxTextNodeLength: env.PARSER_MAX_TEXT_NODE_LENGTH,
    maxStyleEntries: env.PARSER_MAX_STYLE_ENTRIES,
    maxStyleWarnings: env.PARSER_MAX_STYLE_WARNINGS,
    maxGeometryEntries: env.PARSER_MAX_GEOMETRY_ENTRIES,
    maxAssetReferences: env.PARSER_MAX_ASSET_REFERENCES,
    maxAssetUsages: env.PARSER_MAX_ASSET_USAGES,
    maxAssetWarnings: env.PARSER_MAX_ASSET_WARNINGS,
    maxAssetBytes: env.PARSER_MAX_ASSET_BYTES,
    maxTotalAssetBytes: env.PARSER_MAX_TOTAL_ASSET_BYTES,
    maxAssetConcurrency: env.PARSER_MAX_ASSET_CONCURRENCY,
    maxAssetRedirects: env.PARSER_MAX_ASSET_REDIRECTS,
    assetFetchTimeoutMs: env.PARSER_ASSET_FETCH_TIMEOUT_MS,
    maxImageWidth: env.PARSER_MAX_IMAGE_WIDTH,
    maxImageHeight: env.PARSER_MAX_IMAGE_HEIGHT,
    maxImagePixels: env.PARSER_MAX_IMAGE_PIXELS,
    importSessionTtlMs: env.PARSER_IMPORT_SESSION_TTL_MS,
    maxImportSessions: env.PARSER_MAX_IMPORT_SESSIONS,
    maxSessionAssets: env.PARSER_MAX_SESSION_ASSETS,
    maxSessionBytes: env.PARSER_MAX_SESSION_BYTES,
    maxTotalSessionBytes: env.PARSER_MAX_TOTAL_SESSION_BYTES,
    maxAssetDownloadsPerSession: env.PARSER_MAX_ASSET_DOWNLOADS_PER_SESSION,
    securityInspectionEnabled: env.PARSER_SECURITY_INSPECTION_ENABLED
  });
}
