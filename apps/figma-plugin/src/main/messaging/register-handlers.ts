import type { CapabilityRegistry } from "../capabilities/capability-registry";
import type { CapabilityRunner } from "../capabilities/capability-runner";
import type { SelectionSummaryProvider } from "../selection/selection-summary";
import { createCapabilityCancelHandler } from "./handlers/capability-cancel-handler";
import { createCapabilityListHandler } from "./handlers/capability-list-handler";
import { createCapabilityRunHandler } from "./handlers/capability-run-handler";
import { createInitializeHandler } from "./handlers/initialize-handler";
import { createSelectionScanHandler } from "./handlers/selection-scan-handler";
import { createMessageHandlerRegistry } from "./handler-registry";

export function createRegisteredMessageHandlerRegistry(
  capabilityRegistry: CapabilityRegistry,
  selectionProvider: SelectionSummaryProvider,
  capabilityRunner: CapabilityRunner
) {
  const registry = createMessageHandlerRegistry();
  registry.register(createInitializeHandler(capabilityRegistry, selectionProvider));
  registry.register(createCapabilityListHandler(capabilityRegistry));
  registry.register(createSelectionScanHandler(selectionProvider));
  registry.register(createCapabilityRunHandler(capabilityRunner));
  registry.register(createCapabilityCancelHandler(capabilityRunner));
  return registry;
}
