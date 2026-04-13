import { useState, useMemo, useRef, useCallback } from 'react';
import type { CSSProperties } from 'react';
import drugData from '../../data/drugs.json';

type Locale = 'zh' | 'en' | 'ja';

function getLocale(): Locale {
  if (typeof window !== 'undefined' && window.location.pathname.startsWith('/en')) return 'en';
  if (typeof window !== 'undefined' && window.location.pathname.startsWith('/ja')) return 'ja';
  if (typeof window !== 'undefined' && window.location.pathname.startsWith('/ko')) return 'en';
  return 'zh';
}

/* ── i18n ── */

const UI = {
  zh: {
    title: '药物速查卡片',
    subtitle: '长按或截图保存，分享到微信群',
    dose: '维持剂量',
    maxDose: '最大剂量',
    frequency: '频率',
    route: '途径',
    monitor: '监测',
    target: '目标',
    danger: '危险信号',
    evidence: '证据',
    brandLabel: 'HRT药典 · hrtyaku.com',
    banned: '绝对禁用',
    bannedNote: '此药物已被禁止用于跨性别 HRT',
    categoryLabels: { estrogen: '雌激素', antiandrogen: '抗雄激素', progestogen: '孕激素', '5ari': '5αRI', banned: '禁用' } as Record<string, string>,
    filterAll: '全部',
    longPressHint: '💡 长按卡片可保存图片，方便分享到群聊',
  },
  en: {
    title: 'Drug Quick Reference Cards',
    subtitle: 'Long-press or screenshot to save & share',
    dose: 'Maintenance',
    maxDose: 'Maximum',
    frequency: 'Frequency',
    route: 'Route',
    monitor: 'Monitor',
    target: 'Target',
    danger: 'Danger Signs',
    evidence: 'Evidence',
    brandLabel: 'HRT Yakuten · hrtyaku.com',
    banned: 'BANNED',
    bannedNote: 'This medication is banned for transgender HRT',
    categoryLabels: { estrogen: 'Estrogens', antiandrogen: 'Anti-Androgens', progestogen: 'Progestogens', '5ari': '5αRI', banned: 'Banned' } as Record<string, string>,
    filterAll: 'All',
    longPressHint: '💡 Long-press a card to save image for sharing',
  },
  ja: {
    title: '薬物クイックリファレンスカード',
    subtitle: '長押しまたはスクリーンショットで保存・共有',
    dose: '維持量',
    maxDose: '最大量',
    frequency: '頻度',
    route: '投与経路',
    monitor: 'モニタリング',
    target: '目標',
    danger: '危険信号',
    evidence: 'エビデンス',
    brandLabel: 'HRT药典 · hrtyaku.com',
    banned: '使用禁止',
    bannedNote: 'この薬物はトランスジェンダーHRTに禁止されています',
    categoryLabels: { estrogen: 'エストロゲン', antiandrogen: '抗アンドロゲン', progestogen: 'プロゲストーゲン', '5ari': '5αRI', banned: '禁止' } as Record<string, string>,
    filterAll: 'すべて',
    longPressHint: '💡 カードを長押しして画像を保存・共有できます',
  },
} as const;

/* ── Types ── */

interface DrugEntry {
  id: string;
  names: { generic: string; zh: string; ja?: string; brands?: string[] };
  category: string;
  routes?: {
    route?: string;
    doseRange?: { maintenance?: { min: number; max: number; unit: string }; maximum?: { value: number; unit: string } };
    frequency?: string;
    halfLife?: string;
    evidenceLevel?: string;
  }[];
  monitoring?: { test: string; target?: string; frequency?: string }[];
  sideEffects?: { effect: string; severity?: string }[];
  contraindications?: { absolute?: string[] };
}

type Category = 'all' | 'estrogen' | 'antiandrogen' | 'progestogen' | '5ari' | 'banned';

function classifyCategory(cat: string, id: string): string {
  if (['ethinylestradiol', 'conjugated-estrogens'].includes(id)) return 'banned';
  if (cat === 'estrogen') return 'estrogen';
  if (cat === 'antiandrogen') return 'antiandrogen';
  if (cat === 'progestogen') return 'progestogen';
  if (cat === '5ari') return '5ari';
  return cat;
}

/* ── Styles ── */

