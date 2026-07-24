import { describe, expect, it, vi } from "vitest";
import {
  MESSAGE_PROTOCOL_VERSION,
  PluginMessageType,
  type IdGenerator,
  type PluginRequest
} from "@aio/shared-contracts";
import { createPluginMessageClient } from "../src/ui/messaging/plugin-message-client";

const idGenerator: IdGenerator = {
  nextMessageId: vi.fn(() => "msg_test" as const),
  nextOperationId: vi.fn(() => "op_test" as const)
};

function createResponse(correlationId: string) {
  return {
    protocolVersion: MESSAGE_PROTOCOL_VERSION,
    messageId: "msg_response",
    correlationId,
    type: PluginMessageType.CAPABILITY_LIST_RESPONSE,
    timestamp: new Date().toISOString(),
    payload: { capabilities: [] }
  };
}

describe("plugin message client", () => {
  it("matches responses by correlationId", async () => {
    let listener: ((event: MessageEvent<{ pluginMessage?: unknown }>) => void) | undefined;
    const postMessage = vi.fn();
    const client = createPluginMessageClient({
      idGenerator,
      postMessage,
      addEventListener: (_type: string, callback: EventListenerOrEventListenerObject) => {
        listener = callback as (event: MessageEvent<{ pluginMessage?: unknown }>) => void;
      },
      removeEventListener: vi.fn()
    });

    const promise = client.request(PluginMessageType.CAPABILITY_LIST_REQUEST, {});
    listener?.({ data: { pluginMessage: createResponse("msg_test") } } as MessageEvent<{
      pluginMessage?: unknown;
    }>);

    await expect(promise).resolves.toMatchObject({
      type: PluginMessageType.CAPABILITY_LIST_RESPONSE
    });
    expect(postMessage.mock.calls[0]?.[0].messageId).toBe("msg_test");
  });

  it("ignores mismatched correlationIds", async () => {
    vi.useFakeTimers();
    let listener: ((event: MessageEvent<{ pluginMessage?: unknown }>) => void) | undefined;
    const client = createPluginMessageClient({
      idGenerator,
      timeoutMs: 10,
      postMessage: vi.fn(),
      addEventListener: (_type: string, callback: EventListenerOrEventListenerObject) => {
        listener = callback as (event: MessageEvent<{ pluginMessage?: unknown }>) => void;
      },
      removeEventListener: vi.fn()
    });

    const promise = client.request(PluginMessageType.CAPABILITY_LIST_REQUEST, {});
    listener?.({ data: { pluginMessage: createResponse("msg_other") } } as MessageEvent<{
      pluginMessage?: unknown;
    }>);
    vi.advanceTimersByTime(11);

    await expect(promise).rejects.toMatchObject({ code: "MESSAGE_TIMEOUT" });
    vi.useRealTimers();
  });

  it("supports event subscribe and unsubscribe", () => {
    let listener: ((event: MessageEvent<{ pluginMessage?: unknown }>) => void) | undefined;
    const client = createPluginMessageClient({
      idGenerator,
      postMessage: vi.fn(),
      addEventListener: (_type: string, callback: EventListenerOrEventListenerObject) => {
        listener = callback as (event: MessageEvent<{ pluginMessage?: unknown }>) => void;
      },
      removeEventListener: vi.fn()
    });
    const callback = vi.fn();
    const unsubscribe = client.subscribe(PluginMessageType.SELECTION_CHANGED_EVENT, callback);

    const event = {
      protocolVersion: MESSAGE_PROTOCOL_VERSION,
      messageId: "msg_event",
      type: PluginMessageType.SELECTION_CHANGED_EVENT,
      timestamp: new Date().toISOString(),
      payload: {
        selection: {
          selectionCount: 0,
          nodeTypes: [],
          textNodeCount: 0,
          frameNodeCount: 0,
          componentNodeCount: 0,
          instanceNodeCount: 0,
          pageId: "page-1",
          version: 1,
          nodes: []
        }
      }
    };

    listener?.({ data: { pluginMessage: event } } as MessageEvent<{ pluginMessage?: unknown }>);
    unsubscribe();
    listener?.({ data: { pluginMessage: event } } as MessageEvent<{ pluginMessage?: unknown }>);

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("cleans pending requests on dispose", async () => {
    const client = createPluginMessageClient({
      idGenerator,
      postMessage: vi.fn((message: PluginRequest) => message),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    });

    const promise = client.request(PluginMessageType.CAPABILITY_LIST_REQUEST, {});
    client.dispose();

    await expect(promise).rejects.toMatchObject({ code: "INTERNAL_ERROR" });
  });
});
