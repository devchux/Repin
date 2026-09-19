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
  tags: z
    .string()
    .max(1_274, "Use no more than 25 tags of 50 characters each.")
    .refine(
      (value) =>
        value
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean).length <= 25,
      "Use no more than 25 tags.",
    )
    .refine(
      (value) =>
        value
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean)
          .every((tag) => tag.length <= 50),
      "Each tag must be 50 characters or fewer.",
    ),
});

export type NoteFormValues = z.infer<typeof noteSchema>;
