import { useState, useMemo } from 'react';
import type { CSSProperties } from 'react';

type Locale = 'zh' | 'en' | 'ja';

function getLocale(): Locale {
  if (typeof window !== 'undefined' && window.location.pathname.startsWith('/en')) return 'en';
  if (typeof window !== 'undefined' && window.location.pathname.startsWith('/ja')) return 'ja';
  if (typeof window !== 'undefined' && window.location.pathname.startsWith('/ko')) return 'en';
  return 'zh';
}

const UI_COPY = {
  zh: {
    regionLabel: '参考文献库',
    title: '参考文献库',
    searchPlaceholder: '搜索作者、标题、期刊…',
    all: '全部',
    guideline: '临床指南',
    safety: '安全性研究',
    pk: '药代动力学',
    cpa: 'CPA/脑膜瘤',
    breast: '乳房发育',
    injectable: '注射研究',
    community: '社区资源',
    noResults: '未找到匹配的文献',
    total: '共',
    entries: '条文献',
  },
  en: {
    regionLabel: 'Reference library',
    title: 'Reference Library',
    searchPlaceholder: 'Search authors, titles, journals…',
    all: 'All',
    guideline: 'Guidelines',
    safety: 'Safety',
    pk: 'Pharmacokinetics',
    cpa: 'CPA/Meningioma',
    breast: 'Breast Dev.',
    injectable: 'Injectable',
    community: 'Community',
    noResults: 'No matching references found',
    total: 'Total:',
    entries: 'references',
  },
  ja: {
    regionLabel: '参考文献ライブラリ',
    title: '参考文献ライブラリ',
    searchPlaceholder: '著者、タイトル、ジャーナルを検索…',
    all: 'すべて',
    guideline: 'ガイドライン',
    safety: '安全性研究',
    pk: '薬物動態',
    cpa: 'CPA/髄膜腫',
    breast: '乳房発育',
    injectable: '注射研究',
    community: 'コミュニティ',
    noResults: '一致する文献が見つかりません',
    total: '合計',
    entries: '件',
  },
} as const;

/* ================================
   Reference Data (from references.json with category)
   ================================ */

type Category = 'guideline' | 'safety' | 'pk' | 'cpa' | 'breast' | 'injectable' | 'community';

interface Ref {
  id: string;
  authors: string;
  year: number;
  title: string;
  journal: string;
  doi: string | null;
  url: string | null;
  category: Category;
}

