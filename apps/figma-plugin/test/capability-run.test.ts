import { describe, expect, it } from "vitest";
import {
  MESSAGE_PROTOCOL_VERSION,
  PluginMessageType,
  createMessageId,
  createOperationId
} from "@aio/shared-contracts";
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

describe("capability run skeleton", () => {
  function createRouter() {
    const capabilityRegistry = createRegisteredCapabilityRegistry();
    const capabilityRunner = createCapabilityRunner({
      capabilityRegistry,
      operationRegistry: createOperationRegistry(),
      getSelection: selectionProvider.getSelectionSummary,
      createProgressReporter() {
        return { report() {} };
      }
    });
    return createMessageRouter(
      createRegisteredMessageHandlerRegistry(capabilityRegistry, selectionProvider, capabilityRunner),
      { pluginVersion: "0.0.0" }
    );
  }

  it("returns capability not found for unknown capability ids", async () => {
    const router = createRouter();
    const requestId = createMessageId();
    const response = await router.route({
      protocolVersion: MESSAGE_PROTOCOL_VERSION,
      messageId: requestId,
      type: PluginMessageType.CAPABILITY_RUN_REQUEST,
      timestamp: new Date().toISOString(),
      payload: { capabilityId: "missing", operationId: createOperationId(), input: {} }
    });

    expect(response.type).toBe(PluginMessageType.CAPABILITY_RUN_RESPONSE);
    if (response.type === PluginMessageType.CAPABILITY_RUN_RESPONSE) {
      expect(response.payload.result.failures[0]?.code).toBe("CAPABILITY_NOT_FOUND");
    }
    expect(response.correlationId).toBe(requestId);
  });

  it("returns NOT_IMPLEMENTED for Website Import", async () => {
    const router = createRouter();
    const response = await router.route({
      protocolVersion: MESSAGE_PROTOCOL_VERSION,
      messageId: createMessageId(),
      type: PluginMessageType.CAPABILITY_RUN_REQUEST,
      timestamp: new Date().toISOString(),
      payload: {
        capabilityId: "website-import",
        operationId: createOperationId(),
        input: { url: "https://example.com" }
      }
    });

    expect(response.type).toBe(PluginMessageType.CAPABILITY_RUN_RESPONSE);
    if (response.type === PluginMessageType.CAPABILITY_RUN_RESPONSE) {
      expect(response.payload.result.failures[0]?.code).toBe("NOT_IMPLEMENTED");
    }
  });

  it("routes cancel requests through the capability runner", async () => {
    const router = createRouter();
    const operationId = createOperationId();
    const response = await router.route({
      protocolVersion: MESSAGE_PROTOCOL_VERSION,
      messageId: createMessageId(),
      type: PluginMessageType.CAPABILITY_CANCEL_REQUEST,
      timestamp: new Date().toISOString(),
      payload: { operationId }
    });

    expect(response.type).toBe(PluginMessageType.CAPABILITY_CANCEL_RESPONSE);
    if (response.type === PluginMessageType.CAPABILITY_CANCEL_RESPONSE) {
      expect(response.payload).toEqual({
        operationId,
        cancelled: false,
        reason: "No running operation found."
      });
    }
  });
});
