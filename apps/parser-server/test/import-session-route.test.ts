import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { loadParserServerConfig } from "../src/config.js";
import { InMemoryImportSessionStore } from "../src/import-session/in-memory-import-session-store.js";

describe("import session routes", () => {
  it("serves a binary only with the session token and deletes it", async () => {
    const store = new InMemoryImportSessionStore({ ttlMs: 5_000, maxDownloadsPerSession: 10 });
    const session = store.create({
      assets: [{ assetId: "asset_000001", mediaType: "image/png", byteLength: 4, sha256: "a".repeat(64), bytes: new Uint8Array([137, 80, 78, 71]), bindingIds: ["binding_000001"] }],
      limits: { ttlMs: 5_000, maxSessions: 10, maxAssetsPerSession: 10, maxBytesPerSession: 100, maxTotalBytes: 100, maxDownloadsPerSession: 10 }
    });
    const app = createApp(loadParserServerConfig({}), { importSessionStore: store });

    const unauthorized = await app.inject({ method: "GET", url: `${session.manifest.assets[0]!.downloadPath}` });
    expect(unauthorized.statusCode).toBe(404);

    const response = await app.inject({
      method: "GET",
      url: session.manifest.assets[0]!.downloadPath,
      headers: { authorization: `Bearer ${session.descriptor.accessToken}` }
    });
    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toContain("image/png");
    expect(response.headers["cache-control"]).toBe("private, no-store");
    expect(response.headers["x-content-type-options"]).toBe("nosniff");
    expect(Buffer.from(response.rawPayload)).toEqual(Buffer.from([137, 80, 78, 71]));

    const deleted = await app.inject({
      method: "DELETE",
      url: `/v1/imports/${session.descriptor.sessionId}`,
      headers: { authorization: `Bearer ${session.descriptor.accessToken}` }
    });
    expect(deleted.statusCode).toBe(204);
    expect((await app.inject({ method: "GET", url: session.manifest.assets[0]!.downloadPath, headers: { authorization: `Bearer ${session.descriptor.accessToken}` } })).statusCode).toBe(404);
    await app.close();
  });
});
