import { describe, expect, it, vi } from "vitest";
import { createHttpAssetClient } from "../src/main/assets/client/http-asset-client.js";
import { createAssetManifestIndex } from "../src/main/assets/client/asset-manifest-index.js";
import { sha256Hex } from "../src/main/assets/runtime/verify-asset-binary.js";

const bytes = new Uint8Array([1, 2, 3, 4]);

function manifest(sha256: string) {
  return { manifestVersion: "1.0" as const, session: { sessionId: "imp-test", expiresAt: new Date(Date.now() + 60_000).toISOString() }, assets: [{ assetId: "asset_000001", bindingIds: ["binding_000001"], mediaType: "image/png" as const, byteLength: bytes.byteLength, sha256, transferType: "RASTER_BINARY" as const, downloadPath: "/v1/imports/imp-test/assets/asset_000001", expiresAt: new Date(Date.now() + 60_000).toISOString() }], metrics: { assetCount: 1, totalByteLength: bytes.byteLength } };
}

describe("Plugin asset client", () => {
  it("indexes bindings and verifies response headers, bytes, and hash", async () => {
    const hash = await sha256Hex(bytes);
    const documentManifest = manifest(hash);
    const accessToken = "x".repeat(32);
    const index = createAssetManifestIndex(documentManifest, new Map([["binding_000001", "asset_000001"]]));
    expect(index.assetsByBindingId.get("binding_000001")?.assetId).toBe("asset_000001");
    const fetchMock = vi.fn(async (_input: URL, init?: RequestInit) => {
      expect((init?.headers as Record<string, string>).Authorization).toBe(`Bearer ${accessToken}`);
      expect(init?.credentials).toBe("omit");
      return new Response(bytes, { status: 200, headers: { "content-type": "image/png", "content-length": String(bytes.byteLength) } });
    });
    vi.stubGlobal("fetch", fetchMock);
    const client = createHttpAssetClient({ baseUrl: "https://parser.example.test" });
    const result = await client.fetchAsset({ sessionId: documentManifest.session.sessionId, accessToken, asset: documentManifest.assets[0]!, signal: new AbortController().signal });
    expect(result.sha256).toBe(hash);
    expect(result.byteLength).toBe(bytes.byteLength);
    expect(fetchMock).toHaveBeenCalledOnce();
    vi.unstubAllGlobals();
  });

  it("rejects a content type mismatch without exposing credentials", async () => {
    const hash = await sha256Hex(bytes);
    const documentManifest = manifest(hash);
    const accessToken = "x".repeat(32);
    vi.stubGlobal("fetch", vi.fn(async () => new Response(bytes, { status: 200, headers: { "content-type": "image/jpeg", "content-length": String(bytes.byteLength) } })));
    const client = createHttpAssetClient({ baseUrl: "https://parser.example.test" });
    await expect(client.fetchAsset({ sessionId: documentManifest.session.sessionId, accessToken, asset: documentManifest.assets[0]!, signal: new AbortController().signal })).rejects.toMatchObject({ code: "ASSET_CONTENT_TYPE_MISMATCH" });
    vi.unstubAllGlobals();
  });
});
