import type { PluginRequest, PluginResponse } from "@aio/shared-contracts";

export interface MessageHandlerContext {
  pluginVersion: string;
}

export interface MessageHandler<TRequest extends PluginRequest = PluginRequest> {
  type: TRequest["type"];
  handle(request: TRequest, context: MessageHandlerContext): Promise<PluginResponse> | PluginResponse;
}

export interface MessageHandlerRegistry {
  register(handler: MessageHandler): void;
  get(type: PluginRequest["type"]): MessageHandler | undefined;
  has(type: PluginRequest["type"]): boolean;
}

export function createMessageHandlerRegistry(): MessageHandlerRegistry {
  const handlers = new Map<PluginRequest["type"], MessageHandler>();

  return {
    register(handler) {
      if (handlers.has(handler.type)) {
        throw new Error(`Message handler already registered: ${handler.type}`);
      }

      handlers.set(handler.type, handler);
    },
    get(type) {
      return handlers.get(type);
    },
    has(type) {
      return handlers.has(type);
    }
  };
}
