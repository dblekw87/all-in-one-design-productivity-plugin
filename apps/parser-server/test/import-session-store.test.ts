import { describe, expect, it } from "vitest";
import { InMemoryImportSessionStore } from "../src/import-session/in-memory-import-session-store.js";

const limits = {
  ttlMs: 100,
  maxSessions: 2,
  maxAssetsPerSession: 2,
  maxBytesPerSession: 100,
  maxTotalBytes: 150,
  maxDownloadsPerSession: 2
};

function asset(assetId = "asset_000001") {
  return {
    assetId,
    mediaType: "image/png" as const,
    byteLength: 4,
    sha256: "a".repeat(64),
    bytes: new Uint8Array([1, 2, 3, 4]),
    bindingIds: ["binding_000001"]
  };
}

describe("in-memory import session store", () => {
  it("creates, authorizes, serves, and deletes a session", () => {
    const store = new InMemoryImportSessionStore(limits);
    const session = store.create({ assets: [asset()], limits });

    expect(session.descriptor.sessionId).toMatch(/^imp_/);
    expect(session.descriptor.accessToken).toHaveLength(43);
    expect(store.authorize(session, session.descriptor.accessToken)).toBe(true);
    expect(store.authorize(session, "wrong-token")).toBe(false);
    expect(store.getAsset(session.descriptor.sessionId, "asset_000001")?.bytes).toEqual(new Uint8Array([1, 2, 3, 4]));
    expect(store.consumeDownload(session.descriptor.sessionId)).toBe(true);
    expect(store.consumeDownload(session.descriptor.sessionId)).toBe(true);
    expect(store.consumeDownload(session.descriptor.sessionId)).toBe(false);
    expect(store.delete(session.descriptor.sessionId)).toBe(true);
    expect(store.totalByteLength).toBe(0);
    store.close();
  });

  it("expires sessions and enforces byte limits", () => {
    const store = new InMemoryImportSessionStore(limits);
    const created = store.create({ assets: [asset()], limits, now: new Date("2026-01-01T00:00:00.000Z") });
    expect(store.cleanupExpired(new Date(created.expiresAtMs + 1))).toMatchObject({ removedSessionCount: 1, removedByteLength: 4 });
    expect(store.get(created.descriptor.sessionId)).toBeUndefined();
    expect(() => store.create({ assets: [{ ...asset(), byteLength: 101 }], limits })).toThrow("Import session limits");
    store.close();
  });
});
