import { MEMORY_SCOPES } from "@repo/contracts/memory";
import { z } from "zod";

export const updateMemorySchema = z
  .object({
    content: z.string().trim().min(1, "Memory cannot be empty").max(4_000),
    scope: z.enum(MEMORY_SCOPES),
    scopeId: z.string().trim().max(500).optional(),
  })
  .superRefine((value, context) => {
    if (value.scope !== "global" && !value.scopeId) {
      context.addIssue({
        code: "custom",
        path: ["scopeId"],
        message: "An identifier is required for this scope",
      });
    }
  });

export type UpdateMemoryFormValues = z.infer<typeof updateMemorySchema>;
