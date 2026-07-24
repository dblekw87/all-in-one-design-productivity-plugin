import { describe, expect, it } from "vitest";
import { layoutEvidenceDocumentSchema } from "../src/schema.js";
describe("layout evidence schema", () => { it("rejects invalid versions", () => { expect(layoutEvidenceDocumentSchema.safeParse({ evidenceVersion: "2.0" }).success).toBe(false); }); });
