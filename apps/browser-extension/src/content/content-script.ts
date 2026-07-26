import type { ExtensionRequest, ExtensionResponse } from "../contracts/messages.js";
import "../shared/chrome-types.js";
import { collectPageMetadata } from "./page-metadata.js";

chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
  const request = message as Partial<ExtensionRequest>;
  if (request.type === "PING") {
    sendResponse({ type: "PING", payload: { ok: true, version: "content-script" } } satisfies ExtensionResponse);
    return false;
  }
  if (request.type === "GET_PAGE_METADATA") {
    sendResponse({
      type: "GET_PAGE_METADATA",
      payload: { ok: true, metadata: collectPageMetadata() }
    } satisfies ExtensionResponse);
    return false;
  }
  return false;
});
