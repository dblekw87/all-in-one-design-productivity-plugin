import type { CapabilityCategory, CapabilityMetadata } from "@aio/shared-contracts";
import type { PluginCapability } from "./contracts";

export interface CapabilityRegistry {
  register(capability: PluginCapability): void;
  get(id: string): PluginCapability | undefined;
  list(): CapabilityMetadata[];
  listByCategory(category: CapabilityCategory): CapabilityMetadata[];
}

export function createCapabilityRegistry(): CapabilityRegistry {
  const capabilities = new Map<string, PluginCapability>();

  return {
    register(capability) {
      if (capabilities.has(capability.metadata.id)) {
        throw new Error(`Capability already registered: ${capability.metadata.id}`);
      }

      capabilities.set(capability.metadata.id, capability);
    },
    get(id) {
      return capabilities.get(id);
    },
    list() {
      return [...capabilities.values()]
        .map((capability) => capability.metadata)
        .filter((metadata) => metadata.enabled)
        .sort((left, right) => left.order - right.order);
    },
    listByCategory(category) {
      return this.list().filter((metadata) => metadata.category === category);
    }
  };
}
