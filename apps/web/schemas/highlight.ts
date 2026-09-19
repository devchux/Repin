import { HIGHLIGHT_COLORS } from "@repo/contracts/highlight";
import { z } from "zod";

export const highlightSchema = z.object({
  note: z
    .string()
    .trim()
    .max(10_000, "Note must be 10,000 characters or fewer"),
  color: z.enum(HIGHLIGHT_COLORS),
});

export type HighlightFormValues = z.infer<typeof highlightSchema>;
