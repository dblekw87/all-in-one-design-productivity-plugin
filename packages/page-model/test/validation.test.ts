import { describe, expect, it } from "vitest";
import { normalizedPageModelSchema } from "../src/schema.js";

describe("page model schema", () => {
  it("rejects invalid model versions", () => {
    expect(normalizedPageModelSchema.safeParse({ modelVersion: "2.0" }).success).toBe(false);
  });
});
