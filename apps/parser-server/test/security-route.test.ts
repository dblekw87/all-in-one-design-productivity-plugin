import { describe, expect, it, vi } from "vitest";
import type { DnsResolver } from "../src/security/dns-resolver.js";
import { createApp } from "../src/app.js";
import { loadParserServerConfig } from "../src/config.js";

const resolver: DnsResolver = {
  async resolve(hostname) {
    if (hostname === "private.example") {
      return [{ address: "10.0.0.1", family: 4 }];
    }
    return [{ address: "93.184.216.34", family: 4 }];
  }
};

describe("security inspection route", () => {
  it("returns safe target responses", async () => {
    const app = createApp(loadParserServerConfig({}), { resolver });
    const response = await app.inject({
      method: "POST",
      url: "/v1/security/inspect-target",
      payload: { url: "https://example.com" }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      safe: true,
      normalizedUrl: "https://example.com/"
    });
  });

  it("returns 400 for invalid body", async () => {
    const app = createApp(loadParserServerConfig({}), { resolver });
    const response = await app.inject({
      method: "POST",
      url: "/v1/security/inspect-target",
      payload: { url: "https://example.com", extra: true }
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      safe: false,
      error: { code: "URL_INVALID" }
    });
  });

  it("returns blocked target contract without fetching pages", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const app = createApp(loadParserServerConfig({}), { resolver });
    const response = await app.inject({
      method: "POST",
      url: "/v1/security/inspect-target",
      payload: { url: "https://private.example" }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      safe: false,
      error: { code: "IP_NOT_PUBLIC" }
    });
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("keeps health endpoint working", async () => {
    const app = createApp(loadParserServerConfig({}), { resolver });
    const response = await app.inject({ method: "GET", url: "/health" });

    expect(response.statusCode).toBe(200);
  });
});
