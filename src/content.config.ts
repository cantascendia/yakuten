import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { docsLoader } from '@astrojs/starlight/loaders';
import { docsSchema } from '@astrojs/starlight/schema';
import { glob } from 'astro/loaders';

export const collections = {
	docs: defineCollection({
		loader: docsLoader(),
		schema: docsSchema({
			extend: z
				.object({
					evidenceLevel: z.enum(['A', 'B', 'C', 'X']),
					lastReviewed: z.coerce.date(),
					references: z.array(z.string()),
					// Optional SEO / schema.org Drug enrichment (medication pages).
					drug: z
						.object({
							nonProprietaryName: z.string().optional(),
							activeIngredient: z.string().optional(),
							mechanismOfAction: z.string().optional(),
							atc: z.string().optional(),
							rxnorm: z.string().optional(),
						})
						.optional(),
					// Optional FAQPage schema content.
					faqs: z
						.array(z.object({ q: z.string(), a: z.string() }))
						.optional(),
					// Optional per-page reviewer override (default: Editorial Team).
					medicalReviewer: z.string().optional(),
					// Optional per-page noindex flag — emits <meta name="robots" content="noindex,nofollow">.
					// Used for incomplete translations that should not be indexed by search engines
					// while still remaining reachable for users who navigate to them.
					noindex: z.boolean().optional(),
					// Set true when the page renders its `faqs` visibly in-body via <FaqSchema items={frontmatter.faqs} />.
					// FaqSchema then emits the FAQPage JSON-LD, so JsonLd.astro suppresses its own to avoid a
					// duplicate FAQPage block on one page (which can invalidate the structured data).
					faqsRenderedInBody: z.boolean().optional(),
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
	blog: defineCollection({
		loader: glob({ pattern: '**/*.mdx', base: './src/content/blog' }),
		schema: z.object({
			title: z.string(),
			description: z.string().max(160),
			publishDate: z.coerce.date(),
			updatedDate: z.coerce.date().optional(),
			author: z.string().default('HRT药典编辑部'),
			locale: z.enum(['zh', 'en', 'ja', 'ko', 'de', 'fr', 'es', 'pt', 'ru']).default('zh'),
			tags: z.array(z.string()).default([]),
			category: z
				.enum([
					'estrogen-guide',
					'antiandrogen-guide',
					'blood-test',
					'safety',
					'practical',
					'comparison',
					'general',
					'access-guide',
				])
				.default('general'),
			targetKeyword: z.string(),
			relatedDocs: z.array(z.string()).default([]),
			draft: z.boolean().default(false),
			// Optional FAQPage schema content (AEO / featured snippets).
			faqs: z
				.array(z.object({ q: z.string(), a: z.string() }))
				.optional(),
		}),
	}),
};
