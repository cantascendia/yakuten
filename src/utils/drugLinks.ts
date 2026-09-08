/**
 * Maps drug IDs from drugs.json to their documentation page URL slugs.
 * Used by interactive tool components (DrugComparator, DrugCards, BrandLibrary)
 * and by BrandLibrarySchema.astro to link back to detailed drug pages.
 */

const DRUG_ID_TO_SLUG: Record<string, string> = {
  // Estrogens
  'estradiol-oral': 'medications/estrogens/oral',
  'estradiol-sublingual': 'medications/estrogens/sublingual',
  'estradiol-gel': 'medications/estrogens/gel',
  'estradiol-patch': 'medications/estrogens/transdermal-patch',
  // drugs.json 用的是 `estradiol-injection`；`estradiol-valerate-injection`
  // 是历史别名，两者都保留以免旧数据/旧组件丢链接。
  'estradiol-injection': 'medications/estrogens/injection',
  'estradiol-valerate-injection': 'medications/estrogens/injection',
  'estradiol-cypionate': 'medications/estrogens/cypionate',
  'estradiol-enanthate': 'medications/estrogens/enanthate',
  'estradiol-undecylate': 'medications/estrogens/undecylate',
  'banned-estrogens': 'medications/estrogens/banned-estrogens',
  // 炔雌醇 / 结合雌激素的「详情」落到禁用雌激素专页（品牌图鉴禁用图版 + DrugCards/Comparator 共用）
  'ethinylestradiol': 'medications/estrogens/banned-estrogens',
  'conjugated-estrogens': 'medications/estrogens/banned-estrogens',

  // Anti-androgens
  'cyproterone-acetate': 'medications/antiandrogens/cpa',
  'spironolactone': 'medications/antiandrogens/spironolactone',
  'bicalutamide': 'medications/antiandrogens/bicalutamide',
  'gnrh-agonist': 'medications/antiandrogens/gnrh-agonists',
  'gnrh-antagonist': 'medications/antiandrogens/gnrh-antagonists',
  'flutamide': 'medications/antiandrogens/flutamide',

  // Progestogens
  'progesterone': 'medications/progestogens/progesterone',
  'hydroxyprogesterone': 'medications/progestogens/hydroxyprogesterone',
  'dydrogesterone': 'medications/progestogens/dydrogesterone',
  'drospirenone': 'medications/progestogens/drospirenone',
  'norethisterone': 'medications/progestogens/norethisterone',
  'mpa': 'medications/progestogens/cautioned-progestins',

  // 5α-Reductase Inhibitors
  'finasteride': 'medications/five-alpha-reductase/finasteride',
  'dutasteride': 'medications/five-alpha-reductase/dutasteride',

  // Banned
  'banned-drugs': 'medications/banned-drugs',
};

/**
 * Get the documentation page URL for a drug ID.
 * Returns the localized path (e.g., /zh/medications/antiandrogens/cpa/)
 * or null if no page exists for the given ID.
 */
export function getDrugPageUrl(drugId: string, locale: string = 'zh'): string | null {
  const slug = DRUG_ID_TO_SLUG[drugId];
  if (!slug) return null;
  return `/${locale}/${slug}/`;
}

/**
 * Detect the current locale from the page URL path.
 */
export function getLocaleFromPath(): string {
  if (typeof window === 'undefined') return 'zh';
  const path = window.location.pathname;
  const match = path.match(/^\/(zh|en|ja|ko)\//);
  return match ? match[1] : 'zh';
}
