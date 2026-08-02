import { z } from "zod";

export const browserSnapshotImportInputSchema = z
  .object({
    snapshotJson: z.string().trim().min(1).max(80_000_000),
    options: z.object({
      includeScreenshotReference: z.boolean().default(true),
      includeEditableLayers: z.boolean().default(true)
    }).strict().default({})
  })
  .strict();

export type BrowserSnapshotImportInput = z.input<typeof browserSnapshotImportInputSchema>;
