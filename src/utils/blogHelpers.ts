import { getCollection, type CollectionEntry } from 'astro:content';

export type BlogEntry = CollectionEntry<'blog'>;

/** Return published (non-draft) posts for a locale, sorted by publishDate desc. */
export async function getSortedPosts(locale: string): Promise<BlogEntry[]> {
	const all = await getCollection('blog');
	return all
		.filter((p) => p.data.locale === locale && !p.data.draft)
		.sort((a, b) => b.data.publishDate.valueOf() - a.data.publishDate.valueOf());
}

/** Find related posts by tag overlap, excluding the current post. */
export async function getRelatedPosts(
	currentId: string,
	tags: string[],
	locale: string,
	limit = 3,
): Promise<BlogEntry[]> {
	const posts = await getSortedPosts(locale);
	return posts
		.filter((p) => p.id !== currentId)
		.map((p) => ({
			post: p,
			score: p.data.tags.filter((t) => tags.includes(t)).length,
		}))
		.filter(({ score }) => score > 0)
		.sort((a, b) => b.score - a.score)
		.slice(0, limit)
		.map(({ post }) => post);
}

/** Category labels keyed by locale. */
const categoryLabels: Record<string, Record<string, string>> = {
	zh: {
		'estrogen-guide': '雌激素指南',
		'antiandrogen-guide': '抗雄指南',
		'blood-test': '血检相关',
		safety: '安全与风险',
		practical: '实操经验',
		comparison: '药物对比',
		general: '综合',
	},
	en: {
		'estrogen-guide': 'Estrogen Guide',
		'antiandrogen-guide': 'Anti-Androgen Guide',
		'blood-test': 'Blood Tests',
		safety: 'Safety & Risks',
		practical: 'Practical Tips',
		comparison: 'Comparisons',
		general: 'General',
	},
	ja: {
		'estrogen-guide': 'エストロゲン',
		'antiandrogen-guide': '抗アンドロゲン',
		'blood-test': '血液検査',
		safety: '安全とリスク',
		practical: '実践ガイド',
		comparison: '比較',
		general: '総合',
	},
	ko: {
		'estrogen-guide': '에스트로겐',
		'antiandrogen-guide': '항안드로겐',
		'blood-test': '혈액 검사',
		safety: '안전과 위험',
		practical: '실전 가이드',
		comparison: '비교',
		general: '종합',
	},
};

export function getCategoryLabel(category: string, locale: string): string {
	return categoryLabels[locale]?.[category] ?? categoryLabels.zh[category] ?? category;
}

/** Strip locale prefix from a blog entry ID to get the URL slug. */
export function getBlogSlug(entry: BlogEntry): string {
	// IDs from glob loader look like "zh/some-slug"
	const parts = entry.id.split('/');
	return parts.length > 1 ? parts.slice(1).join('/') : entry.id;
}

/** Build the canonical URL for a blog post. */
export function getBlogUrl(entry: BlogEntry): string {
	const slug = getBlogSlug(entry);
	return `/${entry.data.locale}/blog/${slug}/`;
}