const REFS: Ref[] = [
  { id: 'hembree-2017', authors: 'Hembree WC et al.', year: 2017, title: 'Endocrine Treatment of Gender-Dysphoric/Gender-Incongruent Persons', journal: 'The Journal of Clinical Endocrinology & Metabolism', doi: '10.1210/jc.2017-01658', url: 'https://doi.org/10.1210/jc.2017-01658', category: 'guideline' },
  { id: 'coleman-2022', authors: 'Coleman E et al.', year: 2022, title: 'Standards of Care for the Health of Transgender and Gender Diverse People, Version 8', journal: 'International Journal of Transgender Health', doi: '10.1080/26895269.2022.2100644', url: 'https://doi.org/10.1080/26895269.2022.2100644', category: 'guideline' },
  { id: 'ucsf-2016', authors: 'Deutsch', year: 2016, title: 'Guidelines for the Primary and Gender-Affirming Care of Transgender and Gender Nonbinary People', journal: 'UCSF Gender Affirming Health Program', doi: null, url: 'https://transcare.ucsf.edu/guidelines', category: 'guideline' },
  { id: 'canonico-2018', authors: 'Canonico M et al.', year: 2018, title: 'Hormone therapy and venous thromboembolism: an updated overview', journal: 'Maturitas', doi: '10.1016/j.maturitas.2015.06.040', url: 'https://doi.org/10.1016/j.maturitas.2015.06.040', category: 'safety' },
  { id: 'vinogradova-2019', authors: 'Vinogradova Y et al.', year: 2019, title: 'Use of hormone replacement therapy and risk of venous thromboembolism', journal: 'BMJ', doi: '10.1136/bmj.k4810', url: 'https://doi.org/10.1136/bmj.k4810', category: 'safety' },
  { id: 'deblok-2021', authors: 'de Blok CJM et al.', year: 2021, title: 'Amsterdam cohort 50-year follow-up', journal: 'The Lancet Diabetes & Endocrinology', doi: '10.1016/S2213-8587(21)00185-6', url: 'https://doi.org/10.1016/S2213-8587(21)00185-6', category: 'safety' },
  { id: 'meyer-2020', authors: 'Meyer et al.', year: 2020, title: 'Safety and rapid efficacy of guideline-based gender-affirming hormone therapy', journal: 'European Journal of Endocrinology', doi: '10.1530/EJE-19-0463', url: 'https://doi.org/10.1530/EJE-19-0463', category: 'safety' },
  { id: 'ema-2020', authors: 'EMA', year: 2020, title: 'Restrictions on use of cyproterone due to meningioma risk', journal: 'European Medicines Agency', doi: null, url: 'https://www.ema.europa.eu/en/news/restrictions-use-cyproterone-due-meningioma-risk', category: 'cpa' },
  { id: 'lee-2022', authors: 'Lee et al.', year: 2022, title: 'Cyproterone acetate and meningioma risk', journal: 'Scientific Reports', doi: '10.1038/s41598-022-05773-z', url: 'https://doi.org/10.1038/s41598-022-05773-z', category: 'cpa' },
  { id: 'hudelist-2026', authors: 'Hudelist et al.', year: 2026, title: 'CPA-associated meningioma in transgender women', journal: 'eClinicalMedicine', doi: '10.1016/j.eclinm.2026.103791', url: 'https://doi.org/10.1016/j.eclinm.2026.103791', category: 'cpa' },
  { id: 'kuhl-2005', authors: 'Kuhl', year: 2005, title: 'Pharmacology of estrogens and progestogens: influence of different routes of administration', journal: 'Climacteric', doi: '10.1080/13697130500148875', url: 'https://doi.org/10.1080/13697130500148875', category: 'pk' },
  { id: 'oriowo-1980', authors: 'Oriowo MA et al.', year: 1980, title: 'Pharmacokinetics of Estradiol Esters', journal: 'Contraception', doi: '10.1016/S0010-7824(80)80018-7', url: 'https://doi.org/10.1016/S0010-7824(80)80018-7', category: 'pk' },
  { id: 'price-1997', authors: 'Price et al.', year: 1997, title: 'Sublingual estradiol pharmacokinetics', journal: 'Obstetrics & Gynecology', doi: '10.1016/S0029-7844(96)00513-3', url: 'https://doi.org/10.1016/S0029-7844(96)00513-3', category: 'pk' },
  { id: 'kanin-2025', authors: 'Kanin M et al.', year: 2025, title: 'Injectable Estradiol Dosing Regimens', journal: 'Journal of the Endocrine Society', doi: '10.1210/jendso/bvaf004', url: 'https://doi.org/10.1210/jendso/bvaf004', category: 'injectable' },
  { id: 'rothman-2024', authors: 'Rothman MS et al.', year: 2024, title: 'Injectable Estradiol Dosing in Transgender Individuals', journal: 'Transgender Health', doi: '10.1089/trgh.2023.0209', url: 'https://doi.org/10.1089/trgh.2023.0209', category: 'injectable' },
  { id: 'herndon-2023', authors: 'Herndon JS et al.', year: 2023, title: 'Subcutaneous vs Intramuscular Estradiol Valerate', journal: 'Endocrine Practice', doi: '10.1016/j.eprac.2023.02.006', url: 'https://doi.org/10.1016/j.eprac.2023.02.006', category: 'injectable' },
  { id: 'misakian-2025', authors: 'Misakian AL et al.', year: 2025, title: 'Injectable Estradiol Monotherapy in Transgender Individuals', journal: 'Endocrine Practice', doi: '10.1016/j.eprac.2025.07.002', url: 'https://doi.org/10.1016/j.eprac.2025.07.002', category: 'injectable' },
  { id: 'poage-2026', authors: 'Poage AC et al.', year: 2026, title: 'Subcutaneous vs Intramuscular Estradiol Valerate Injection', journal: 'Pharmacy', doi: '10.3390/pharmacy14010013', url: 'https://doi.org/10.3390/pharmacy14010013', category: 'injectable' },
  { id: 'patel-2021', authors: 'Patel et al.', year: 2021, title: 'Breast development in transgender women on hormone therapy', journal: 'Transgender Health', doi: '10.1089/trgh.2020.0057', url: 'https://doi.org/10.1089/trgh.2020.0057', category: 'breast' },
  { id: 'prior-2019', authors: 'Prior JC', year: 2019, title: 'Progesterone is important for transgender women\'s therapy', journal: 'The Journal of Clinical Endocrinology & Metabolism', doi: '10.1210/jc.2018-01777', url: 'https://doi.org/10.1210/jc.2018-01777', category: 'breast' },
  { id: 'aly-2021', authors: 'Aly', year: 2021, title: 'Injectable Estradiol Meta-Analysis', journal: 'Transfeminine Science', doi: null, url: 'https://transfemscience.org/articles/injectable-e2-meta-analysis/', category: 'community' },
  { id: 'fuji-2023', authors: '富士製薬', year: 2023, title: 'プロギノン・デポー添付文書', journal: 'PMDA', doi: null, url: 'https://www.pmda.go.jp/PmdaSearch/rdSearch/02/2473402A2059', category: 'pk' },
];

