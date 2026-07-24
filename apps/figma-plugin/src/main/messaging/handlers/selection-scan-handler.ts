import {
  PluginMessageType,
  type PluginResponse,
  type SelectionScanRequest
} from "@aio/shared-contracts";
import type { SelectionSummaryProvider } from "../../selection/selection-summary";
import type { MessageHandler } from "../handler-registry";
import { createMessageEnvelope } from "../message-router";

export function createSelectionScanHandler(
  selectionProvider: SelectionSummaryProvider
): MessageHandler<SelectionScanRequest> {
  return {
    type: PluginMessageType.SELECTION_SCAN_REQUEST,
    handle(): PluginResponse {
      return createMessageEnvelope(PluginMessageType.SELECTION_SCAN_RESPONSE, {
        selection: selectionProvider.getSelectionSummary()
      });
    }
  };
}
