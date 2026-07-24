import { describe, expect, it } from "vitest";
import { createCapabilityRegistry } from "../src/main/capabilities/capability-registry";
import { websiteImportCapability } from "../src/main/capabilities/website-import/website-import-capability";

describe("capability registry", () => {
  it("registers Website Import metadata", () => {
    const registry = createCapabilityRegistry();
    registry.register(websiteImportCapability);

    expect(registry.get("website-import")).toEqual(websiteImportCapability);
    expect(registry.listByCategory("IMPORT")).toEqual([websiteImportCapability.metadata]);
  });

  it("rejects duplicate capability ids", () => {
    const registry = createCapabilityRegistry();
    registry.register(websiteImportCapability);

    expect(() => registry.register(websiteImportCapability)).toThrow("Capability already registered");
  });
});