const CATEGORIES: Category[] = ['guideline', 'safety', 'pk', 'cpa', 'breast', 'injectable', 'community'];

/* ================================
   Styles
   ================================ */

const s: Record<string, CSSProperties> = {
  container: {
    background: 'var(--glass-bg)',
    backdropFilter: 'var(--glass-blur)',
    WebkitBackdropFilter: 'var(--glass-blur)',
    border: 'var(--glass-border)',
    clipPath: 'var(--clip-corner)',
    padding: 'var(--space-xl)',
    marginBlock: 'var(--space-xl)',
  },
  title: {
    fontFamily: 'var(--font-display)',
    fontSize: '1.25rem',
    fontWeight: 700,
    color: 'var(--color-text-primary)',
    marginBottom: 'var(--space-lg)',
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-sm)',
  },
  iconBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '2rem',
    height: '2rem',
    color: 'var(--color-accent)',
  },
  searchBox: {
    width: '100%',
    padding: 'var(--space-sm) var(--space-md)',
    background: 'var(--color-bg-container)',
    color: 'var(--color-text-primary)',
    border: 'none',
    borderBottom: '2px solid var(--color-outline)',
    fontFamily: 'var(--font-body)',
    fontSize: '0.9375rem',
    outline: 'none',
    borderRadius: 0,
    marginBottom: 'var(--space-md)',
    transition: 'border-color var(--transition-fast)',
  },
  tabs: {
    display: 'flex',
    gap: 'var(--space-xs)',
    flexWrap: 'wrap' as const,
    marginBottom: 'var(--space-lg)',
  },
  tab: {
    appearance: 'none' as const,
    WebkitAppearance: 'none' as const,
    MozAppearance: 'none' as const,
    WebkitTapHighlightColor: 'transparent',
    minHeight: '44px', // WCAG 2.5.5
    padding: 'var(--space-xs) var(--space-md)',
    background: 'transparent',
    color: 'var(--color-text-muted)',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: 'var(--color-outline-20)',
    fontFamily: 'var(--font-body)',
    fontSize: '0.8125rem',
    cursor: 'pointer',
    transition: 'all var(--transition-fast)',
    outline: 'none',
  },
  tabActive: {
    minHeight: '44px',
    padding: 'var(--space-xs) var(--space-md)',
    background: 'linear-gradient(135deg, var(--color-primary-alpha-15), var(--color-primary-alpha-25))',
    color: 'var(--color-primary-light)',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: 'var(--color-primary)',
    fontFamily: 'var(--font-body)',
    fontSize: '0.8125rem',
    cursor: 'pointer',
  },
  count: {
    fontSize: '0.75rem',
    color: 'var(--color-text-muted)',
    marginBottom: 'var(--space-md)',
    fontFamily: 'var(--font-body)',
  },
  list: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 'var(--space-sm)',
  },
  card: {
    background: 'var(--color-bg-container)',
    border: '1px solid var(--color-outline-20)',
    padding: 'var(--space-md)',
    transition: 'border-color var(--transition-fast)',
  },
  cardAuthors: {
    fontSize: '0.8125rem',
    color: 'var(--color-accent)',
    fontWeight: 600,
    fontFamily: 'var(--font-body)',
  },
  cardYear: {
    fontSize: '0.75rem',
    color: 'var(--color-text-muted)',
    fontFamily: 'var(--font-mono)',
    marginLeft: 'var(--space-sm)',
  },
  cardTitle: {
    fontSize: '0.875rem',
    color: 'var(--color-text-primary)',
    fontWeight: 600,
    fontFamily: 'var(--font-body)',
    marginTop: 'var(--space-xs)',
    lineHeight: 1.5,
  },
  cardJournal: {
    fontSize: '0.75rem',
    color: 'var(--color-text-secondary)',
    fontStyle: 'italic' as const,
    fontFamily: 'var(--font-body)',
    marginTop: '2px',
  },
  cardDoi: {
    display: 'inline-block',
    fontSize: '0.6875rem',
    color: 'var(--color-primary)',
    fontFamily: 'var(--font-mono)',
    marginTop: 'var(--space-xs)',
    textDecoration: 'none',
    wordBreak: 'break-all' as const,
  },
  noResults: {
    textAlign: 'center' as const,
    color: 'var(--color-text-muted)',
    padding: 'var(--space-2xl)',
    fontSize: '0.875rem',
    fontFamily: 'var(--font-body)',
  },
};

