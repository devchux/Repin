import { z } from "zod";

export const createBookmarkSchema = z.object({
  url: z
    .string()
    .trim()
    .min(1, "Enter a page URL.")
    .max(2_000, "The URL is too long.")
    .url("Enter a valid URL including http:// or https://."),
  title: z
    .string()
    .trim()
    .min(1, "Enter a title.")
    .max(500, "The title must be 500 characters or fewer."),
});

export const createCollectionSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Enter a collection name.")
    .max(120, "The name must be 120 characters or fewer."),
});

export const updateBookmarkSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Enter a title.")
    .max(500, "The title must be 500 characters or fewer."),
  note: z
    .string()
    .trim()
    .max(2_000, "The note must be 2,000 characters or fewer."),
  tags: z.string().max(2_000, "The tags are too long."),
});

export const bookmarkMemorySchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, "Enter what Repin should remember.")
    .max(4_000, "Memory must be 4,000 characters or fewer."),
  scope: z.enum(["global", "domain"]),
});

export type CreateBookmarkFormValues = z.infer<typeof createBookmarkSchema>;
export type CreateCollectionFormValues = z.infer<typeof createCollectionSchema>;
export type UpdateBookmarkFormValues = z.infer<typeof updateBookmarkSchema>;
export type BookmarkMemoryFormValues = z.infer<typeof bookmarkMemorySchema>;
