import type { DesignIrDocument } from "@aio/design-ir";
import type { AssetTransferSessionResponse } from "@aio/shared-contracts";

export interface RenderDesignIrRequest {
  document: DesignIrDocument;
  assetTransfer?: AssetTransferSessionResponse;
  options: {
    placement: "CURRENT_VIEWPORT" | "PAGE_ORIGIN" | "SELECTION_OFFSET";
    placeholderPolicy: "CREATE" | "SKIP";
    rollbackOnError: boolean;
    selectRootOnComplete: boolean;
    assetFailurePolicy?: "PLACEHOLDER" | "FAIL_RENDER";
  };
}
