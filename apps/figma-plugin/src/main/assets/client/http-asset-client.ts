import { AssetClientError } from "../contracts/asset-errors.js";
import type { AssetClientConfig, DownloadedAsset, FigmaAssetClient } from "../contracts/asset-client.js";
import { FIGMA_ASSET_POLICY } from "../runtime/asset-policy.js";
import { verifyDownloadedAsset } from "../runtime/verify-asset-binary.js";

const rasterTypes = new Set(["image/png", "image/jpeg", "image/webp", "image/gif", "image/avif"]);
const supportedTypes = new Set([...rasterTypes, "image/svg+xml"]);

function normalizedBaseUrl(value: string): string {
  const match = /^(https?):\/\/([^/?#]+)(\/[^?#]*)?$/i.exec(value.trim());
  if (!match) throw new AssetClientError("ASSET_TRANSFER_CONTEXT_INVALID", "Parser origin must be a valid URL.");
  const protocol = match[1]!.toLowerCase();
  const authority = match[2]!;
  const hostname = authority.split(":", 1)[0]!.toLowerCase();
  if (authority.includes("@") || (protocol !== "https" && hostname !== "localhost" && hostname !== "127.0.0.1")) throw new AssetClientError("ASSET_TRANSFER_CONTEXT_INVALID", "Parser origin must use HTTPS outside local development.");
  return `${protocol}://${authority}${(match[3] ?? "").replace(/\/+$/, "")}`;
}

function withTimeout(signal: AbortSignal, timeoutMs: number): { signal: AbortSignal; dispose: () => void } {
  const controller = new AbortController();
  const onAbort = () => controller.abort(signal.reason);
  if (signal.aborted) controller.abort(signal.reason); else signal.addEventListener("abort", onAbort, { once: true });
  const timer = setTimeout(() => controller.abort(new Error("timeout")), timeoutMs);
  return { signal: controller.signal, dispose: () => { clearTimeout(timer); signal.removeEventListener("abort", onAbort); } };
}

export function createHttpAssetClient(config: AssetClientConfig): FigmaAssetClient {
  const baseUrl = normalizedBaseUrl(config.baseUrl);
  const maxAssetBytes = config.maxAssetBytes ?? FIGMA_ASSET_POLICY.maxAssetBytes;
  const timeoutMs = config.timeoutMs ?? FIGMA_ASSET_POLICY.timeoutMs;
  return {
    async fetchAsset(input): Promise<DownloadedAsset> {
      if (new Date(input.asset.expiresAt).getTime() <= Date.now()) throw new AssetClientError("ASSET_SESSION_EXPIRED", "Asset transfer session has expired.", input.asset.assetId);
      if (!supportedTypes.has(input.asset.mediaType) || !((input.asset.transferType === "RASTER_BINARY" && rasterTypes.has(input.asset.mediaType)) || (input.asset.transferType === "SANITIZED_SVG" && input.asset.mediaType === "image/svg+xml"))) throw new AssetClientError("ASSET_MANIFEST_MISMATCH", "Asset transfer entry does not match its media type.", input.asset.assetId);
      const relativePath = input.asset.downloadPath;
      if (!relativePath.startsWith("/v1/imports/") || relativePath.includes("..") || relativePath.includes("://") || relativePath.includes("\\")) throw new AssetClientError("ASSET_MANIFEST_INVALID", "Asset path is outside the configured Parser origin.", input.asset.assetId);
      const path = `${baseUrl}${relativePath}`;
      const timeout = withTimeout(input.signal, timeoutMs);
      try {
        const response = await fetch(path, { method: "GET", credentials: "omit", cache: "no-store", redirect: "error", signal: timeout.signal, headers: { Authorization: `Bearer ${input.accessToken}`, Accept: "image/png,image/jpeg,image/webp,image/gif,image/avif,image/svg+xml" } });
        if (!response.ok) throw new AssetClientError("ASSET_HTTP_STATUS_INVALID", "Asset endpoint returned an unexpected status.", input.asset.assetId);
        const contentType = response.headers.get("content-type")?.split(";", 1)[0]?.toLowerCase();
        if (contentType !== input.asset.mediaType) throw new AssetClientError("ASSET_CONTENT_TYPE_MISMATCH", "Asset content type does not match the manifest.", input.asset.assetId);
        const headerLength = response.headers.get("content-length");
        if (headerLength && Number(headerLength) !== input.asset.byteLength) throw new AssetClientError("ASSET_CONTENT_LENGTH_MISMATCH", "Asset content length does not match the manifest.", input.asset.assetId);
        if (input.asset.byteLength > maxAssetBytes) throw new AssetClientError("ASSET_LIMIT_EXCEEDED", "Asset exceeds the Plugin byte limit.", input.asset.assetId);
        const bytes = new Uint8Array(await response.arrayBuffer());
        await verifyDownloadedAsset(bytes, input.asset.byteLength, input.asset.sha256, maxAssetBytes, input.asset.assetId);
        return { assetId: input.asset.assetId, mediaType: input.asset.mediaType, bytes, byteLength: bytes.byteLength, sha256: input.asset.sha256 };
      } catch (error) {
        if (timeout.signal.aborted) throw new AssetClientError(input.signal.aborted ? "ASSET_FETCH_FAILED" : "ASSET_FETCH_TIMEOUT", "Asset fetch was cancelled or timed out.", input.asset.assetId);
        if (error instanceof AssetClientError) throw error;
        throw new AssetClientError("ASSET_FETCH_FAILED", "Asset fetch failed.", input.asset.assetId);
      } finally { timeout.dispose(); }
    },
    async deleteSession(input): Promise<void> {
      const url = `${baseUrl}/v1/imports/${encodeURIComponent(input.sessionId)}`;
      try { const response = await fetch(url, { method: "DELETE", credentials: "omit", cache: "no-store", redirect: "error", ...(input.signal ? { signal: input.signal } : {}), headers: { Authorization: `Bearer ${input.accessToken}` } }); if (!response.ok && response.status !== 404) throw new Error("cleanup status"); } catch { throw new AssetClientError("ASSET_SESSION_CLEANUP_FAILED", "Asset transfer session cleanup failed."); }
    },
  };
}