const S: Record<string, CSSProperties> = {
  container: { maxWidth: '72rem', margin: '0 auto' },
  hint: {
    textAlign: 'center' as const,
    padding: '0.75rem 1rem',
    marginBottom: '1.25rem',
    fontSize: '0.8125rem',
    color: 'var(--sl-color-text-accent, var(--color-accent, #D4A853))',
    background: 'var(--sl-color-accent-low, rgba(212, 168, 83, 0.1))',
    borderRadius: '8px',
    border: '1px solid var(--sl-color-accent, rgba(212, 168, 83, 0.3))',
  },
  filterRow: {
    display: 'flex',
    gap: '0.5rem',
    flexWrap: 'wrap' as const,
    marginBottom: '1.25rem',
    justifyContent: 'center',
  },
  filterBtn: {
    appearance: 'none' as const,
    WebkitAppearance: 'none' as const,
    MozAppearance: 'none' as const,
    WebkitTapHighlightColor: 'transparent',
    padding: '0.375rem 0.75rem',
    borderRadius: '6px',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: 'var(--sl-color-gray-5, rgba(200, 175, 190, 0.2))',
    background: 'var(--sl-color-bg-nav, rgba(26, 22, 37, 0.4))',
    color: 'var(--sl-color-text-accent, #aaa)',
    fontSize: '0.75rem',
    cursor: 'pointer',
    transition: 'all 0.15s',
    fontFamily: 'var(--font-body, sans-serif)',
    outline: 'none',
  },
  filterBtnActive: {
    background: 'var(--sl-color-accent-low, rgba(200, 75, 124, 0.25))',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: 'var(--sl-color-accent, rgba(200, 75, 124, 0.6))',
    color: 'var(--sl-color-text, #fff)',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: '1rem',
    alignItems: 'start',
  },
  card: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.625rem',
    padding: '1.25rem',
    borderRadius: '12px',
    background: 'var(--sl-color-bg-nav, rgba(26, 22, 37, 0.85))',
    border: '1px solid var(--sl-color-gray-5, rgba(86, 65, 71, 0.25))',
    position: 'relative' as const,
    overflow: 'hidden' as const,
  },
  cardBanned: {
    borderColor: 'var(--sl-color-red, rgba(220, 50, 50, 0.5))',
    background: 'var(--sl-color-red-low, rgba(60, 20, 20, 0.5))',
  },
  cardAccent: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    height: '3px',
    background: 'linear-gradient(90deg, var(--color-primary, #C84B7C), var(--color-accent, #D4A853))',
  },
  cardAccentBanned: {
    background: 'linear-gradient(90deg, #dc2626, #991b1b)',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '0.5rem',
  },
  drugName: {
    fontFamily: 'var(--font-display, serif)',
    fontSize: '1.125rem',
    fontWeight: 700,
    color: 'var(--sl-color-text, #fff)',
    margin: 0,
    lineHeight: 1.3,
  },
  drugNameEn: {
    fontSize: '0.75rem',
    color: 'var(--sl-color-gray-3, #999)',
    fontFamily: 'var(--font-mono, monospace)',
    marginTop: '2px',
  },
  badge: {
    padding: '0.125rem 0.5rem',
    borderRadius: '4px',
    fontSize: '0.625rem',
    fontWeight: 600,
    letterSpacing: '0.05em',
    textTransform: 'uppercase' as const,
    flexShrink: 0,
  },
  badgeEstrogen: { background: 'var(--sl-color-accent-low, rgba(200, 75, 124, 0.2))', color: 'var(--color-primary, #C84B7C)' },
  badgeAntiandrogen: { background: 'var(--sl-color-blue-low, rgba(0, 123, 255, 0.2))', color: 'var(--sl-color-blue-high, #6aa8ff)' },
  badgeProgestogen: { background: 'var(--sl-color-orange-low, rgba(255, 193, 7, 0.15))', color: 'var(--sl-color-orange-high, #D4A853)' },
  badge5ari: { background: 'var(--sl-color-green-low, rgba(40, 167, 69, 0.15))', color: 'var(--sl-color-green-high, #5cb85c)' },
  badgeBanned: { background: 'var(--sl-color-red-low, rgba(220, 53, 69, 0.25))', color: 'var(--sl-color-red-high, #ff6b6b)' },
  row: {
    display: 'flex',
    gap: '0.5rem',
    fontSize: '0.8125rem',
    lineHeight: 1.5,
  },
  label: {
    flexShrink: 0,
    width: '3.5rem',
    color: 'var(--sl-color-gray-3, var(--color-text-muted, #888))',
    fontFamily: 'var(--font-mono, monospace)',
    fontSize: '0.6875rem',
    letterSpacing: '0.05em',
  },
  value: {
    margin: 0,
    color: 'var(--sl-color-text, var(--color-text-secondary, #ccc))',
    fontWeight: 500,
  },
  valueDanger: {
    color: 'var(--sl-color-red-high, var(--color-danger, #ff6b6b))',
    fontWeight: 600,
  },
  divider: {
    height: '1px',
    background: 'var(--sl-color-gray-5, rgba(86, 65, 71, 0.2))',
    margin: '0.25rem 0',
  },
  footer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '0.25rem',
  },
  brand: {
    fontSize: '0.625rem',
    color: 'var(--sl-color-gray-3, var(--color-text-muted, #666))',
    fontFamily: 'var(--font-mono, monospace)',
    letterSpacing: '0.05em',
  },
  evidenceBadge: {
    padding: '0.0625rem 0.375rem',
    borderRadius: '3px',
    fontSize: '0.625rem',
    fontWeight: 700,
    background: 'var(--sl-color-green-low, rgba(40, 167, 69, 0.15))',
    color: 'var(--sl-color-green-high, #5cb85c)',
    fontFamily: 'var(--font-mono, monospace)',
  },
};

