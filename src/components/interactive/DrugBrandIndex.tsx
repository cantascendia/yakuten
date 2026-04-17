import { useState, useMemo } from 'react';
import type { CSSProperties } from 'react';
import brandData from '../../data/drug-brands.json';
import { getDrugPageUrl, getLocaleFromPath } from '../../utils/drugLinks';

type Locale = 'zh' | 'en' | 'ja';

function getLocale(): Locale {
  const loc = getLocaleFromPath();
  if (loc === 'en' || loc === 'ko') return 'en';
  if (loc === 'ja') return 'ja';
  return 'zh';
}

/* ── i18n ── */

const UI = {
  zh: {
    title: '药物品牌索引',
    subtitle: '全球 HRT 药物品牌辨识参考',
    disclaimer: '本页面仅供品牌辨识参考，不构成购买建议。本站不提供购药链接、不推荐药商、不协助进口。',
    searchPlaceholder: '搜索品牌名、厂商、成分…',
    regionAll: '全部地区',
    regionChina: '中国',
    regionThailand: '泰国',
    regionIndia: '印度',
    regionJapan: '日本',
    regionWestern: '欧美',
    regionOther: '其他',
    categoryAll: '全部类别',
    categoryEstrogen: '雌激素',
    categoryAntiandrogen: '抗雄激素',
    categoryProgestogen: '孕激素',
    category5ari: '5α-还原酶抑制剂',
    categoryBanned: '禁用药物',
    statusApproved: '已批准',
    statusPrescription: '处方药',
    statusGrey: '灰色渠道',
    statusBanned: '禁用',
    manufacturer: '厂商',
    spec: '规格',
    appearance: '外观',
    ingredient: '成分',
    officialSite: '官网',
    noResults: '未找到匹配的品牌',
    total: '共',
    entries: '个品牌',
  },
  en: {
    title: 'Drug Brand Index',
    subtitle: 'Global HRT medication brand identification reference',
    disclaimer: 'This page is for brand identification only. We do not provide purchase links, recommend sellers, or facilitate imports.',
    searchPlaceholder: 'Search brand, manufacturer, ingredient…',
    regionAll: 'All Regions',
    regionChina: 'China',
    regionThailand: 'Thailand',
    regionIndia: 'India',
    regionJapan: 'Japan',
    regionWestern: 'Western',
    regionOther: 'Other',
    categoryAll: 'All Categories',
    categoryEstrogen: 'Estrogens',
    categoryAntiandrogen: 'Anti-Androgens',
    categoryProgestogen: 'Progestogens',
    category5ari: '5α-Reductase Inhibitors',
    categoryBanned: 'Banned',
    statusApproved: 'Approved',
    statusPrescription: 'Rx Only',
    statusGrey: 'Grey Market',
    statusBanned: 'Banned',
    manufacturer: 'Manufacturer',
    spec: 'Spec',
    appearance: 'Appearance',
    ingredient: 'Ingredient',
    officialSite: 'Website',
    noResults: 'No matching brands found',
    total: 'Total:',
    entries: 'brands',
  },
  ja: {
    title: '薬物ブランド索引',
    subtitle: 'グローバルHRT医薬品ブランド識別リファレンス',
    disclaimer: 'このページはブランド識別のみを目的としています。購入リンクの提供、販売者の推薦、輸入の支援は行いません。',
    searchPlaceholder: 'ブランド名、メーカー、成分を検索…',
    regionAll: '全地域',
    regionChina: '中国',
    regionThailand: 'タイ',
    regionIndia: 'インド',
    regionJapan: '日本',
    regionWestern: '欧米',
    regionOther: 'その他',
    categoryAll: '全カテゴリ',
    categoryEstrogen: 'エストロゲン',
    categoryAntiandrogen: '抗アンドロゲン',
    categoryProgestogen: 'プロゲストーゲン',
    category5ari: '5α還元酵素阻害薬',
    categoryBanned: '使用禁止',
    statusApproved: '承認済',
    statusPrescription: '処方箋',
    statusGrey: 'グレー',
    statusBanned: '禁止',
    manufacturer: 'メーカー',
    spec: '規格',
    appearance: '外観',
    ingredient: '成分',
    officialSite: '公式サイト',
    noResults: '一致するブランドが見つかりません',
    total: '合計',
    entries: 'ブランド',
  },
} as const;

