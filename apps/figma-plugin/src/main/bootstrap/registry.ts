import { createCapabilityRegistry } from "../capabilities/capability-registry";
import { createBrowserSnapshotImportCapability } from "../capabilities/browser-snapshot-import/browser-snapshot-import-capability";
import { createWebsiteImportCapability } from "../capabilities/website-import/website-import-capability";
import { createRenderDesignIrCapability } from "../capabilities/render-design-ir/render-design-ir-capability";
import type { RendererRuntime } from "../renderer/runtime/renderer-runtime";

export function createRegisteredCapabilityRegistry(renderer?: RendererRuntime, parserServerUrl?: string) {
  const registry = createCapabilityRegistry();
  registry.register(createWebsiteImportCapability(renderer, parserServerUrl ? { parserServerUrl } : {}));
  registry.register(createBrowserSnapshotImportCapability(renderer));
  if (renderer) registry.register(createRenderDesignIrCapability(renderer));
  return registry;
}
