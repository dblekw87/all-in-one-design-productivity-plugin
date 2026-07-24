import { PluginMessageType, type SelectionChangedEvent } from "@aio/shared-contracts";
import { createMessageEnvelope } from "../messaging/message-router";
import {
  createSelectionSignature,
  createSelectionSummary,
  type SelectionSummaryProvider
} from "./selection-summary";

export interface SelectionSubscription {
  provider: SelectionSummaryProvider;
  emitCurrentSelection(): void;
}

export function createSelectionSubscription(postEvent: (event: SelectionChangedEvent) => void): SelectionSubscription {
  let version = 0;
  let lastSignature = "";

  const provider: SelectionSummaryProvider = {
    getSelectionSummary() {
      return createSelectionSummary(figma.currentPage.selection, figma.currentPage.id, version);
    }
  };

  const emitCurrentSelection = () => {
    const signature = createSelectionSignature(figma.currentPage.selection, figma.currentPage.id);
    if (signature === lastSignature) {
      return;
    }

    lastSignature = signature;
    version += 1;
    postEvent(
      createMessageEnvelope(PluginMessageType.SELECTION_CHANGED_EVENT, {
        selection: provider.getSelectionSummary()
      })
    );
  };

  figma.on("selectionchange", emitCurrentSelection);

  return { provider, emitCurrentSelection };
}