/* ── Data types ── */

interface BrandEntry {
  name: string;
  manufacturer: string;
  country: string;
  countryName: string;
  spec: string;
  appearance: string;
  notes: string;
  activeIngredient?: string;
  status?: 'approved' | 'prescription' | 'grey' | 'banned';
  url?: string;
  image?: string;
}

type DrugCategory = 'estrogen' | 'antiandrogen' | 'progestogen' | '5ari' | 'banned';
type Region = 'all' | 'china' | 'thailand' | 'india' | 'japan' | 'western' | 'other';

interface FlatBrand extends BrandEntry {
  drugId: string;
  category: DrugCategory;
}

/* ── Classify drugs into categories ── */

function classifyDrug(drugId: string): DrugCategory {
  if (drugId.startsWith('estradiol') && !drugId.includes('ethinyl')) return 'estrogen';
  if (['cyproterone-acetate', 'spironolactone', 'bicalutamide', 'gnrh-agonist'].includes(drugId)) return 'antiandrogen';
  if (['progesterone', 'hydroxyprogesterone', 'dydrogesterone', 'drospirenone'].includes(drugId)) return 'progestogen';
  if (['dutasteride', 'finasteride'].includes(drugId)) return '5ari';
  if (['ethinylestradiol', 'conjugated-estrogens'].includes(drugId)) return 'banned';
  return 'estrogen';
}

function classifyRegion(country: string): Region {
  if (country === 'CN') return 'china';
  if (country === 'TH') return 'thailand';
  if (country === 'IN') return 'india';
  if (country === 'JP') return 'japan';
  if (['US', 'DE', 'FR', 'GB', 'CH', 'FI', 'NL'].includes(country)) return 'western';
  return 'other';
}

/* ── Flatten brand data ── */

function flattenBrands(): FlatBrand[] {
  const result: FlatBrand[] = [];
  const data = brandData as Record<string, BrandEntry[]>;
  for (const [drugId, brands] of Object.entries(data)) {
    const category = classifyDrug(drugId);
    for (const brand of brands) {
      result.push({ ...brand, drugId, category });
    }
  }
  return result;
}

/* ── Flag emoji ── */

function flag(code: string): string {
  return [...code.toUpperCase()]
    .map((c) => String.fromCodePoint(0x1f1e6 - 65 + c.charCodeAt(0)))
    .join('');
}

/* ── Styles ── */

