import type { AssetTransferManifest, ImportSessionDescriptor } from "@aio/shared-contracts";
import type { ImportSessionLimits } from "./import-session-limits.js";

export interface RuntimeTransferAsset {
  assetId: string;
  mediaType: "image/png" | "image/jpeg" | "image/webp" | "image/gif" | "image/avif" | "image/svg+xml";
  byteLength: number;
  sha256: string;
  bytes: Uint8Array;
  bindingIds: string[];
}

export interface CreateImportSessionInput {
  assets: RuntimeTransferAsset[];
  limits: ImportSessionLimits;
  now?: Date;
}

export interface ImportSession {
  descriptor: ImportSessionDescriptor;
  manifest: AssetTransferManifest;
  tokenHash: Uint8Array;
  assets: Map<string, RuntimeTransferAsset>;
  downloadCount: number;
  expiresAtMs: number;
}

export interface CleanupResult {
  removedSessionCount: number;
  removedByteLength: number;
}

export interface ImportSessionStore {
  create(input: CreateImportSessionInput): ImportSession;
  get(sessionId: string): ImportSession | undefined;
  getAsset(sessionId: string, assetId: string): RuntimeTransferAsset | undefined;
  authorize(session: ImportSession, accessToken: string): boolean;
  consumeDownload(sessionId: string): boolean;
  delete(sessionId: string): boolean;
  cleanupExpired(now?: Date): CleanupResult;
  close(): void;
  get size(): number;
  get totalByteLength(): number;
}
