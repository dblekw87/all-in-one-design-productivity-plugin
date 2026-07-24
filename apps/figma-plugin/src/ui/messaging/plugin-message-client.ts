import {
  MESSAGE_PROTOCOL_VERSION,
  PluginMessageType,
  createDefaultIdGenerator,
  safeParsePluginEvent,
  safeParsePluginResponse,
  type IdGenerator,
  type MessageEnvelope,
  type PluginEvent,
  type PluginRequest,
  type PluginResponse,
  type SerializableError
} from "@aio/shared-contracts";

export interface PluginMessageClient {
  request<TType extends PluginRequest["type"]>(
    type: TType,
    payload: Extract<PluginRequest, { type: TType }>["payload"],
    options?: { timeoutMs?: number }
  ): Promise<PluginResponse>;
  subscribe<TEvent extends PluginEvent>(
    type: TEvent["type"],
    listener: (event: TEvent) => void
  ): () => void;
  dispose(): void;
}

interface PendingRequest {
  resolve(response: PluginResponse): void;
  reject(error: SerializableError): void;
  timeoutId: ReturnType<typeof setTimeout>;
}

export interface PluginMessageClientOptions {
  idGenerator?: IdGenerator;
  timeoutMs?: number;
  postMessage?: (message: PluginRequest) => void;
  addEventListener?: typeof window.addEventListener;
  removeEventListener?: typeof window.removeEventListener;
}

export function createPluginMessageClient(options: PluginMessageClientOptions = {}): PluginMessageClient {
  const idGenerator = options.idGenerator ?? createDefaultIdGenerator();
  const defaultTimeoutMs = options.timeoutMs ?? 10_000;
  const pending = new Map<string, PendingRequest>();
  const listeners = new Map<PluginEvent["type"], Set<(event: PluginEvent) => void>>();
  const postMessage =
    options.postMessage ??
    ((message: PluginRequest) => {
      parent.postMessage({ pluginMessage: message }, "*");
    });
  const addEventListener = options.addEventListener ?? window.addEventListener.bind(window);
  const removeEventListener = options.removeEventListener ?? window.removeEventListener.bind(window);

  const receiveMessage = (event: MessageEvent<{ pluginMessage?: unknown }>) => {
    const rawMessage = event.data.pluginMessage;
    const responseResult = safeParsePluginResponse(rawMessage);

    if (responseResult.success) {
      handleResponse(responseResult.data);
      return;
    }

    const eventResult = safeParsePluginEvent(rawMessage);
    if (eventResult.success) {
      handleEvent(eventResult.data);
    }
  };

  const handleResponse = (response: PluginResponse) => {
    if (!response.correlationId) {
      return;
    }

    const pendingRequest = pending.get(response.correlationId);
    if (!pendingRequest) {
      return;
    }

    clearTimeout(pendingRequest.timeoutId);
    pending.delete(response.correlationId);
    pendingRequest.resolve(response);
  };

  const handleEvent = (event: PluginEvent) => {
    listeners.get(event.type)?.forEach((listener) => listener(event));
  };

  addEventListener("message", receiveMessage);

  return {
    request(type, payload, requestOptions) {
      const messageId = idGenerator.nextMessageId();
      const request = {
        protocolVersion: MESSAGE_PROTOCOL_VERSION,
        messageId,
        type,
        timestamp: new Date().toISOString(),
        payload
      } as MessageEnvelope<typeof type, typeof payload> as PluginRequest;

      return new Promise<PluginResponse>((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          pending.delete(messageId);
          reject({
            code: "MESSAGE_TIMEOUT",
            message: `Timed out waiting for response to ${type}.`,
            retryable: true
          });
        }, requestOptions?.timeoutMs ?? defaultTimeoutMs);

        pending.set(messageId, {
          resolve,
          reject,
          timeoutId
        });

        postMessage(request);
      });
    },
    subscribe(type, listener) {
      const existing = listeners.get(type) ?? new Set();
      existing.add(listener as (event: PluginEvent) => void);
      listeners.set(type, existing);

      return () => {
        const current = listeners.get(type);
        current?.delete(listener as (event: PluginEvent) => void);
        if (current?.size === 0) {
          listeners.delete(type);
        }
      };
    },
    dispose() {
      removeEventListener("message", receiveMessage);
      pending.forEach((pendingRequest) => {
        clearTimeout(pendingRequest.timeoutId);
        pendingRequest.reject({
          code: "INTERNAL_ERROR",
          message: "Plugin message client was disposed.",
          retryable: false
        });
      });
      pending.clear();
      listeners.clear();
    }
  };
}

export function createInitializeRequestPayload() {
  return {};
}

export const initializeRequestType = PluginMessageType.PLUGIN_INITIALIZE_REQUEST;
