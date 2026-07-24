import {
  PluginMessageType,
  type CapabilityRunRequest,
  type PluginResponse
} from "@aio/shared-contracts";
import type { CapabilityRunner } from "../../capabilities/capability-runner";
import type { MessageHandler } from "../handler-registry";
import { createMessageEnvelope } from "../message-router";

export function createCapabilityRunHandler(
  capabilityRunner: CapabilityRunner
): MessageHandler<CapabilityRunRequest> {
  return {
    type: PluginMessageType.CAPABILITY_RUN_REQUEST,
    async handle(request): Promise<PluginResponse> {
      return createMessageEnvelope(PluginMessageType.CAPABILITY_RUN_RESPONSE, {
        result: await capabilityRunner.run(request.payload)
      });
    }
  };
}
