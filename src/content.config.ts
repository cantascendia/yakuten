import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { docsLoader } from '@astrojs/starlight/loaders';
import { docsSchema } from '@astrojs/starlight/schema';

export const collections = {
	docs: defineCollection({
		loader: docsLoader(),
		schema: docsSchema({
			extend: z
				.object({
					evidenceLevel: z.enum(['A', 'B', 'C', 'X']),
					lastReviewed: z.coerce.date(),
					references: z.array(z.string()),
				})
				.superRefine((data, ctx) => {
					if (data.evidenceLevel !== 'X' && data.references.length === 0) {
						ctx.addIssue({
							code: 'custom',
							path: ['references'],
							message: 'Pages with evidenceLevel A/B/C must declare at least one reference.',
						});
					}
				}),
		}),
	}),
};
