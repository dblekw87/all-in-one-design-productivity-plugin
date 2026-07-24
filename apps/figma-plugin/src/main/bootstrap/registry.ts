import { createCapabilityRegistry } from "../capabilities/capability-registry";
import { websiteImportCapability } from "../capabilities/website-import/website-import-capability";
import { createRenderDesignIrCapability } from "../capabilities/render-design-ir/render-design-ir-capability";
import type { RendererRuntime } from "../renderer/runtime/renderer-runtime";

export function createRegisteredCapabilityRegistry(renderer?: RendererRuntime) {
  const registry = createCapabilityRegistry();
  registry.register(websiteImportCapability);
  if (renderer) registry.register(createRenderDesignIrCapability(renderer));
  return registry;
}
