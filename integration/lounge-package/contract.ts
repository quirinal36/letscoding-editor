import { z } from "zod";
export const deployForm = z.object({
  title: z.string().trim().min(1).max(100),
  description: z.string().trim().min(1).max(3000),
  category: z.enum(["web_game", "website"]),
  slug: z.string().regex(/^[a-z0-9-]{3,20}$/),
  isPublished: z.boolean(),
  isListed: z.boolean(),
  thumbnailPath: z.string().optional(),
});
export type EditorDeployForm = z.infer<typeof deployForm>;
