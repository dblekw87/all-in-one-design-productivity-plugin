import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { loadParserServerConfig } from "../src/config.js";

describe("parser server health", () => {
  it("responds with the health contract", async () => {
    const app = createApp(loadParserServerConfig({}));
    const response = await app.inject({ method: "GET", url: "/health" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      status: "ok",
      service: "parser-server"
    });
  });
});
