import {
  MESSAGE_PROTOCOL_VERSION,
  PluginMessageType,
  type PluginEvent,
  type PluginResponse
} from "@aio/shared-contracts";
import { createRegisteredCapabilityRegistry } from "./registry";
import { createCapabilityRunner } from "../capabilities/capability-runner";
import { createOperationRegistry } from "../capabilities/operation-registry";
import { createProgressReporter } from "../capabilities/progress-reporter";
import { createRegisteredMessageHandlerRegistry } from "../messaging/register-handlers";
import { createMessageRouter, createMessageEnvelope } from "../messaging/message-router";
import { createSelectionSubscription } from "../selection/selection-subscription";

export interface PluginRuntime {
  start(): void;
}

export function createPluginRuntime(): PluginRuntime {
  const capabilityRegistry = createRegisteredCapabilityRegistry();
  const operationRegistry = createOperationRegistry();

  const postMessage = (message: PluginResponse | PluginEvent) => {
    figma.ui.postMessage(message);
  };

  const selectionSubscription = createSelectionSubscription((event) => postMessage(event));
  const capabilityRunner = createCapabilityRunner({
    capabilityRegistry,
    operationRegistry,
    getSelection: selectionSubscription.provider.getSelectionSummary,
    createProgressReporter(operationId, capabilityId) {
      return createProgressReporter(operationId, capabilityId, (event) => postMessage(event));
    }
  });
  const handlerRegistry = createRegisteredMessageHandlerRegistry(
    capabilityRegistry,
    selectionSubscription.provider,
    capabilityRunner
  );

  const router = createMessageRouter(handlerRegistry, {
    pluginVersion: "0.0.0"
  });

  return {
    start() {
      figma.showUI(__html__, { width: 380, height: 300, themeColors: true });

      figma.ui.onmessage = (message: unknown) => {
        void router.route(message).then(postMessage);
      };

      postMessage(
        createMessageEnvelope(PluginMessageType.PLUGIN_READY_EVENT, {
          pluginVersion: "0.0.0",
          protocolVersion: MESSAGE_PROTOCOL_VERSION,
          capabilities: capabilityRegistry.list(),
          selection: selectionSubscription.provider.getSelectionSummary()
        })
      );
    }
  };
}
