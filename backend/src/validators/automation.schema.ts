import { textHasNegativeNumber } from "@aiapply/shared";
import { z } from "zod";

import { pageMetadataSchema } from "./extension.schema.js";

const platformSchema = z.enum(["naukri", "linkedin"]);

export const jobFiltersSchema = z.object({
  mode: z.enum(["search", "recommended"]).default("search"),
  role: z.string().trim().max(80).default(""),
  experience: z
    .string()
    .trim()
    .max(30)
    .refine((v) => !textHasNegativeNumber(v), {
      message: "Experience cannot be negative",
    })
    .default(""),
  remote: z.boolean().default(false),
  salary: z
    .string()
    .trim()
    .max(40)
    .refine((v) => !v || !textHasNegativeNumber(v), {
      message: "Expected salary cannot be negative",
    })
    .optional(),
  datePosted: z
    .string()
    .optional()
    .refine((v) => !v || ["1", "3", "7", "30"].includes(v), {
      message: "Invalid date posted filter",
    })
    .refine((v) => !v || Number.parseInt(v, 10) > 0, {
      message: "Date posted must be positive",
    }),
  easyApplyOnly: z.boolean().default(false),
  fullAuto: z.boolean().default(false),
}).superRefine((filters, ctx) => {
  if (filters.mode === "recommended") return;
  if (!filters.role.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Job title is required in search mode",
      path: ["role"],
    });
  } else if (filters.role.trim().length < 2) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Job title must be at least 2 characters",
      path: ["role"],
    });
  }
});

export const startAutomationSchema = z.object({
  platform: platformSchema,
  filters: jobFiltersSchema,
  pageMetadata: pageMetadataSchema.optional(),
});

/** Start Naukri + LinkedIn jobs in parallel. */
export const startAllAutomationSchema = z.object({
  filters: jobFiltersSchema,
});

export const stopAutomationSchema = z.object({
  platform: platformSchema.optional(),
});

export const completeAutomationSchema = z.object({
  userId: z.string().min(1),
  jobId: z.string().min(1),
  platform: platformSchema,
  success: z.boolean(),
  applied: z.number().int().min(0),
  skipped: z.number().int().min(0),
  failed: z.number().int().min(0),
  alreadyApplied: z.number().int().min(0).default(0),
  noApplyButton: z.number().int().min(0).default(0),
  messages: z.array(z.string()).default([]),
  recommendedStats: z
    .object({
      found: z.number().int().min(0),
      matched: z.number().int().min(0),
      ready: z.number().int().min(0),
      applied: z.number().int().min(0),
      skipped: z.number().int().min(0),
      failed: z.number().int().min(0),
      successRate: z.number().min(0).max(100),
    })
    .optional(),
});
