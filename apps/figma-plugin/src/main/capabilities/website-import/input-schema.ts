import { z } from "zod";

export const websiteImportInputSchema = z
  .object({
    // Do not use z.string().url() in the Figma Main sandbox. Zod's URL
    // validation can depend on the host URL implementation, which is not
    // available consistently there. The scheme/authority policy below is
    // intentionally self-contained.
    url: z.string().trim().min(1).max(2048)
  })
  .strict()
  .refine((input) => {
    const schemeEnd = input.url.indexOf("://");
    if (schemeEnd <= 0) return false;
    const protocol = input.url.slice(0, schemeEnd).toLowerCase();
    if (protocol === "https") return true;
    if (protocol !== "http") return false;
    const authority = input.url.slice(schemeEnd + 3).split(/[/?#]/, 1)[0] ?? "";
    const hostname = authority.replace(/^\[[^\]]+\]/, "").split(":", 1)[0]?.toLowerCase() ?? "";
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
  }, {
    message: "Website Import accepts HTTPS URLs or local HTTP development URLs.",
    path: ["url"]
  });

export type WebsiteImportInput = z.infer<typeof websiteImportInputSchema>;
