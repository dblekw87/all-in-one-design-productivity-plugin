import { z } from "zod";

export const renderDesignIrInputSchema = z.object({
  document: z.unknown(),
  assetTransfer: z.unknown().optional(),
  options: z.object({
    placement: z.enum(["CURRENT_VIEWPORT", "PAGE_ORIGIN", "SELECTION_OFFSET"]).default("CURRENT_VIEWPORT"),
    placeholderPolicy: z.enum(["CREATE", "SKIP"]).default("CREATE"),
    rollbackOnError: z.boolean().default(true),
    selectRootOnComplete: z.boolean().default(true),
    assetFailurePolicy: z.enum(["PLACEHOLDER", "FAIL_RENDER"]).default("PLACEHOLDER")
  }).strict().default({})
}).strict();

export type RenderDesignIrInput = z.input<typeof renderDesignIrInputSchema>;
export interface ValidatedRenderDesignIrInput {
  document: unknown;
  assetTransfer?: unknown;
  options: {
    placement: "CURRENT_VIEWPORT" | "PAGE_ORIGIN" | "SELECTION_OFFSET";
    placeholderPolicy: "CREATE" | "SKIP";
    rollbackOnError: boolean;
    selectRootOnComplete: boolean;
    assetFailurePolicy: "PLACEHOLDER" | "FAIL_RENDER";
  };
}
