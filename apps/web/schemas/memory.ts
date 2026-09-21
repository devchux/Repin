import { z } from "zod";

export const memoryFormSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, "Enter what Repin should remember.")
    .max(4_000, "Memory must be 4,000 characters or fewer."),
  scope: z.enum(["global", "domain"]),
});

export type MemoryFormValues = z.infer<typeof memoryFormSchema>;
