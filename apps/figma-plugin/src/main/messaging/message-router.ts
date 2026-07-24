import {
  MESSAGE_PROTOCOL_VERSION,
  PluginMessageType,
  createMessageId,
  safeParsePluginRequest,
  type MessageEnvelope,
  type MessageId,
  type PluginRequest,
  type PluginResponse,
  type SerializableError
} from "@aio/shared-contracts";
import { serializeError } from "./error-serializer";
import type { MessageHandlerContext, MessageHandlerRegistry } from "./handler-registry";

export interface MessageRouter {
  route(rawMessage: unknown): Promise<PluginResponse>;
}

export function createMessageEnvelope<TType extends string, TPayload>(
  type: TType,
  payload: TPayload,
  correlationId?: PluginRequest["messageId"]
): MessageEnvelope<TType, TPayload> {
  const envelope: MessageEnvelope<TType, TPayload> = {
    protocolVersion: MESSAGE_PROTOCOL_VERSION,
    messageId: createMessageId(),
    type,
    timestamp: new Date().toISOString(),
    payload
  };
  if (correlationId) {
    envelope.correlationId = correlationId;
  }
  return envelope;
}

export function createPluginErrorResponse(
  error: SerializableError,
  correlationId?: PluginRequest["messageId"]
): PluginResponse {
  return createMessageEnvelope(PluginMessageType.PLUGIN_ERROR_RESPONSE, { error }, correlationId);
}

export function createMessageRouter(
  registry: MessageHandlerRegistry,
  context: MessageHandlerContext
): MessageRouter {
  return {
    async route(rawMessage) {
      const parsed = safeParsePluginRequest(rawMessage);

      if (!parsed.success) {
        return createPluginErrorResponse({
          code: "INVALID_MESSAGE",
          message: "Received an invalid plugin message.",
          retryable: false,
          details: { issues: parsed.error.issues.map((issue) => ({ path: issue.path, message: issue.message })) }
        });
      }

      const request = parsed.data;
      const handler = registry.get(request.type);

      if (!handler) {
        return createPluginErrorResponse(
          {
            code: "UNSUPPORTED_MESSAGE_TYPE",
            message: `Unsupported message type: ${request.type}`,
            retryable: false
          },
          request.messageId
        );
      }

      try {
        const response = await handler.handle(request, context);
        return { ...response, correlationId: request.messageId as MessageId } as PluginResponse;
      } catch (error) {
        return createPluginErrorResponse(serializeError(error, "HANDLER_EXECUTION_FAILED"), request.messageId);
      }
    }
  };
}
