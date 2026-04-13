import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title:       z.string(),
    description: z.string(),
    pubDate:     z.coerce.date(),
    type:        z.enum(['analysis', 'guide', 'update', 'feature']).default('analysis'),
    lang:        z.enum(['en', 'es', 'fr', 'de', 'pt', 'ja', 'ko', 'ar', 'tr']).default('en'),
    coverImage:  z.string().optional(),
    draft:       z.boolean().default(false),
  }),
});

export const collections = { blog };
