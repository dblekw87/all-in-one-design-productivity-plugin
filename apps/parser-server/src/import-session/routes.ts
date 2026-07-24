import type { FastifyInstance } from "fastify";
import type { ImportSessionStore } from "./import-session-store.js";

export interface ImportSessionRouteOptions {
  store: ImportSessionStore;
}

function tokenFrom(request: { headers: Record<string, string | string[] | undefined> }): string | undefined {
  const value = request.headers.authorization;
  if (typeof value !== "string") return undefined;
  const match = /^Bearer\s+(.+)$/i.exec(value);
  return match?.[1];
}

function errorBody(code: string, message: string) {
  return { error: { code, message, retryable: false } };
}

export function registerImportSessionRoutes(app: FastifyInstance, options: ImportSessionRouteOptions): void {
  app.get("/v1/imports/:sessionId/assets/:assetId", async (request, reply) => {
    const params = request.params as { sessionId?: string; assetId?: string };
    const sessionId = params.sessionId ?? "";
    const assetId = params.assetId ?? "";
    const session = options.store.get(sessionId);
    if (!session || !options.store.authorize(session, tokenFrom(request) ?? "")) {
      return reply.status(404).send(errorBody("IMPORT_ASSET_NOT_FOUND", "The requested asset is not available."));
    }
    const asset = options.store.getAsset(sessionId, assetId);
    if (!asset) return reply.status(404).send(errorBody("IMPORT_ASSET_NOT_FOUND", "The requested asset is not available."));
    if (!options.store.consumeDownload(sessionId)) return reply.status(429).send(errorBody("IMPORT_ASSET_UNAVAILABLE", "The asset download limit was reached."));
    return reply
      .header("Content-Type", asset.mediaType)
      .header("Content-Length", asset.byteLength)
      .header("Cache-Control", "private, no-store")
      .header("Pragma", "no-cache")
      .header("X-Content-Type-Options", "nosniff")
      .header("Content-Security-Policy", "default-src 'none'; sandbox")
      .send(Buffer.from(asset.bytes));
  });

  app.delete("/v1/imports/:sessionId", async (request, reply) => {
    const params = request.params as { sessionId?: string };
    const session = options.store.get(params.sessionId ?? "");
    if (session && options.store.authorize(session, tokenFrom(request) ?? "")) options.store.delete(params.sessionId ?? "");
    return reply.status(204).send();
  });
}
