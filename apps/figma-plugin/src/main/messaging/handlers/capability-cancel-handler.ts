import {
  PluginMessageType,
  type CapabilityCancelRequest,
  type PluginResponse
} from "@aio/shared-contracts";
import type { CapabilityRunner } from "../../capabilities/capability-runner";
import type { MessageHandler } from "../handler-registry";
import { createMessageEnvelope } from "../message-router";

export function createCapabilityCancelHandler(
  capabilityRunner: CapabilityRunner
): MessageHandler<CapabilityCancelRequest> {
  return {
    type: PluginMessageType.CAPABILITY_CANCEL_REQUEST,
    handle(request): PluginResponse {
      return createMessageEnvelope(PluginMessageType.CAPABILITY_CANCEL_RESPONSE, {
        ...capabilityRunner.cancel(request.payload.operationId)
      });
    }
  };
}
