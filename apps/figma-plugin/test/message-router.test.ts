import { describe, expect, it } from "vitest";
import {
  MESSAGE_PROTOCOL_VERSION,
  PluginMessageType,
  createMessageId,
  createOperationId,
  type PluginResponse
} from "@aio/shared-contracts";
import { createMessageHandlerRegistry, type MessageHandler } from "../src/main/messaging/handler-registry";
import { createMessageRouter, createMessageEnvelope } from "../src/main/messaging/message-router";

function createRequest(type: string, payload: unknown = {}) {
  return {
    protocolVersion: MESSAGE_PROTOCOL_VERSION,
    messageId: createMessageId(),
    type,
    timestamp: new Date().toISOString(),
    payload
  };
}

describe("message router", () => {
  it("executes a registered handler and links correlationId", async () => {
    const registry = createMessageHandlerRegistry();
    const handler: MessageHandler = {
      type: PluginMessageType.CAPABILITY_LIST_REQUEST,
      handle(): PluginResponse {
        return createMessageEnvelope(PluginMessageType.CAPABILITY_LIST_RESPONSE, { capabilities: [] });
      }
    };
    registry.register(handler);

    const request = createRequest(PluginMessageType.CAPABILITY_LIST_REQUEST);
    const response = await createMessageRouter(registry, { pluginVersion: "0.0.0" }).route(request);

    expect(response.type).toBe(PluginMessageType.CAPABILITY_LIST_RESPONSE);
    expect(response.correlationId).toBe(request.messageId);
  });

  it("returns unsupported message errors for unregistered request types", async () => {
    const registry = createMessageHandlerRegistry();
    const request = createRequest(PluginMessageType.CAPABILITY_LIST_REQUEST);
    const response = await createMessageRouter(registry, { pluginVersion: "0.0.0" }).route(request);

    expect(response.type).toBe(PluginMessageType.PLUGIN_ERROR_RESPONSE);
    if (response.type === PluginMessageType.PLUGIN_ERROR_RESPONSE) {
      expect(response.payload.error.code).toBe("UNSUPPORTED_MESSAGE_TYPE");
    }
    expect(response.correlationId).toBe(request.messageId);
  });

  it("returns malformed message errors without throwing", async () => {
    const registry = createMessageHandlerRegistry();
    const response = await createMessageRouter(registry, { pluginVersion: "0.0.0" }).route({
      type: PluginMessageType.CAPABILITY_LIST_REQUEST
    });

    expect(response.type).toBe(PluginMessageType.PLUGIN_ERROR_RESPONSE);
    if (response.type === PluginMessageType.PLUGIN_ERROR_RESPONSE) {
      expect(response.payload.error.code).toBe("INVALID_MESSAGE");
    }
  });

  it("serializes handler exceptions", async () => {
    const registry = createMessageHandlerRegistry();
    registry.register({
      type: PluginMessageType.CAPABILITY_CANCEL_REQUEST,
      handle() {
        throw new Error("boom");
      }
    });

    const request = createRequest(PluginMessageType.CAPABILITY_CANCEL_REQUEST, {
      operationId: createOperationId()
    });
    const response = await createMessageRouter(registry, { pluginVersion: "0.0.0" }).route(request);

    expect(response.type).toBe(PluginMessageType.PLUGIN_ERROR_RESPONSE);
    if (response.type === PluginMessageType.PLUGIN_ERROR_RESPONSE) {
      expect(response.payload.error.code).toBe("HANDLER_EXECUTION_FAILED");
    }
  });

  it("rejects duplicate handler registration", () => {
    const registry = createMessageHandlerRegistry();
    const handler: MessageHandler = {
      type: PluginMessageType.CAPABILITY_LIST_REQUEST,
      handle(): PluginResponse {
        return createMessageEnvelope(PluginMessageType.CAPABILITY_LIST_RESPONSE, { capabilities: [] });
      }
    };

    registry.register(handler);
    expect(() => registry.register(handler)).toThrow("Message handler already registered");
  });
});
