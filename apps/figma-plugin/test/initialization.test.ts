import { describe, expect, it } from "vitest";
import { MESSAGE_PROTOCOL_VERSION, PluginMessageType, createMessageId } from "@aio/shared-contracts";
import { createRegisteredCapabilityRegistry } from "../src/main/bootstrap/registry";
import { createRegisteredMessageHandlerRegistry } from "../src/main/messaging/register-handlers";
import { createMessageRouter } from "../src/main/messaging/message-router";
import type { SelectionSummaryProvider } from "../src/main/selection/selection-summary";
import { createCapabilityRunner } from "../src/main/capabilities/capability-runner";
import { createOperationRegistry } from "../src/main/capabilities/operation-registry";

const selectionProvider: SelectionSummaryProvider = {
  getSelectionSummary() {
    return {
      selectionCount: 0,
      nodeTypes: [],
      textNodeCount: 0,
      frameNodeCount: 0,
      componentNodeCount: 0,
      instanceNodeCount: 0,
      pageId: "page-1",
      version: 0,
      nodes: []
    };
  }
};

describe("initialization and capability handlers", () => {
  it("returns plugin version, selection summary, and Website Import metadata", async () => {
    const capabilityRegistry = createRegisteredCapabilityRegistry();
    const capabilityRunner = createCapabilityRunner({
      capabilityRegistry,
      operationRegistry: createOperationRegistry(),
      getSelection: selectionProvider.getSelectionSummary,
      createProgressReporter() {
        return { report() {} };
      }
    });
    const handlerRegistry = createRegisteredMessageHandlerRegistry(
      capabilityRegistry,
      selectionProvider,
      capabilityRunner
    );
    const router = createMessageRouter(handlerRegistry, { pluginVersion: "0.0.0" });

    const response = await router.route({
      protocolVersion: MESSAGE_PROTOCOL_VERSION,
      messageId: createMessageId(),
      type: PluginMessageType.PLUGIN_INITIALIZE_REQUEST,
      timestamp: new Date().toISOString(),
      payload: {}
    });

    expect(response.type).toBe(PluginMessageType.PLUGIN_INITIALIZE_RESPONSE);
    if (response.type === PluginMessageType.PLUGIN_INITIALIZE_RESPONSE) {
      expect(response.payload.pluginVersion).toBe("0.0.0");
      expect(response.payload.selection.selectionCount).toBe(0);
      expect(response.payload.capabilities.map((capability) => capability.id)).toEqual(["website-import"]);
    }
  });

  it("returns only registered enabled capabilities", async () => {
    const capabilityRegistry = createRegisteredCapabilityRegistry();
    const capabilityRunner = createCapabilityRunner({
      capabilityRegistry,
      operationRegistry: createOperationRegistry(),
      getSelection: selectionProvider.getSelectionSummary,
      createProgressReporter() {
        return { report() {} };
      }
    });
    const handlerRegistry = createRegisteredMessageHandlerRegistry(
      capabilityRegistry,
      selectionProvider,
      capabilityRunner
    );
    const router = createMessageRouter(handlerRegistry, { pluginVersion: "0.0.0" });

    const response = await router.route({
      protocolVersion: MESSAGE_PROTOCOL_VERSION,
      messageId: createMessageId(),
      type: PluginMessageType.CAPABILITY_LIST_REQUEST,
      timestamp: new Date().toISOString(),
      payload: {}
    });

    expect(response.type).toBe(PluginMessageType.CAPABILITY_LIST_RESPONSE);
    if (response.type === PluginMessageType.CAPABILITY_LIST_RESPONSE) {
      expect(response.payload.capabilities).toHaveLength(1);
      expect(response.payload.capabilities[0]?.id).toBe("website-import");
    }
  });
});
