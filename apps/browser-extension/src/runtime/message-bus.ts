import type { ExtensionRequest, ExtensionResponse } from "../contracts/messages.js";

const messageTypes = new Set<ExtensionRequest["type"]>([
  "PING",
  "GET_RUNTIME_STATUS",
  "GET_PAGE_METADATA",
  "START_CAPTURE",
  "CANCEL_CAPTURE",
  "GET_EXTENSION_INFO"
]);

export type ExtensionMessageHandler = (request: ExtensionRequest) => Promise<ExtensionResponse>;

export function isExtensionRequest(value: unknown): value is ExtensionRequest {
  if (!value || typeof value !== "object") return false;
  const candidate = value as { type?: unknown; payload?: unknown };
  return typeof candidate.type === "string" && messageTypes.has(candidate.type as ExtensionRequest["type"]) && "payload" in candidate;
}

export function createMessageError(code: string, message: string, retryable = false) {
  return { code, message, retryable };
}
