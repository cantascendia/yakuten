/**
 * Estimate reading time for CJK and Latin content.
 * CJK: ~400 characters/min, Latin: ~200 words/min.
 */
export function getReadingTime(content: string, locale: string = 'zh'): number {
	const isCJK = ['zh', 'ja', 'ko'].includes(locale);
	if (isCJK) {
		const charCount = content.replace(/\s/g, '').length;
		return Math.max(1, Math.ceil(charCount / 400));
	}
	const wordCount = content.split(/\s+/).length;
	return Math.max(1, Math.ceil(wordCount / 200));
}