const BADGE_STYLES: Record<string, CSSProperties> = {
  estrogen: S.badgeEstrogen,
  antiandrogen: S.badgeAntiandrogen,
  progestogen: S.badgeProgestogen,
  '5ari': S.badge5ari,
  banned: S.badgeBanned,
};

/* ── Component ── */

export default function DrugCards() {
  const locale = getLocale();
  const t = UI[locale];
  const [category, setCategory] = useState<Category>('all');

  const drugs = useMemo(() => {
    const all = (drugData as DrugEntry[]).map((d) => ({
      ...d,
      displayCategory: classifyCategory(d.category, d.id),
    }));
    if (category === 'all') return all;
    return all.filter((d) => d.displayCategory === category);
  }, [category]);

  const categories: { key: Category; label: string }[] = [
    { key: 'all', label: t.filterAll },
    { key: 'estrogen', label: t.categoryLabels.estrogen },
    { key: 'antiandrogen', label: t.categoryLabels.antiandrogen },
    { key: 'progestogen', label: t.categoryLabels.progestogen },
    { key: '5ari', label: t.categoryLabels['5ari'] },
    { key: 'banned', label: t.categoryLabels.banned },
  ];

  return (
    <div style={S.container}>
      <style>{`.dc-filter-btn:focus, .dc-filter-btn:focus-visible { outline: none !important; box-shadow: none !important; }`}</style>
      <div style={S.hint}>{t.longPressHint}</div>

      <div style={S.filterRow}>
        {categories.map((c) => (
          <button
            key={c.key}
            className="dc-filter-btn"
            onClick={(e) => { setCategory(c.key); (e.target as HTMLElement).blur(); }}
            style={{ ...S.filterBtn, ...(category === c.key ? S.filterBtnActive : {}) }}
            aria-pressed={category === c.key}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div style={S.grid}>
        {drugs.map((drug) => {
          const r = drug.routes?.[0];
          const isBanned = drug.displayCategory === 'banned';
          const catLabel = t.categoryLabels[drug.displayCategory] ?? drug.category;

          return (
            <div
              key={drug.id}
              style={{ ...S.card, ...(isBanned ? S.cardBanned : {}) }}
            >
              {/* Accent bar */}
              <div style={{ ...S.cardAccent, ...(isBanned ? S.cardAccentBanned : {}) }} />

              {/* Header */}
              <div style={S.cardHeader}>
                <div>
                  <h3 style={S.drugName}>{drug.names.zh}</h3>
                  <div style={S.drugNameEn}>{drug.names.generic}</div>
                </div>
                <span style={{ ...S.badge, ...(BADGE_STYLES[drug.displayCategory] ?? {}) }}>
                  {catLabel}
                </span>
              </div>

              {isBanned ? (
                <div style={{ ...S.row, ...S.valueDanger }}>{t.bannedNote}</div>
              ) : (
                <>
                  {/* Dosing */}
                  {r?.doseRange?.maintenance && (
                    <div style={S.row}>
                      <span style={S.label}>{t.dose}</span>
                      <span style={S.value}>
                        {r.doseRange.maintenance.min === r.doseRange.maintenance.max
                          ? `${r.doseRange.maintenance.min} ${r.doseRange.maintenance.unit}`
                          : `${r.doseRange.maintenance.min}-${r.doseRange.maintenance.max} ${r.doseRange.maintenance.unit}`}
                      </span>
                    </div>
                  )}
                  {r?.doseRange?.maximum && r.doseRange.maximum.value > 0 && (
                    <div style={S.row}>
                      <span style={S.label}>{t.maxDose}</span>
                      <span style={{ ...S.value, ...S.valueDanger }}>
                        {r.doseRange.maximum.value} {r.doseRange.maximum.unit}
                      </span>
                    </div>
                  )}
                  {r?.frequency && (
                    <div style={S.row}>
                      <span style={S.label}>{t.frequency}</span>
                      <span style={S.value}>{r.frequency}</span>
                    </div>
                  )}

                  <div style={S.divider} />

                  {/* Monitoring */}
                  {drug.monitoring?.slice(0, 2).map((m, i) => (
                    <div key={i} style={S.row}>
                      <span style={S.label}>{i === 0 ? t.monitor : ''}</span>
                      <span style={S.value}>{m.test}: {m.target ?? ''} ({m.frequency ?? ''})</span>
                    </div>
                  ))}

                  {/* Danger signs */}
                  {drug.contraindications?.absolute && drug.contraindications.absolute.length > 0 && (
                    <>
                      <div style={S.divider} />
                      <div style={S.row}>
                        <span style={S.label}>{t.danger}</span>
                        <span style={{ ...S.value, ...S.valueDanger, fontSize: '0.75rem' }}>
                          {drug.contraindications.absolute.slice(0, 2).join(' · ')}
                        </span>
                      </div>
                    </>
                  )}
                </>
              )}

              {/* Footer: brand + evidence */}
              <div style={S.divider} />
              <div style={S.footer}>
                <span style={S.brand}>{t.brandLabel}</span>
                {r?.evidenceLevel && (
                  <span style={S.evidenceBadge}>{t.evidence} {r.evidenceLevel}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
