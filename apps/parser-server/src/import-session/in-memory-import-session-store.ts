import { createHash, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { parseAssetTransferManifest, parseImportSessionDescriptor, validateAssetTransferManifestSemantics, type AssetTransferEntry, type AssetTransferManifest, type ImportSessionDescriptor } from "@aio/shared-contracts";
import { ImportSessionError } from "./import-session-errors.js";
import { DEFAULT_IMPORT_SESSION_LIMITS, type ImportSessionLimits } from "./import-session-limits.js";
import type { CreateImportSessionInput, ImportSession, ImportSessionStore, RuntimeTransferAsset } from "./import-session-store.js";

function hashToken(token: string): Uint8Array {
  return createHash("sha256").update(token).digest();
}

function createToken(): string {
  return randomBytes(32).toString("base64url");
}

function mediaTypeForAsset(asset: RuntimeTransferAsset): AssetTransferEntry["mediaType"] {
  return asset.mediaType;
}

export class InMemoryImportSessionStore implements ImportSessionStore {
  private readonly sessions = new Map<string, ImportSession>();
  private readonly limits: ImportSessionLimits;
  private totalBytes = 0;
  private readonly cleanupTimer: NodeJS.Timeout;

  constructor(limits: Partial<ImportSessionLimits> = {}) {
    this.limits = { ...DEFAULT_IMPORT_SESSION_LIMITS, ...limits };
    this.cleanupTimer = setInterval(() => this.cleanupExpired(), Math.max(1_000, Math.min(this.limits.ttlMs, 60_000)));
    this.cleanupTimer.unref();
  }

  get size(): number { return this.sessions.size; }
  get totalByteLength(): number { return this.totalBytes; }

  create(input: CreateImportSessionInput): ImportSession {
    const limits = { ...this.limits, ...input.limits };
    const now = input.now ?? new Date();
    const assets = input.assets;
    const totalByteLength = assets.reduce((sum, asset) => sum + asset.byteLength, 0);
    if (this.sessions.size >= limits.maxSessions || assets.length > limits.maxAssetsPerSession || totalByteLength > limits.maxBytesPerSession || this.totalBytes + totalByteLength > limits.maxTotalBytes) {
      throw new ImportSessionError("IMPORT_SESSION_LIMIT_EXCEEDED", "Import session limits were exceeded.", 413);
    }
    const sessionId = `imp_${randomUUID()}`;
    const accessToken = createToken();
    const expiresAt = new Date(now.getTime() + limits.ttlMs).toISOString();
    const manifestAssets = assets.map((asset) => ({
      assetId: asset.assetId,
      bindingIds: [...asset.bindingIds].sort(),
      mediaType: mediaTypeForAsset(asset),
      byteLength: asset.byteLength,
      sha256: asset.sha256,
      transferType: asset.mediaType === "image/svg+xml" ? "SANITIZED_SVG" as const : "RASTER_BINARY" as const,
      downloadPath: `/v1/imports/${sessionId}/assets/${asset.assetId}`,
      expiresAt
    }));
    const manifest: AssetTransferManifest = parseAssetTransferManifest({
      manifestVersion: "1.0",
      session: { sessionId, expiresAt },
      assets: manifestAssets,
      metrics: { assetCount: assets.length, totalByteLength }
    });
    validateAssetTransferManifestSemantics(manifest);
    const descriptor: ImportSessionDescriptor = parseImportSessionDescriptor({ sessionId, expiresAt, assetCount: assets.length, totalByteLength, accessToken });
    const session: ImportSession = { descriptor, manifest, tokenHash: hashToken(accessToken), assets: new Map(assets.map((asset) => [asset.assetId, asset])), downloadCount: 0, expiresAtMs: now.getTime() + limits.ttlMs };
    this.sessions.set(sessionId, session);
    this.totalBytes += totalByteLength;
    return session;
  }

  get(sessionId: string): ImportSession | undefined {
    const session = this.sessions.get(sessionId);
    if (!session) return undefined;
    if (session.expiresAtMs <= Date.now()) { this.delete(sessionId); return undefined; }
    return session;
  }

  getAsset(sessionId: string, assetId: string): RuntimeTransferAsset | undefined {
    return this.get(sessionId)?.assets.get(assetId);
  }

  authorize(session: ImportSession, accessToken: string): boolean {
    if (!accessToken) return false;
    const candidate = hashToken(accessToken);
    return candidate.length === session.tokenHash.length && timingSafeEqual(candidate, session.tokenHash);
  }

  consumeDownload(sessionId: string): boolean {
    const session = this.get(sessionId);
    if (!session || session.downloadCount >= this.limits.maxDownloadsPerSession) return false;
    session.downloadCount += 1;
    return true;
  }

  delete(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;
    this.sessions.delete(sessionId);
    this.totalBytes = Math.max(0, this.totalBytes - session.descriptor.totalByteLength);
    session.assets.clear();
    session.tokenHash.fill(0);
    return true;
  }

  cleanupExpired(now = new Date()): { removedSessionCount: number; removedByteLength: number } {
    let removedSessionCount = 0;
    let removedByteLength = 0;
    for (const [sessionId, session] of this.sessions) {
      if (session.expiresAtMs <= now.getTime()) {
        removedByteLength += session.descriptor.totalByteLength;
        removedSessionCount += 1;
        this.delete(sessionId);
      }
    }
    return { removedSessionCount, removedByteLength };
  }

  close(): void {
    clearInterval(this.cleanupTimer);
    for (const sessionId of [...this.sessions.keys()]) this.delete(sessionId);
  }
}
