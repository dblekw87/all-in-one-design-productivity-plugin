import {
  MESSAGE_PROTOCOL_VERSION,
  PluginMessageType,
  type PluginInitializeRequest,
  type PluginResponse
} from "@aio/shared-contracts";
import type { CapabilityRegistry } from "../../capabilities/capability-registry";
import { createMessageEnvelope } from "../message-router";
import type { SelectionSummaryProvider } from "../../selection/selection-summary";
import type { MessageHandler, MessageHandlerContext } from "../handler-registry";

export function createInitializeHandler(
  capabilityRegistry: CapabilityRegistry,
  selectionProvider: SelectionSummaryProvider
): MessageHandler<PluginInitializeRequest> {
  return {
    type: PluginMessageType.PLUGIN_INITIALIZE_REQUEST,
    handle(_request: PluginInitializeRequest, context: MessageHandlerContext): PluginResponse {
      return createMessageEnvelope(PluginMessageType.PLUGIN_INITIALIZE_RESPONSE, {
        pluginVersion: context.pluginVersion,
        protocolVersion: MESSAGE_PROTOCOL_VERSION,
        capabilities: capabilityRegistry.list(),
        selection: selectionProvider.getSelectionSummary()
      });
    }
  };
}
