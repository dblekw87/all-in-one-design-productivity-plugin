import { z } from "zod";

export const websiteImportInputSchema = z
  .object({
    url: z.string().url()
  })
  .strict()
  .refine((input) => input.url.startsWith("https://"), {
    message: "Website Import currently accepts HTTPS URLs only.",
    path: ["url"]
  });

export type WebsiteImportInput = z.infer<typeof websiteImportInputSchema>;
