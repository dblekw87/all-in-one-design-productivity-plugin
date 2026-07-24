import {
  PluginMessageType,
  type CapabilityListRequest,
  type PluginResponse
} from "@aio/shared-contracts";
import type { CapabilityRegistry } from "../../capabilities/capability-registry";
import type { MessageHandler } from "../handler-registry";
import { createMessageEnvelope } from "../message-router";

export function createCapabilityListHandler(
  capabilityRegistry: CapabilityRegistry
): MessageHandler<CapabilityListRequest> {
  return {
    type: PluginMessageType.CAPABILITY_LIST_REQUEST,
    handle(): PluginResponse {
      return createMessageEnvelope(PluginMessageType.CAPABILITY_LIST_RESPONSE, {
        capabilities: capabilityRegistry.list()
      });
    }
  };
}