const S: Record<string, CSSProperties> = {
  container: {
    maxWidth: '72rem',
    margin: '0 auto',
  },
  disclaimer: {
    background: 'var(--sl-color-accent-low, var(--color-primary-alpha-15))',
    border: '1px solid var(--sl-color-accent, var(--color-primary-alpha-40))',
    padding: '0.875rem 1.25rem',
    marginBottom: '1.5rem',
    fontSize: '0.8125rem',
    lineHeight: 1.6,
    color: 'var(--sl-color-text, #ccc)',
  },
  searchRow: {
    display: 'flex',
    gap: '0.75rem',
    flexWrap: 'wrap' as const,
    marginBottom: '1rem',
  },
  searchInput: {
    flex: '1 1 280px',
    padding: '0.625rem 1rem',
    border: '1px solid var(--sl-color-gray-5, var(--color-border-subtle))',
    background: 'var(--sl-color-bg-nav, var(--glass-bg))',
    color: 'var(--sl-color-text, #fff)',
    fontSize: '0.875rem',
    fontFamily: 'var(--font-body, sans-serif)',
    outline: 'none',
  },
  filterRow: {
    display: 'flex',
    gap: '0.5rem',
    flexWrap: 'wrap' as const,
    marginBottom: '0.75rem',
  },
  filterBtn: {
    appearance: 'none' as const,
    WebkitAppearance: 'none' as const,
    MozAppearance: 'none' as const,
    WebkitTapHighlightColor: 'transparent',
    padding: '0.375rem 0.75rem',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: 'var(--sl-color-gray-5, var(--color-border-subtle))',
    background: 'var(--sl-color-bg-nav, var(--glass-bg-40))',
    color: 'var(--sl-color-text-accent, #aaa)',
    fontSize: '0.75rem',
    cursor: 'pointer',
    transition: 'all 0.15s',
    fontFamily: 'var(--font-body, sans-serif)',
    outline: 'none',
  },
  filterBtnActive: {
    background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-container))',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: 'var(--sl-color-accent, var(--color-primary-alpha-60))',
    color: '#fff',
  },
  stats: {
    fontSize: '0.75rem',
    color: 'var(--color-text-muted, #888)',
    marginBottom: '1.25rem',
    fontFamily: 'var(--font-mono, monospace)',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '1rem',
    alignItems: 'start',
  },
  card: {
    display: 'flex',
    flexDirection: 'row' as const,
    gap: '0.875rem',
    padding: '1rem 1.25rem',
    clipPath: 'var(--clip-corner-sm)',
    background: 'var(--sl-color-bg-nav, var(--glass-bg))',
    backdropFilter: 'blur(12px)',
    border: '1px solid var(--sl-color-gray-5, var(--color-outline-20))',
    transition: 'transform 0.2s, box-shadow 0.2s',
  },
  cardInner: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.5rem',
    flex: 1,
    minWidth: 0,
  },
  cardImage: {
    width: '80px',
    height: '80px',
    objectFit: 'cover' as const,
    flexShrink: 0,
    background: 'var(--sl-color-bg-nav, var(--glass-bg-30))',
    border: '1px solid var(--sl-color-gray-5, var(--color-outline-15))',
  },
  cardIconPlaceholder: {
    width: '80px',
    height: '80px',
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '2rem',
    background: 'var(--sl-color-bg-nav, var(--glass-bg-30))',
    border: '1px solid var(--sl-color-gray-5, var(--color-outline-15))',
  },
  cardBanned: {
    borderColor: 'var(--sl-color-red, var(--color-danger-border))',
    background: 'var(--sl-color-red-low, var(--color-danger-bg-low))',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '0.5rem',
  },
  cardHeaderLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.375rem',
  },
  flagEmoji: { fontSize: '1.125rem', lineHeight: 1 },
  countryLabel: {
    fontFamily: 'var(--font-mono, monospace)',
    fontSize: '0.625rem',
    color: 'var(--color-accent, #D4A853)',
    letterSpacing: '0.15em',
    textTransform: 'uppercase' as const,
  },
  badge: {
    padding: '0.125rem 0.5rem',
    fontSize: '0.625rem',
    fontWeight: 600,
    letterSpacing: '0.05em',
    textTransform: 'uppercase' as const,
  },
  badgeApproved: { background: 'var(--color-safe-alpha-15, rgba(76, 175, 80, 0.15))', color: 'var(--color-safe)', padding: '2px var(--space-sm)' },
  badgePrescription: { background: 'rgba(124, 140, 240, 0.15)', color: 'var(--color-tertiary, #7c8cf0)', padding: '2px var(--space-sm)' },
  badgeGrey: { background: 'var(--color-caution-alpha-08, rgba(255, 152, 0, 0.1))', color: 'var(--color-caution)', padding: '2px var(--space-sm)' },
  badgeBanned: { background: 'var(--color-danger-alpha-10, rgba(244, 67, 54, 0.15))', color: 'var(--color-danger)', padding: '2px var(--space-sm)', textDecoration: 'line-through' },
  brandName: {
    fontFamily: 'var(--font-display, serif)',
    fontSize: '1.0625rem',
    fontWeight: 700,
    color: 'var(--color-text-primary, #fff)',
    margin: 0,
    lineHeight: 1.3,
  },
  detailRow: {
    display: 'flex',
    gap: '0.5rem',
    fontSize: '0.8125rem',
    lineHeight: 1.5,
  },
  detailLabel: {
    flexShrink: 0,
    width: '2.5rem',
    color: 'var(--color-text-muted, #888)',
    fontFamily: 'var(--font-mono, monospace)',
    fontSize: '0.6875rem',
    letterSpacing: '0.05em',
  },
  detailValue: {
    margin: 0,
    color: 'var(--color-text-secondary, #ccc)',
  },
  notes: {
    fontSize: '0.75rem',
    color: 'var(--color-text-muted, #888)',
    lineHeight: 1.6,
    margin: '0.25rem 0 0 0',
    paddingTop: '0.375rem',
    borderTop: '1px solid var(--color-outline-15)',
  },
  urlLink: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.25rem',
    fontSize: '0.75rem',
    color: 'var(--color-accent, #D4A853)',
    textDecoration: 'none',
  },
  drugPageLink: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.25rem',
    fontSize: '0.75rem',
    color: 'var(--color-primary-light, #e07aa0)',
    textDecoration: 'none',
  },
  noResults: {
    textAlign: 'center' as const,
    padding: '3rem 1rem',
    color: 'var(--color-text-muted, #888)',
    fontSize: '0.875rem',
  },
};

