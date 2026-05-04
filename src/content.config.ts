import { defineCollection, z } from "astro:content";

const notesCollection = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    date: z.date().optional(),
    category: z.string().optional().default("随笔"),
    tags: z.array(z.string()).optional(),
    public: z.boolean().optional().default(true),
    description: z.string().optional(),
  }),
});

export const collections = {
  notes: notesCollection,
};
