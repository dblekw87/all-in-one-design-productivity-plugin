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
import { createRendererRegistry } from "../renderer/runtime/node-factory";
import { createRendererRuntime } from "../renderer/runtime/renderer-runtime";
import { createFigmaRendererAdapter } from "../renderer/runtime/figma-adapter";
import { documentNodeFactory } from "../renderer/factories/document-node-factory";
import { frameNodeFactory } from "../renderer/factories/frame-node-factory";
import { textPlaceholderFactory } from "../renderer/factories/text-placeholder-factory";
import { imagePlaceholderFactory } from "../renderer/factories/image-placeholder-factory";
import { vectorNodeFactory } from "../renderer/factories/vector-node-factory";
import { unsupportedNodeFactory } from "../renderer/factories/unsupported-node-factory";
import { createProductionFigmaImageAdapter } from "../renderer/runtime/figma-image-adapter";
import { createProductionFigmaSvgAdapter } from "../renderer/runtime/figma-svg-adapter";
import { createHttpAssetClient } from "../assets/client/http-asset-client";
import { getParserServerUrl } from "../config/parser-server";

export interface PluginRuntime {
  start(): void;
}

export function createPluginRuntime(): PluginRuntime {
  const rendererRegistry = createRendererRegistry();
  rendererRegistry.register(documentNodeFactory);
  rendererRegistry.register(frameNodeFactory);
  rendererRegistry.register(textPlaceholderFactory);
  rendererRegistry.register(imagePlaceholderFactory);
  rendererRegistry.register(vectorNodeFactory);
  rendererRegistry.register(unsupportedNodeFactory);
  const parserOrigin = getParserServerUrl();
  const renderer = createRendererRuntime(rendererRegistry, createFigmaRendererAdapter(), {}, Date.now, { client: createHttpAssetClient({ baseUrl: parserOrigin }), imageAdapter: createProductionFigmaImageAdapter(), svgAdapter: createProductionFigmaSvgAdapter() });
  const capabilityRegistry = createRegisteredCapabilityRegistry(renderer, parserOrigin);
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