/* ── Component ── */

export default function DrugBrandIndex() {
  const locale = getLocale();
  const rawLocale = getLocaleFromPath();
  const t = UI[locale];
  const allBrands = useMemo(flattenBrands, []);

  const [search, setSearch] = useState('');
  const [region, setRegion] = useState<Region>('all');
  const [category, setCategory] = useState<DrugCategory | 'all'>('all');

  const filtered = useMemo(() => {
    let result = allBrands;

    if (region !== 'all') {
      result = result.filter((b) => classifyRegion(b.country) === region);
    }

    if (category !== 'all') {
      result = result.filter((b) => b.category === category);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (b) =>
          b.name.toLowerCase().includes(q) ||
          b.manufacturer.toLowerCase().includes(q) ||
          (b.activeIngredient?.toLowerCase().includes(q) ?? false) ||
          b.countryName.toLowerCase().includes(q) ||
          b.notes.toLowerCase().includes(q)
      );
    }

    return result;
  }, [allBrands, search, region, category]);

  const regions: { key: Region; label: string }[] = [
    { key: 'all', label: t.regionAll },
    { key: 'china', label: t.regionChina },
    { key: 'thailand', label: t.regionThailand },
    { key: 'india', label: t.regionIndia },
    { key: 'japan', label: t.regionJapan },
    { key: 'western', label: t.regionWestern },
    { key: 'other', label: t.regionOther },
  ];

  const categories: { key: DrugCategory | 'all'; label: string }[] = [
    { key: 'all', label: t.categoryAll },
    { key: 'estrogen', label: t.categoryEstrogen },
    { key: 'antiandrogen', label: t.categoryAntiandrogen },
    { key: 'progestogen', label: t.categoryProgestogen },
    { key: '5ari', label: t.category5ari },
    { key: 'banned', label: t.categoryBanned },
  ];

  const categoryIcons: Record<string, string> = {
    estrogen: '💊',
    antiandrogen: '🛡️',
    progestogen: '💜',
    '5ari': '💇',
    banned: '⛔',
  };

  function statusBadge(status?: string) {
    const map: Record<string, { label: string; style: CSSProperties }> = {
      approved: { label: t.statusApproved, style: S.badgeApproved },
      prescription: { label: t.statusPrescription, style: S.badgePrescription },
      grey: { label: t.statusGrey, style: S.badgeGrey },
      banned: { label: t.statusBanned, style: S.badgeBanned },
    };
    const entry = status ? map[status] : null;
    if (!entry) return null;
    return <span style={{ ...S.badge, ...entry.style }}>{entry.label}</span>;
  }

  function releasePointerFocus(button: HTMLButtonElement) {
    window.requestAnimationFrame(() => button.blur());
  }

  return (
    <div style={S.container}>
      <style>{`
        .dbi-filter-btn,
        .dbi-filter-btn:focus,
        .dbi-filter-btn:active {
          outline: none;
          box-shadow: none;
        }
        .dbi-filter-btn:focus-visible {
          outline: 2px solid var(--color-accent);
          outline-offset: 2px;
        }

        .dbi-filter-btn::-moz-focus-inner {
          border: 0 !important;
        }
      `}</style>
      {/* Disclaimer banner */}
      <div style={S.disclaimer} role="alert">
        {t.disclaimer}
      </div>

      {/* Search */}
      <div style={S.searchRow}>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t.searchPlaceholder}
          style={S.searchInput}
          aria-label={t.searchPlaceholder}
        />
      </div>

      {/* Region filter */}
      <div style={S.filterRow} role="radiogroup" aria-label={t.regionAll}>
        {regions.map((r) => (
          <button
            type="button"
            key={r.key}
            className="dbi-filter-btn"
            onClick={() => setRegion(r.key)}
            onPointerUp={(e) => releasePointerFocus(e.currentTarget)}
            style={{
              ...S.filterBtn,
              ...(region === r.key ? S.filterBtnActive : {}),
            }}
            aria-pressed={region === r.key}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* Category filter */}
      <div style={S.filterRow} role="radiogroup" aria-label={t.categoryAll}>
        {categories.map((c) => (
          <button
            type="button"
            key={c.key}
            className="dbi-filter-btn"
            onClick={() => setCategory(c.key)}
            onPointerUp={(e) => releasePointerFocus(e.currentTarget)}
            style={{
              ...S.filterBtn,
              ...(category === c.key ? S.filterBtnActive : {}),
            }}
            aria-pressed={category === c.key}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Stats */}
      <div style={S.stats}>
        {t.total} {filtered.length} {t.entries}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div style={S.noResults}>{t.noResults}</div>
      ) : (
        <div style={S.grid}>
          {filtered.map((b, i) => (
            <div
              key={`${b.drugId}-${i}`}
              style={{
                ...S.card,
                ...(b.status === 'banned' ? S.cardBanned : {}),
              }}
            >
              {/* Product image or icon placeholder */}
              {b.image ? (
                <img
                  src={b.image}
                  alt={b.name}
                  style={S.cardImage}
                  loading="lazy"
                  decoding="async"
                />
              ) : (
                <div style={S.cardIconPlaceholder} aria-hidden="true">
                  {categoryIcons[b.category] ?? '💊'}
                </div>
              )}

              {/* Card content */}
              <div style={S.cardInner}>
                {/* Header: flag + country + status badge */}
                <div style={S.cardHeader}>
                  <div style={S.cardHeaderLeft}>
                    <span style={S.flagEmoji} aria-hidden="true">
                      {flag(b.country)}
                    </span>
                    <span style={S.countryLabel}>{b.countryName}</span>
                  </div>
                  {statusBadge(b.status)}
                </div>

                {/* Brand name */}
                <h3 style={S.brandName}>{b.name}</h3>

                {/* Details */}
                <div>
                  <div style={S.detailRow}>
                    <span style={S.detailLabel}>{t.manufacturer}</span>
                    <span style={S.detailValue}>{b.manufacturer}</span>
                  </div>
                  <div style={S.detailRow}>
                    <span style={S.detailLabel}>{t.spec}</span>
                    <span style={S.detailValue}>{b.spec}</span>
                  </div>
                  {b.activeIngredient && (
                    <div style={S.detailRow}>
                      <span style={S.detailLabel}>{t.ingredient}</span>
                      <span style={S.detailValue}>{b.activeIngredient}</span>
                    </div>
                  )}
                </div>

                {/* Notes */}
                {b.notes && <p style={S.notes}>{b.notes}</p>}

                {/* Official URL */}
                {b.url && (
                  <a
                    href={b.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={S.urlLink}
                  >
                    {t.officialSite} ↗
                  </a>
                )}

                {/* Drug documentation page link */}
                {getDrugPageUrl(b.drugId, rawLocale) && (
                  <a
                    href={getDrugPageUrl(b.drugId, rawLocale)!}
                    style={S.drugPageLink}
                  >
                    {locale === 'en' ? 'Drug details →' : locale === 'ja' ? '薬物詳細 →' : '药物详情 →'}
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
