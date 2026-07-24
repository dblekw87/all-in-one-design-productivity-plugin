import { z } from "zod";

export const renderDesignIrInputSchema = z.object({
  document: z.unknown(),
  options: z.object({
    placement: z.enum(["CURRENT_VIEWPORT", "PAGE_ORIGIN", "SELECTION_OFFSET"]).default("CURRENT_VIEWPORT"),
    placeholderPolicy: z.enum(["CREATE", "SKIP"]).default("CREATE"),
    rollbackOnError: z.boolean().default(true),
    selectRootOnComplete: z.boolean().default(true)
  }).strict().default({})
}).strict();

export type RenderDesignIrInput = z.input<typeof renderDesignIrInputSchema>;
export interface ValidatedRenderDesignIrInput {
  document: unknown;
  options: {
    placement: "CURRENT_VIEWPORT" | "PAGE_ORIGIN" | "SELECTION_OFFSET";
    placeholderPolicy: "CREATE" | "SKIP";
    rollbackOnError: boolean;
    selectRootOnComplete: boolean;
  };
}