/* ================================
   Component
   ================================ */

export default function ReferenceLibrary() {
  const locale = getLocale();
  const ui = UI_COPY[locale];
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<Category | 'all'>('all');

  const filtered = useMemo(() => {
    let list = REFS;
    if (category !== 'all') {
      list = list.filter(r => r.category === category);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(r =>
        r.authors.toLowerCase().includes(q) ||
        r.title.toLowerCase().includes(q) ||
        r.journal.toLowerCase().includes(q) ||
        r.id.includes(q)
      );
    }
    return list.sort((a, b) => b.year - a.year);
  }, [search, category]);

  const getCatLabel = (cat: Category | 'all'): string => {
    return (ui as Record<string, string>)[cat] ?? cat;
  };

  return (
    <div style={s.container} role="region" aria-label={ui.regionLabel}>
      <style>{`
        .rl-tab-btn:focus { outline: none; }
        .rl-tab-btn:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 2px; }
      `}</style>
      <div style={s.title}>
        <span style={s.iconBadge}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
          </svg>
        </span>
        {ui.title}
      </div>

      {/* Search */}
      <input
        type="search"
        placeholder={ui.searchPlaceholder}
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={s.searchBox}
        aria-label={ui.searchPlaceholder}
      />

      {/* Category Tabs */}
      <div style={s.tabs} role="tablist">
        <button
          type="button"
          className="rl-tab-btn"
          role="tab"
          aria-selected={category === 'all'}
          style={category === 'all' ? s.tabActive : s.tab}
          onClick={(e) => { setCategory('all'); (e.target as HTMLElement).blur(); }}
        >
          {ui.all} ({REFS.length})
        </button>
        {CATEGORIES.map(cat => {
          const count = REFS.filter(r => r.category === cat).length;
          if (count === 0) return null;
          return (
            <button
              key={cat}
              type="button"
              className="rl-tab-btn"
              role="tab"
              aria-selected={category === cat}
              style={category === cat ? s.tabActive : s.tab}
              onClick={(e) => { setCategory(cat); (e.target as HTMLElement).blur(); }}
            >
              {getCatLabel(cat)} ({count})
            </button>
          );
        })}
      </div>

      {/* Count */}
      <div style={s.count}>
        {ui.total} {filtered.length} {ui.entries}
      </div>

      {/* Reference List */}
      {filtered.length === 0 ? (
        <div style={s.noResults}>{ui.noResults}</div>
      ) : (
        <div style={s.list}>
          {filtered.map(ref => (
            <div key={ref.id} style={s.card}>
              <div>
                <span style={s.cardAuthors}>{ref.authors}</span>
                <span style={s.cardYear}>({ref.year})</span>
              </div>
              <div style={s.cardTitle}>{ref.title}</div>
              <div style={s.cardJournal}>{ref.journal}</div>
              {(ref.doi || ref.url) && (
                <a
                  href={ref.doi ? `https://doi.org/${ref.doi}` : ref.url!}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={s.cardDoi}
                >
                  {ref.doi ? `DOI: ${ref.doi}` : 'Link'}
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
