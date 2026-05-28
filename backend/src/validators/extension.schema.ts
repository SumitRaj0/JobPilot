import { z } from "zod";

const platformSchema = z.enum(["naukri", "linkedin"]);

export const pageMetadataSchema = z.object({
  platform: platformSchema,
  url: z.string().url(),
  title: z.string(),
  hostname: z.string(),
  pageType: z.string(),
  extractedAt: z.string(),
  extras: z.record(z.string()).optional(),
});
