import { z } from "zod";

export const noteSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Enter a title.")
    .max(500, "The title must be 500 characters or fewer."),
  body: z
    .string()
    .trim()
    .min(1, "Write something in your note.")
    .max(100_000, "The note must be 100,000 characters or fewer."),
});

export type NoteFormValues = z.infer<typeof noteSchema>;
