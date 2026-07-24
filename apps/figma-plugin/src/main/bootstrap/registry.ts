import { createCapabilityRegistry } from "../capabilities/capability-registry";
import { websiteImportCapability } from "../capabilities/website-import/website-import-capability";

export function createRegisteredCapabilityRegistry() {
  const registry = createCapabilityRegistry();
  registry.register(websiteImportCapability);
  return registry;
}
