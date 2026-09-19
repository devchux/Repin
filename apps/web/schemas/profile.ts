import { z } from "zod";

const name = z
  .string()
  .trim()
  .min(1, "This field is required")
  .max(100, "Use 100 characters or fewer");

export const profileSchema = z.object({ firstName: name, lastName: name });

export type ProfileFormValues = z.infer<typeof profileSchema>;
