export type ImportSessionVersion = "1.0";

export interface ImportSessionDescriptor {
  sessionId: string;
  expiresAt: string;
  assetCount: number;
  totalByteLength: number;
  accessToken: string;
}

export type AssetTransferMediaType =
  | "image/png"
  | "image/jpeg"
  | "image/webp"
  | "image/gif"
  | "image/avif"
  | "image/svg+xml";

export interface AssetTransferEntry {
  assetId: string;
  bindingIds: string[];
  mediaType: AssetTransferMediaType;
  byteLength: number;
  sha256: string;
  transferType: "RASTER_BINARY" | "SANITIZED_SVG";
  downloadPath: string;
  expiresAt: string;
}

export interface AssetTransferManifest {
  manifestVersion: "1.0";
  session: {
    sessionId: string;
    expiresAt: string;
  };
  assets: AssetTransferEntry[];
  metrics: {
    assetCount: number;
    totalByteLength: number;
  };
}

export interface AssetTransferSessionResponse {
  session: ImportSessionDescriptor;
  manifest: AssetTransferManifest;
}
