import type { DesignIrDocument } from "@aio/design-ir";

export interface RenderDesignIrRequest {
  document: DesignIrDocument;
  options: {
    placement: "CURRENT_VIEWPORT" | "PAGE_ORIGIN" | "SELECTION_OFFSET";
    placeholderPolicy: "CREATE" | "SKIP";
    rollbackOnError: boolean;
    selectRootOnComplete: boolean;
  };
}
