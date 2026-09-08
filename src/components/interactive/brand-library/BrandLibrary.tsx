/**
 * 药物图鉴 v2 — 主 React island
 * spec: docs/specs/brand-library-v2.md（§3 信息架构 / §5 视觉与交互 / §7 i18n·a11y）
 *
 * 设计概念：药典鉴别图版。每个成分是一张「图版 №」，品牌是图版上的标本；
 * 标本卡舞台永远同一构图，状态用印章不用彩色胶囊。
 *
 * 红线（本文件逐条守）：
 * - 零存储：无 localStorage / sessionStorage / cookie / URL 状态；不向任何端点发请求。
 * - 无购买链接、无药商推荐、无价格、无剂量建议；equivalence 原样展示为化学换算事实。
 * - 颜色只走 CSS 变量；品牌片剂色仅经 Pictogram props 与反查 chip 的 inline style 出现。
 * - 禁 emoji（含国旗）；图标全 inline SVG（24 网格、stroke 1.75、currentColor）。
 * - SSR 安全：render 里不读 window，locale 由 props 决定；路径探测只在 effect 里做。
 */

import { memo, useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import rawData from '../../../data/brand-library.json';
import rawDrugs from '../../../data/drugs.json';
import rawReferences from '../../../data/references.json';
import { getDrugPageUrl } from '../../../utils/drugLinks';
import Pictogram, { FORM_LABELS, SHAPE_LABELS } from './Pictogram';
import {
  CATEGORY_LABELS,
  COATING_LABELS,
  COLOR_FAMILY_LABELS,
  CONFIDENCE_LABELS,
  REGION_LABELS,
  SCORE_LABELS,
  HRT_USE_LABELS,
  STATUS_HINTS,
  STATUS_LABELS,
  fmt,
  getUI,
  label,
  labelOf,
  resolveUiLocale,
} from './i18n';
import type { Quad, UIStrings } from './i18n';
import {
  CATEGORY_ORDER,
  COLOR_FAMILY_ORDER,
  COLOR_FAMILY_SWATCH,
  COMPARE_LIMIT,
  EMPTY_FILTERS,
  FORM_ORDER,
  REGION_ORDER,
  SHAPE_ORDER,
  STATUS_ORDER,
  activeFilterCount,
  brandName,
  buildFacets,
  buildIngredientMap,
  buildSearchIndex,
  colorFamilyOf,
  comparePlates,
  filterBrands,
  groupIntoPlates,
  ingredientName,
  isBanned,
  localeFromPathname,
  makeContext,
  pickL10n,
  pickL10nList,
  rowHasDiff,
  sanitizeBrands,
  sortForList,
} from './search';
import type { FilterState, PickedText, Plate } from './search';
import type {
  Brand,
  BrandForm,
  BrandLibraryData,
  BrandStatus,
  ColorFamily,
  Ingredient,
  IngredientCategory,
  Locale,
  MarketRegion,
  TabletShape,
} from './types';
import './brand-library.css';

/* ────────────────────────────────────────────────────────────────
   数据（模块级：只算一次，不随渲染重建）
   ──────────────────────────────────────────────────────────────── */

const DATA = rawData as unknown as BrandLibraryData;
/** references.json → id 索引（只取链接所需字段；与 CitationRef 同一回退：url → doi → 文献库页） */
interface RefLite { id: string; title?: string; url?: string; doi?: string }
const REFERENCES = new Map<string, RefLite>(
  ((Array.isArray(rawReferences) ? rawReferences : Object.values(rawReferences as Record<string, unknown>)) as RefLite[])
    .filter((r) => r && typeof r.id === 'string')
    .map((r) => [r.id, { id: r.id, title: r.title, url: r.url, doi: r.doi }]),
);
const CJK_RE = /[\u3000-\u9fff\uff00-\uffef]/;
/** 规格串是 zh 写法（泵装/喷/瓶…）；非中文 UI 下给元素打 lang="zh" */
function strengthsOf(brand: Brand, locale: Locale): { text: string; lang?: string } {
  const text = (brand.strengths ?? []).join(' / ');
  return { text, lang: locale !== 'zh' && CJK_RE.test(text) ? 'zh' : undefined };
}

function referenceHref(id: string, rawLocale: string): string {
  const ref = REFERENCES.get(id);
  if (ref?.url) return ref.url;
  if (ref?.doi) return `https://doi.org/${ref.doi}`;
  return `/${rawLocale}/appendix-references/`;
}
const INGREDIENTS: Ingredient[] = Array.isArray(DATA.ingredients) ? DATA.ingredients : [];
const INGREDIENT_MAP = buildIngredientMap(INGREDIENTS);
const BRANDS = sanitizeBrands(Array.isArray(DATA.brands) ? DATA.brands : [], INGREDIENT_MAP);
const SEARCH_INDEX = buildSearchIndex(BRANDS, INGREDIENT_MAP);
const BRAND_MAP = new Map(BRANDS.map((brand) => [brand.id, brand]));

/** drugs.json：仅用于给图版头补一个学名/通用名，成分自身字段缺失时兜底 */
interface DrugRecord {
  id?: string;
  names?: { generic?: string; zh?: string };
}
const DRUG_NAMES = new Map<string, DrugRecord['names']>();
for (const drug of (rawDrugs as unknown as DrugRecord[]) ?? []) {
  if (drug && typeof drug.id === 'string') DRUG_NAMES.set(drug.id, drug.names);
}

/** 图版排序用的成分全表（筛选栏成分列表沿用同一顺序） */
const SORTED_INGREDIENTS = [...INGREDIENTS].sort((a, b) =>
  comparePlates(
    { ingredient: a, brands: [], regionCount: 0, banned: false },
    { ingredient: b, brands: [], regionCount: 0, banned: false },
  ),
);

const CATEGORIES_PRESENT = CATEGORY_ORDER.filter((category) =>
  INGREDIENTS.some((ingredient) => ingredient.category === category),
);
const REGIONS_PRESENT = REGION_ORDER.filter((region) =>
  BRANDS.some((brand) => brand.market?.region === region),
);
const STATUSES_PRESENT = STATUS_ORDER.filter((status) => BRANDS.some((brand) => brand.status === status));

/** 非四语页面 UI 回退到 en 时，根元素需显式 lang，避免屏幕阅读器按页面语言朗读英文控件 */
const UI_LANG: Record<Locale, string> = { zh: 'zh-CN', en: 'en', ja: 'ja', ko: 'ko' };

const STATUS_TONE: Record<BrandStatus, 'safe' | 'info' | 'caution' | 'danger' | 'muted'> = {
  prescription: 'safe',
  otc: 'info',
  approved: 'safe',
  grey: 'caution',
  cautioned: 'caution',
  discontinued: 'muted',
  banned: 'danger',
};

const NMPA_QUERY_URL = 'https://www.nmpa.gov.cn/datasearch/';

/* ────────────────────────────────────────────────────────────────
   小工具
   ──────────────────────────────────────────────────────────────── */

/** 枚举标签：键在数据里写错/缺失时返回 null，不抛 */
function enumLabel<K extends string>(
  map: Record<K, Quad>,
  key: K | undefined | null,
  locale: Locale,
): string | null {
  if (!key) return null;
  const quad = map[key] as Quad | undefined;
  return quad ? label(quad, locale) : null;
}

function formLabel(form: BrandForm | undefined, locale: Locale): string | null {
  if (!form) return null;
  const rec = FORM_LABELS[form] as { zh: string; en: string; ja: string; ko: string } | undefined;
  return rec ? labelOf(rec, locale) : null;
}

function shapeLabel(shape: TabletShape | undefined, locale: Locale): string | null {
  if (!shape) return null;
  const rec = SHAPE_LABELS[shape] as { zh: string; en: string; ja: string; ko: string } | undefined;
  return rec ? labelOf(rec, locale) : null;
}

/** Pictogram 需要一个合法剂型；数据缺失/写错时退回片剂构图 */
function safeForm(form: BrandForm | undefined): BrandForm {
  return form && FORM_LABELS[form] ? form : 'tablet';
}

/** 回退到中文原文时补 lang="zh"（spec §7 数据回退链） */
function Txt({ value, className }: { value: PickedText | null; className?: string }): ReactNode {
  if (!value) return null;
  return (
    <span className={className} lang={value.lang}>
      {value.text}
    </span>
  );
}

/* ────────────────────────────────────────────────────────────────
   图标（inline SVG，24 网格，currentColor）
   ──────────────────────────────────────────────────────────────── */

type IconName =
  | 'search'
  | 'close'
  | 'plates'
  | 'list'
  | 'filter'
  | 'external'
  | 'compare'
  | 'check'
  | 'frame'
  | 'arrow';

const ICON_PATHS: Record<IconName, ReactNode> = {
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M16.2 16.2 21 21" />
    </>
  ),
  close: <path d="M6 6l12 12M18 6 6 18" />,
  plates: (
    <>
      <rect x="3" y="3" width="7.5" height="7.5" />
      <rect x="13.5" y="3" width="7.5" height="7.5" />
      <rect x="3" y="13.5" width="7.5" height="7.5" />
      <rect x="13.5" y="13.5" width="7.5" height="7.5" />
    </>
  ),
  list: (
    <>
      <path d="M9 6h11M9 12h11M9 18h11" />
      <path d="M4.5 6h.01M4.5 12h.01M4.5 18h.01" />
    </>
  ),
  filter: <path d="M4 5h16l-6.2 7.2V19l-3.6 2v-8.8z" />,
  external: (
    <>
      <path d="M14 4h6v6" />
      <path d="M20 4 12 12" />
      <path d="M18 14v4.5A1.5 1.5 0 0 1 16.5 20h-11A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6H10" />
    </>
  ),
  compare: (
    <>
      <path d="M4 8h13" />
      <path d="m14 5 3 3-3 3" />
      <path d="M20 16H7" />
      <path d="m10 13-3 3 3 3" />
    </>
  ),
  check: <path d="m5 12.5 4.5 4.5L19 7" />,
  frame: (
    <>
      <rect x="3" y="5" width="18" height="14" />
      <circle cx="8.5" cy="10" r="1.5" />
      <path d="m21 16-5-5-4 4-2-2-4 4" />
    </>
  ),
  arrow: <path d="M5 12h13m-5-5 5 5-5 5" />,
};

function Icon({ name, className }: { name: IconName; className?: string }): ReactNode {
  return (
    <svg
      className={className ? `bl-icon ${className}` : 'bl-icon'}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      {ICON_PATHS[name]}
    </svg>
  );
}

/* ────────────────────────────────────────────────────────────────
   通用件
   ──────────────────────────────────────────────────────────────── */

function CountryTag({ code, name }: { code: string | undefined; name: PickedText | null }): ReactNode {
  const iso = (code ?? '').trim().slice(0, 2).toUpperCase();
  if (!iso && !name) return null;
  return (
    <span className="bl-tag">
      {iso ? <span className="bl-tag__code">{iso}</span> : null}
      <Txt value={name} />
    </span>
  );
}

function Seal({
  tone,
  text,
  className,
}: {
  tone: 'safe' | 'info' | 'caution' | 'danger' | 'muted';
  text: string;
  className?: string;
}): ReactNode {
  return (
    <span className={className ? `bl-seal ${className}` : 'bl-seal'} data-tone={tone}>
      {text}
    </span>
  );
}

/** 实拍优先；无图或加载失败回退数据驱动示意图（spec §4 数据纪律 3） */
function StageArt({
  brand,
  locale,
  size,
}: {
  brand: Brand;
  locale: Locale;
  size: number;
}): ReactNode {
  const [failed, setFailed] = useState(false);
  const onError = useCallback(() => setFailed(true), []);
  const image = brand.image;
  const alt = image ? pickL10n(image.alt, locale) : null;
  if (image?.src && !failed) {
    return (
      <img
        className="bl-card__img"
        src={image.src}
        alt={alt?.text ?? ''}
        lang={alt?.lang}
        loading="lazy"
        decoding="async"
        onError={onError}
      />
    );
  }
  const appearance = brand.appearance;
  const description = pickL10n(appearance?.description, locale);
  return (
    <Pictogram
      form={safeForm(brand.form)}
      shape={appearance?.shape}
      color={appearance?.color}
      secondaryColor={appearance?.secondaryColor}
      coating={appearance?.coating}
      score={appearance?.score}
      imprint={appearance?.imprint}
      size={size}
      title={description?.text ?? formLabel(brand.form, locale) ?? brand.id}
    />
  );
}

/* ────────────────────────────────────────────────────────────────
   原生 <dialog> 封装：ESC / 遮罩关闭 + 关闭后焦点回触发元素
   ──────────────────────────────────────────────────────────────── */

function Modal({
  open,
  onClose,
  labelledBy,
  children,
}: {
  open: boolean;
  onClose: () => void;
  labelledBy: string;
  children: ReactNode;
}): ReactNode {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const onBackdrop = useCallback(
    (event: React.MouseEvent<HTMLDialogElement>) => {
      if (event.target === ref.current) onClose();
    },
    [onClose],
  );

  return (
    <dialog
      ref={ref}
      className="bl-dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
      onClose={onClose}
      onClick={onBackdrop}
    >
      {open ? <div className="bl-dialog__inner">{children}</div> : null}
    </dialog>
  );
}

/* ────────────────────────────────────────────────────────────────
   标本卡
   ──────────────────────────────────────────────────────────────── */

interface CardProps {
  brand: Brand;
  ingredient: Ingredient;
  locale: Locale;
  t: UIStrings;
  selected: boolean;
  compareFull: boolean;
  onDetail: (id: string, trigger: HTMLElement | null) => void;
  onCompare: (id: string) => void;
  /** 图版折叠时超出 cap 的卡片：保留在 DOM（SSR/SEO）但 hidden */
  hidden?: boolean;
}

const SpecimenCard = memo(function SpecimenCard({
  brand,
  ingredient,
  locale,
  t,
  selected,
  compareFull,
  onDetail,
  onCompare,
  hidden = false,
}: CardProps): ReactNode {
  const banned = isBanned(brand, ingredient);
  const name = brandName(brand, locale);
  const notes = pickL10n(brand.notes, locale);
  const country = pickL10n(brand.market?.countryName, locale);
  const maker = pickL10n(brand.manufacturer?.name, locale);
  const statusText = enumLabel(STATUS_LABELS, brand.status, locale);
  const reason = pickL10n(ingredient.reason, locale);
  const strengthsL = strengthsOf(brand, locale);
  const strengths = strengthsL.text;
  const isPhoto = brand.image?.kind === 'photo' && Boolean(brand.image?.src);

  const handleDetail = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => onDetail(brand.id, event.currentTarget),
    [brand.id, onDetail],
  );
  const handleCompare = useCallback(() => onCompare(brand.id), [brand.id, onCompare]);

  return (
    <article className={banned ? 'bl-card bl-card--banned' : 'bl-card'} hidden={hidden}>
      <div className="bl-card__stage">
        <StageArt brand={brand} locale={locale} size={140} />
        <div className="bl-card__stagetop">
          {banned ? (
            <Seal tone="danger" text={t.bannedSeal} />
          ) : statusText ? (
            <Seal tone={STATUS_TONE[brand.status] ?? 'muted'} text={statusText} />
          ) : null}
          {brand.confidence === 'unverified' ? (
            <span className="bl-badge">{t.badgeUnverified}</span>
          ) : null}
        </div>
        <div className="bl-card__stagefoot">
          <span className={isPhoto ? 'bl-badge' : 'bl-badge bl-badge--hand'}>
            {isPhoto ? t.badgePhoto : t.badgeSchematic}
          </span>
        </div>
      </div>

      {banned && (reason || statusText) ? (
        <p className="bl-card__banreason">
          <Txt value={reason} />
          {!reason && statusText ? statusText : null}
        </p>
      ) : null}

      <div className="bl-card__body">
        <h3 className="bl-card__title" lang={name.lang}>
          {name.text}
        </h3>
        <p className="bl-card__spec">
          <Txt value={ingredientName(ingredient, locale)} />
          {strengths ? (
            <>
              <span className="bl-card__sep">·</span>
              <span className="bl-num" lang={strengthsL.lang}>{strengths}</span>
            </>
          ) : null}
        </p>
        <div className="bl-card__row">
          <CountryTag code={brand.market?.country} name={country} />
          <span className="bl-card__form">{formLabel(brand.form, locale)}</span>
        </div>
        {maker ? (
          <p className="bl-card__spec">
            <Txt value={maker} />
          </p>
        ) : null}
        {notes ? (
          <p className="bl-card__notes" lang={notes.lang}>
            {notes.text}
          </p>
        ) : null}
        <div className="bl-card__actions">
          <button type="button" className="bl-btn" onClick={handleDetail} aria-label={fmt(t.detailOf, { name: name.text })}>
            {t.detail}
          </button>
          <button
            type="button"
            className="bl-btn"
            aria-pressed={selected}
            disabled={!selected && compareFull}
            title={!selected && compareFull ? t.compareLimit : undefined}
            aria-label={selected ? fmt(t.removeFromCompare, { name: name.text }) : fmt(t.compareToggleOf, { name: name.text })}
            onClick={handleCompare}
          >
            <Icon name={selected ? 'check' : 'compare'} className="bl-icon--sm" />
            {t.compare}
          </button>
        </div>
      </div>
    </article>
  );
});

/* ────────────────────────────────────────────────────────────────
   图版
   ──────────────────────────────────────────────────────────────── */

interface PlateProps {
  plate: Plate;
  locale: Locale;
  rawLocale: string;
  t: UIStrings;
  compareIds: string[];
  onDetail: (id: string, trigger: HTMLElement | null) => void;
  onCompare: (id: string) => void;
  /** 图版默认展示的标本数（桌面 6 / 窄屏 3）；超出部分折叠 */
  cap: number;
  /** 有搜索/筛选时全部展开 */
  expandAll: boolean;
}

function PlateBlock({ plate, locale, rawLocale, t, compareIds, onDetail, onCompare, cap, expandAll }: PlateProps): ReactNode {
  const { ingredient } = plate;
  const [expanded, setExpanded] = useState(false);
  const collapsible = !expandAll && plate.brands.length > cap;
  const showAll = !collapsible || expanded;
  const hiddenCount = Math.max(0, plate.brands.length - cap);
  const title = ingredientName(ingredient, locale);
  const latin = ingredient.name?.inn ?? ingredient.name?.en ?? DRUG_NAMES.get(ingredient.primaryDrugId)?.generic;
  const ester = pickL10n(ingredient.ester, locale);
  const role = pickL10n(ingredient.role, locale);
  const equivalence = pickL10n(ingredient.equivalence, locale);
  const reason = pickL10n(ingredient.reason, locale);
  const plateNo = typeof ingredient.plate === 'number' ? String(ingredient.plate).padStart(2, '0') : null;
  const drugUrl = getDrugPageUrl(ingredient.primaryDrugId, rawLocale);
  const compareFull = compareIds.length >= COMPARE_LIMIT;

  return (
    <section className="bl-plate" aria-labelledby={`bl-plate-${ingredient.id}`}>
      <header className="bl-plate__head">
        <p className="bl-plate__kicker">
          {t.plateKicker}
          {plateNo ? <span className="bl-num bl-plate__no">№{plateNo}</span> : null}
        </p>
        <h2 className="bl-plate__title" id={`bl-plate-${ingredient.id}`}>
          <span lang={title.lang}>{title.text}</span>
          {latin && latin.toLowerCase() !== title.text.toLowerCase() ? (
            <span className="bl-plate__latin">{latin}</span>
          ) : null}
        </h2>
        {ester || role ? (
          <p className="bl-plate__sub">
            {ester ? (
              <>
                <b>{t.esterLabel}</b>
                <Txt value={ester} />
                {role ? ' · ' : null}
              </>
            ) : null}
            <Txt value={role} />
          </p>
        ) : null}
        {equivalence ? (
          <p className="bl-plate__equiv">
            <b>{t.equivalenceLabel}</b>
            <Txt value={equivalence} />
          </p>
        ) : null}
        {plate.banned && reason ? (
          <p className="bl-plate__equiv">
            <Seal tone="danger" text={t.bannedSeal} />{' '}
            <Txt value={reason} />
          </p>
        ) : !plate.banned && reason ? (
          <p className="bl-plate__equiv">
            <Seal tone="caution" text={enumLabel(HRT_USE_LABELS, ingredient.hrtUse, locale) ?? ''} />{' '}
            <Txt value={reason} />
          </p>
        ) : null}
        {ingredient.references && ingredient.references.length > 0 ? (
          <p className="bl-plate__refs">
            <b>{t.referencesLabel}</b>
            {ingredient.references.map((id) => (
              <span key={id} className="bl-plate__ref" title={REFERENCES.get(id)?.title ?? id}>
                <ExternalLink href={referenceHref(id, rawLocale)} hint={t.opensNewTab}>
                  {id}
                </ExternalLink>
              </span>
            ))}
          </p>
        ) : null}
        <div className="bl-plate__meta">
          <span className="bl-plate__count">
            {fmt(t.brandsUnit, { n: plate.brands.length })} · {fmt(t.regionsUnit, { n: plate.regionCount })}
          </span>
          {drugUrl ? (
            <a className="bl-plate__link" href={drugUrl}>
              {t.drugDetail}
              <Icon name="arrow" className="bl-icon--sm" />
            </a>
          ) : null}
        </div>
      </header>
      <div className="bl-grid" id={`bl-grid-${ingredient.id}`}>
        {plate.brands.map((brand, index) => (
          <SpecimenCard
            key={brand.id}
            brand={brand}
            ingredient={ingredient}
            locale={locale}
            t={t}
            selected={compareIds.includes(brand.id)}
            compareFull={compareFull}
            onDetail={onDetail}
            onCompare={onCompare}
            hidden={!showAll && index >= cap}
          />
        ))}
      </div>
      {collapsible ? (
        <button
          type="button"
          className="bl-btn bl-plate__more"
          aria-expanded={expanded}
          aria-controls={`bl-grid-${ingredient.id}`}
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? t.showLess : fmt(t.showMore, { n: hiddenCount })}
        </button>
      ) : null}
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────
   列表视图（语义 <table>）
   ──────────────────────────────────────────────────────────────── */

function ListView({
  brands,
  locale,
  t,
  compareIds,
  onDetail,
  onCompare,
}: {
  brands: Brand[];
  locale: Locale;
  t: UIStrings;
  compareIds: string[];
  onDetail: (id: string, trigger: HTMLElement | null) => void;
  onCompare: (id: string) => void;
}): ReactNode {
  const compareFull = compareIds.length >= COMPARE_LIMIT;
  return (
    <div className="bl-tablewrap">
      <table className="bl-table">
        <caption className="bl-sr">{t.listCaption}</caption>
        <thead>
          <tr>
            <th scope="col">{t.colImage}</th>
            <th scope="col">{t.colBrand}</th>
            <th scope="col">{t.colIngredient}</th>
            <th scope="col">{t.colStrength}</th>
            <th scope="col">{t.colMaker}</th>
            <th scope="col">{t.colStatus}</th>
            <th scope="col">{t.colAction}</th>
          </tr>
        </thead>
        <tbody>
          {brands.map((brand) => {
            const ingredient = INGREDIENT_MAP.get(brand.ingredientId);
            if (!ingredient) return null;
            const banned = isBanned(brand, ingredient);
            const name = brandName(brand, locale);
            const statusText = enumLabel(STATUS_LABELS, brand.status, locale);
            const selected = compareIds.includes(brand.id);
            return (
              <tr key={brand.id}>
                <td>
                  <span className="bl-table__thumb">
                    <StageArt brand={brand} locale={locale} size={40} />
                  </span>
                </td>
                <td>
                  <span className="bl-table__name" lang={name.lang}>
                    {name.text}
                  </span>
                </td>
                <td>
                  <Txt value={ingredientName(ingredient, locale)} />
                </td>
                <td className="bl-table__num" lang={strengthsOf(brand, locale).lang}>{strengthsOf(brand, locale).text}</td>
                <td>
                  <Txt value={pickL10n(brand.manufacturer?.name, locale)} />{' '}
                  <CountryTag code={brand.market?.country} name={pickL10n(brand.market?.countryName, locale)} />
                </td>
                <td>
                  {banned ? (
                    <Seal tone="danger" text={t.bannedSeal} />
                  ) : statusText ? (
                    <Seal tone={STATUS_TONE[brand.status] ?? 'muted'} text={statusText} />
                  ) : null}
                </td>
                <td>
                  <span className="bl-table__actions">
                    <button
                      type="button"
                      className="bl-btn"
                      aria-label={fmt(t.detailOf, { name: name.text })}
                      onClick={(event) => onDetail(brand.id, event.currentTarget)}
                    >
                      {t.detail}
                    </button>
                    <button
                      type="button"
                      className="bl-btn"
                      aria-pressed={selected}
                      disabled={!selected && compareFull}
                      aria-label={selected ? fmt(t.removeFromCompare, { name: name.text }) : fmt(t.compareToggleOf, { name: name.text })}
                      onClick={() => onCompare(brand.id)}
                    >
                      <Icon name={selected ? 'check' : 'compare'} className="bl-icon--sm" />
                    </button>
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────
   详情对话框（spec §5.4）
   ──────────────────────────────────────────────────────────────── */

function ExternalLink({
  href,
  hint,
  children,
}: {
  href: string;
  hint: string;
  children: ReactNode;
}): ReactNode {
  return (
    <a className="bl-link" href={href} target="_blank" rel="noopener noreferrer">
      {children}
      <span className="bl-sr">{hint}</span>
      <Icon name="external" className="bl-icon--sm" />
    </a>
  );
}

function DetailDialog({
  brand,
  locale,
  rawLocale,
  t,
  titleId,
  selected,
  compareFull,
  onCompare,
  onSelectBrand,
  onClose,
}: {
  brand: Brand;
  locale: Locale;
  rawLocale: string;
  t: UIStrings;
  titleId: string;
  selected: boolean;
  compareFull: boolean;
  onCompare: (id: string) => void;
  onSelectBrand: (id: string) => void;
  onClose: () => void;
}): ReactNode {
  const ingredient = INGREDIENT_MAP.get(brand.ingredientId);
  const name = brandName(brand, locale);
  const banned = ingredient ? isBanned(brand, ingredient) : brand.status === 'banned';
  const appearance = brand.appearance;
  const image = brand.image;
  const credit = image ? pickL10n(image.credit, locale) : null;
  const identification = pickL10nList(brand.identification, locale);
  const notes = pickL10n(brand.notes, locale);
  const packaging = pickL10n(brand.packaging, locale);
  const pack = pickL10n(brand.pack, locale);
  const maker = pickL10n(brand.manufacturer?.name, locale);
  const country = pickL10n(brand.market?.countryName, locale);
  const description = pickL10n(appearance?.description, locale);
  const colorName = pickL10n(appearance?.colorName, locale);
  const ester = ingredient ? pickL10n(ingredient.ester, locale) : null;
  const statusText = enumLabel(STATUS_LABELS, brand.status, locale);
  const drugUrl = getDrugPageUrl(brand.drugId, rawLocale);
  const siblings = ingredient
    ? BRANDS.filter((item) => item.ingredientId === brand.ingredientId && item.id !== brand.id)
    : [];

  const creditLine = image
    ? image.kind === 'photo'
      ? credit
        ? fmt(t.creditPhotoFrom, { credit: credit.text })
        : t.creditPhotoDefault
      : t.creditSchematic
    : t.creditSchematic;

  return (
    <>
      <div className="bl-dialog__head">
        <div>
          <span className="bl-dialog__kicker">
            {t.plateKicker}
            {ingredient && typeof ingredient.plate === 'number' ? (
              <span className="bl-num"> №{String(ingredient.plate).padStart(2, '0')}</span>
            ) : null}
          </span>
          <h2 className="bl-dialog__title" id={titleId} lang={name.lang}>
            {name.text}
          </h2>
        </div>
        <button type="button" className="bl-iconbtn bl-dialog__close" onClick={onClose} aria-label={t.close}>
          <Icon name="close" />
        </button>
      </div>

      <div className="bl-dialog__body">
        <div className="bl-detail">
          <div>
            <div className={banned ? 'bl-dialog__stage bl-dialog__stage--banned' : 'bl-dialog__stage'}>
              <StageArt key={brand.id} brand={brand} locale={locale} size={220} />
              {banned ? (
                <span className="bl-card__stagetop">
                  <Seal tone="danger" text={t.bannedSeal} />
                </span>
              ) : null}
            </div>
            <p className="bl-credit">
              <span className="bl-badge">{t.imageSource}</span> {creditLine}
            </p>
            <div className="bl-links">
              {drugUrl ? (
                <a className="bl-link" href={drugUrl}>
                  {t.drugDetail}
                  <Icon name="arrow" className="bl-icon--sm" />
                </a>
              ) : null}
              {brand.links?.official ? (
                <ExternalLink href={brand.links.official} hint={t.opensNewTab}>
                  {t.linkOfficial}
                </ExternalLink>
              ) : null}
              {brand.links?.leaflet ? (
                <ExternalLink href={brand.links.leaflet} hint={t.opensNewTab}>
                  {t.linkLeaflet}
                </ExternalLink>
              ) : null}
            </div>
            <div className="bl-links">
              <button
                type="button"
                className="bl-btn bl-btn--primary"
                aria-pressed={selected}
                aria-label={selected ? fmt(t.removeFromCompare, { name: name.text }) : fmt(t.compareToggleOf, { name: name.text })}
                disabled={!selected && compareFull}
                title={!selected && compareFull ? t.compareLimit : undefined}
                onClick={() => onCompare(brand.id)}
              >
                <Icon name={selected ? 'check' : 'compare'} className="bl-icon--sm" />
                {t.compare}
              </button>
            </div>
          </div>

          <div>
            <dl className="bl-dl">
              {ingredient ? (
                <>
                  <dt>{t.fieldIngredient}</dt>
                  <dd>
                    <Txt value={ingredientName(ingredient, locale)} />
                  </dd>
                </>
              ) : null}
              {ester ? (
                <>
                  <dt>{t.fieldEster}</dt>
                  <dd>
                    <Txt value={ester} />
                  </dd>
                </>
              ) : null}
              {(brand.strengths ?? []).length > 0 ? (
                <>
                  <dt>{t.fieldStrengths}</dt>
                  <dd className="bl-num" lang={strengthsOf(brand, locale).lang}>{strengthsOf(brand, locale).text}</dd>
                </>
              ) : null}
              {pack ? (
                <>
                  <dt>{t.fieldPack}</dt>
                  <dd>
                    <Txt value={pack} />
                  </dd>
                </>
              ) : null}
              <dt>{t.fieldForm}</dt>
              <dd>{formLabel(brand.form, locale) ?? t.none}</dd>
              {description ? (
                <>
                  <dt>{t.fieldAppearance}</dt>
                  <dd>
                    <Txt value={description} />
                  </dd>
                </>
              ) : null}
              {shapeLabel(appearance?.shape, locale) ? (
                <>
                  <dt>{t.fieldShape}</dt>
                  <dd>{shapeLabel(appearance?.shape, locale)}</dd>
                </>
              ) : null}
              {colorName || colorFamilyOf(appearance) ? (
                <>
                  <dt>{t.fieldColor}</dt>
                  <dd>
                    {colorName ? (
                      <Txt value={colorName} />
                    ) : (
                      enumLabel(COLOR_FAMILY_LABELS, colorFamilyOf(appearance), locale)
                    )}
                  </dd>
                </>
              ) : null}
              {enumLabel(COATING_LABELS, appearance?.coating, locale) ? (
                <>
                  <dt>{t.fieldCoating}</dt>
                  <dd>{enumLabel(COATING_LABELS, appearance?.coating, locale)}</dd>
                </>
              ) : null}
              {enumLabel(SCORE_LABELS, appearance?.score, locale) ? (
                <>
                  <dt>{t.fieldScore}</dt>
                  <dd>{enumLabel(SCORE_LABELS, appearance?.score, locale)}</dd>
                </>
              ) : null}
              {appearance?.imprint ? (
                <>
                  <dt>{t.fieldImprint}</dt>
                  <dd className="bl-num">{appearance.imprint}</dd>
                </>
              ) : null}
              {packaging ? (
                <>
                  <dt>{t.fieldPackaging}</dt>
                  <dd>
                    <Txt value={packaging} />
                  </dd>
                </>
              ) : null}
              {maker ? (
                <>
                  <dt>{t.fieldManufacturer}</dt>
                  <dd>
                    <Txt value={maker} />
                    {brand.manufacturer?.parent ? ` · ${brand.manufacturer.parent}` : null}
                  </dd>
                </>
              ) : null}
              <dt>{t.fieldMarket}</dt>
              <dd>
                <CountryTag code={brand.market?.country} name={country} />
                {(() => {
                  const region = enumLabel(REGION_LABELS, brand.market?.region, locale);
                  // 地区名与国名相同（如 中国大陆 / 中国大陆）时不重复
                  return region && region !== country?.text ? <> · {region}</> : null;
                })()}
              </dd>
              <dt>{t.fieldStatus}</dt>
              <dd>
                {statusText ?? t.none}
                {brand.regulatory?.code ? (
                  <>
                    {' · '}
                    <span className="bl-num">
                      {t.fieldApproval}
                      {': '}
                      {brand.regulatory.code}
                    </span>
                  </>
                ) : null}
                {brand.regulatory?.authority === 'NMPA' ? (
                  <>
                    {' '}
                    <ExternalLink href={NMPA_QUERY_URL} hint={t.opensNewTab}>
                      {t.nmpaQuery}
                    </ExternalLink>
                  </>
                ) : null}
              </dd>
              {identification ? (
                <>
                  <dt>{t.fieldIdentification}</dt>
                  <dd>
                    <ul lang={identification.lang}>
                      {identification.items.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </dd>
                </>
              ) : null}
              {notes ? (
                <>
                  <dt>{t.fieldNotes}</dt>
                  <dd>
                    <Txt value={notes} />
                  </dd>
                </>
              ) : null}
              {ingredient?.references && ingredient.references.length > 0 ? (
                <>
                  <dt>{t.referencesLabel}</dt>
                  <dd className="bl-plate__refs bl-plate__refs--inline">
                    {ingredient.references.map((id) => (
                      <span key={id} className="bl-plate__ref" title={REFERENCES.get(id)?.title ?? id}>
                        <ExternalLink href={referenceHref(id, rawLocale)} hint={t.opensNewTab}>
                          {id}
                        </ExternalLink>
                      </span>
                    ))}
                  </dd>
                </>
              ) : null}
              <dt>{t.fieldConfidence}</dt>
              <dd>{enumLabel(CONFIDENCE_LABELS, brand.confidence, locale) ?? t.none}</dd>
              {brand.lastVerified ? (
                <>
                  <dt>{t.fieldLastVerified}</dt>
                  <dd className="bl-num">{brand.lastVerified}</dd>
                </>
              ) : null}
            </dl>
          </div>
        </div>

        {siblings.length > 0 ? (
          <div className="bl-section">
            <h4 className="bl-section__title">{t.sameIngredient}</h4>
            <div className="bl-siblings">
              {siblings.map((sibling) => {
                const siblingName = brandName(sibling, locale);
                return (
                  <button
                    key={sibling.id}
                    type="button"
                    className="bl-sibling"
                    onClick={() => onSelectBrand(sibling.id)}
                  >
                    <span className="bl-sibling__name" lang={siblingName.lang}>
                      {siblingName.text}
                    </span>
                    <span className="bl-sibling__meta">
                      {(sibling.market?.country ?? '').toUpperCase()} · {(sibling.strengths ?? []).join(' / ')}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        <p className="bl-credit">{t.dataNote}</p>
      </div>
    </>
  );
}

/* ────────────────────────────────────────────────────────────────
   对比对话框（spec §5.5）
   ──────────────────────────────────────────────────────────────── */

interface CompareCell {
  text: string;
  lang?: 'zh';
  items?: string[];
}

function CompareDialog({
  brands,
  locale,
  t,
  titleId,
  onClose,
}: {
  brands: Brand[];
  locale: Locale;
  t: UIStrings;
  titleId: string;
  onClose: () => void;
}): ReactNode {
  const rows = useMemo(() => {
    const cell = (value: PickedText | null): CompareCell => ({
      text: value?.text ?? '',
      lang: value?.lang,
    });
    const plain = (value: string | null | undefined): CompareCell => ({ text: value ?? '' });

    const build = (labelText: string, mapper: (brand: Brand) => CompareCell) => ({
      label: labelText,
      cells: brands.map(mapper),
    });

    return [
      build(t.fieldIngredient, (brand) => {
        const ingredient = INGREDIENT_MAP.get(brand.ingredientId);
        return ingredient ? cell(ingredientName(ingredient, locale)) : plain('');
      }),
      build(t.fieldEster, (brand) => {
        const ingredient = INGREDIENT_MAP.get(brand.ingredientId);
        return cell(ingredient ? pickL10n(ingredient.ester, locale) : null);
      }),
      build(t.fieldStrengths, (brand) => plain((brand.strengths ?? []).join(' / '))),
      build(t.fieldPack, (brand) => cell(pickL10n(brand.pack, locale))),
      build(t.fieldForm, (brand) => plain(formLabel(brand.form, locale))),
      build(t.fieldAppearance, (brand) => cell(pickL10n(brand.appearance?.description, locale))),
      build(t.fieldManufacturer, (brand) => cell(pickL10n(brand.manufacturer?.name, locale))),
      build(t.fieldMarket, (brand) => cell(pickL10n(brand.market?.countryName, locale))),
      build(t.fieldStatus, (brand) => plain(enumLabel(STATUS_LABELS, brand.status, locale))),
      build(t.fieldIdentification, (brand) => {
        const list = pickL10nList(brand.identification, locale);
        return { text: list ? list.items.join(' / ') : '', lang: list?.lang, items: list?.items };
      }),
    ];
  }, [brands, locale, t]);

  return (
    <>
      <div className="bl-dialog__head">
        <h2 className="bl-dialog__title" id={titleId}>
          {t.compareTitle}
        </h2>
        <button type="button" className="bl-iconbtn bl-dialog__close" onClick={onClose} aria-label={t.close}>
          <Icon name="close" />
        </button>
      </div>
      <div className="bl-dialog__body">
        <div className="bl-comparewrap">
          <table className="bl-compare">
            <thead>
              <tr>
                <th scope="col">{t.compareField}</th>
                {brands.map((brand) => {
                  const name = brandName(brand, locale);
                  return (
                    <th scope="col" key={brand.id} lang={name.lang}>
                      {name.text}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const diff = rowHasDiff(row.cells.map((item) => item.text));
                return (
                  <tr key={row.label} data-diff={diff ? 'true' : 'false'}>
                    <th scope="row">
                      {row.label}
                      {diff ? <span className="bl-sr">（{t.compareDiff}）</span> : null}
                    </th>
                    {row.cells.map((item, index) => (
                      <td key={`${row.label}-${brands[index]?.id ?? index}`} lang={item.lang}>
                        {item.items ? (
                          <ul>
                            {item.items.map((entry) => (
                              <li key={entry}>{entry}</li>
                            ))}
                          </ul>
                        ) : (
                          item.text || t.none
                        )}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="bl-credit">{t.dataNote}</p>
      </div>
    </>
  );
}

/* ────────────────────────────────────────────────────────────────
   入口
   ──────────────────────────────────────────────────────────────── */

export default function BrandLibrary({ locale }: { locale?: Locale }): ReactNode {
  /*
   * SSR：render 里不读 window，先按 props 渲染，挂载后再按路径校正。
   * 两个 locale 分工：
   * - uiLocale：UI 文案与数据回退链，四语之一（props 优先 —— 非四语页面由集成方显式指定回退语）。
   * - rawLocale：站内链接用的路径语言码，17 语都要拿对（/de/ 页必须链到 /de/…，不能链去 /en/…），
   *   所以以实际路径为准；SSR 阶段先用 props，hydration 后自动校正。
   */
  const [pathLocale, setPathLocale] = useState<string | null>(null);
  useEffect(() => {
    setPathLocale(localeFromPathname(window.location.pathname));
  }, []);

  const uiLocale = resolveUiLocale(locale ?? pathLocale);
  const rawLocale = pathLocale ?? locale ?? 'zh';
  const t = getUI(uiLocale);

  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
  // 窄屏（<720）：图版每版只先露 3 张、反查条默认折叠、命令栏不 sticky（CSS）。SSR 按桌面渲染。
  const [isNarrow, setIsNarrow] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  const [finderOpen, setFinderOpen] = useState(true);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(max-width: 719px)');
    const apply = () => setIsNarrow(mq.matches);
    apply();
    if (mq.matches) setFinderOpen(false);
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);
  const [view, setView] = useState<'plates' | 'list'>('plates');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);

  const searchRef = useRef<HTMLInputElement>(null);
  const detailTrigger = useRef<HTMLElement | null>(null);
  const compareTrigger = useRef<HTMLElement | null>(null);
  const baseId = useId();
  const detailTitleId = `${baseId}-detail`;
  const compareTitleId = `${baseId}-compare`;

  /* 「/」聚焦搜索：不吞其他快捷键，也不在输入框里触发 */
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== '/' || event.ctrlKey || event.metaKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target?.isContentEditable) return;
      event.preventDefault();
      searchRef.current?.focus();
      searchRef.current?.select();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  const patch = useCallback((next: Partial<FilterState>) => {
    setFilters((prev) => ({ ...prev, ...next }));
  }, []);

  const ctx = useMemo(
    () => makeContext(BRANDS, INGREDIENT_MAP, filters.query, SEARCH_INDEX),
    [filters.query],
  );
  const visible = useMemo(() => filterBrands(BRANDS, filters, ctx), [filters, ctx]);
  const facets = useMemo(() => buildFacets(BRANDS, filters, ctx), [filters, ctx]);
  const groups = useMemo(() => groupIntoPlates(visible, INGREDIENT_MAP), [visible]);
  const listRows = useMemo(
    () => (view === 'list' ? sortForList(visible, INGREDIENT_MAP) : []),
    [visible, view],
  );

  const plateCount = groups.plates.length + groups.bannedPlates.length;
  const filterCount = activeFilterCount(filters);
  const plateCap = isNarrow ? 3 : 6;
  const expandAll = filterCount > 0;

  const onDetail = useCallback((id: string, trigger: HTMLElement | null) => {
    detailTrigger.current = trigger;
    setDetailId(id);
  }, []);

  const closeDetail = useCallback(() => {
    setDetailId(null);
    // <dialog> 在下一次 effect 才真正 close()；modal 打开期间外部是 inert，必须延后再还焦点
    const trigger = detailTrigger.current;
    detailTrigger.current = null;
    if (trigger) window.setTimeout(() => trigger.focus(), 0);
  }, []);

  const onCompare = useCallback((id: string) => {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((item) => item !== id);
      if (prev.length >= COMPARE_LIMIT) return prev;
      return [...prev, id];
    });
  }, []);

  const openCompare = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    compareTrigger.current = event.currentTarget;
    setCompareOpen(true);
  }, []);

  const closeCompare = useCallback(() => {
    setCompareOpen(false);
    const trigger = compareTrigger.current;
    compareTrigger.current = null;
    if (trigger) window.setTimeout(() => trigger.focus(), 0);
  }, []);

  const clearFilters = useCallback(() => setFilters(EMPTY_FILTERS), []);

  const detailBrand = detailId ? BRAND_MAP.get(detailId) ?? null : null;
  const compareBrands = compareIds
    .map((id) => BRAND_MAP.get(id))
    .filter((brand): brand is Brand => Boolean(brand));
  const compareFull = compareIds.length >= COMPARE_LIMIT;

  const ingredientOptions = useMemo(
    () =>
      SORTED_INGREDIENTS.filter(
        (ingredient) =>
          (filters.category === 'all' || ingredient.category === filters.category) &&
          ((facets.ingredients.get(ingredient.id) ?? 0) > 0 || filters.ingredientId === ingredient.id),
      ),
    [facets, filters.category, filters.ingredientId],
  );

  const formOptions = useMemo(
    () => FORM_ORDER.filter((form) => (facets.forms.get(form) ?? 0) > 0 || filters.form === form),
    [facets, filters.form],
  );
  const colorOptions = useMemo(
    () =>
      COLOR_FAMILY_ORDER.filter(
        (color) => (facets.colors.get(color) ?? 0) > 0 || filters.colorFamily === color,
      ),
    [facets, filters.colorFamily],
  );
  const shapeOptions = useMemo(
    () => SHAPE_ORDER.filter((shape) => (facets.shapes.get(shape) ?? 0) > 0 || filters.shape === shape),
    [facets, filters.shape],
  );

  const reverseActive = Boolean(filters.form || filters.colorFamily || filters.shape);

  return (
    <div
      className="bl-root"
      data-paper="true"
      data-hydrated={hydrated ? 'true' : undefined}
      lang={UI_LANG[uiLocale]}
    >
      {/* ── 命令栏 ── */}
      <div className="bl-bar">
        <div className="bl-search">
          <Icon name="search" className="bl-search__icon" />
          <input
            ref={searchRef}
            className="bl-search__input"
            type="search"
            value={filters.query}
            onChange={(event) => patch({ query: event.target.value })}
            placeholder={t.searchPlaceholder}
            aria-label={t.searchLabel}
            aria-describedby={`${baseId}-shortcut`}
            autoComplete="off"
            spellCheck={false}
          />
          <span className="bl-sr" id={`${baseId}-shortcut`}>
            {t.searchShortcutHint}
          </span>
          {filters.query ? (
            <button
              type="button"
              className="bl-iconbtn bl-search__clear"
              onClick={() => patch({ query: '' })}
              aria-label={t.searchClear}
            >
              <Icon name="close" className="bl-icon--sm" />
            </button>
          ) : null}
          <span className="bl-search__kbd" aria-hidden="true">
            <kbd className="bl-kbd">/</kbd>
          </span>
        </div>

        <div className="bl-viewtoggle" role="group" aria-label={t.viewLabel}>
          <button
            type="button"
            className="bl-viewbtn"
            aria-pressed={view === 'plates'}
            onClick={() => setView('plates')}
          >
            <Icon name="plates" className="bl-icon--sm" />
            {t.viewPlates}
          </button>
          <button
            type="button"
            className="bl-viewbtn"
            aria-pressed={view === 'list'}
            onClick={() => setView('list')}
          >
            <Icon name="list" className="bl-icon--sm" />
            {t.viewList}
          </button>
        </div>

        <p className="bl-summary" role="status" aria-live="polite">
          <span className="bl-sr">{t.resultsRegionLabel}: </span>
          {fmt(t.summary, { shown: visible.length, total: BRANDS.length, plates: plateCount })}
        </p>
      </div>

      {/* ── 反查条「我手里有一片…」 ── */}
      <section className="bl-reverse" aria-label={t.reverseTitle}>
        <div className="bl-reverse__head">
          <h2 className="bl-reverse__title">{t.reverseTitle}</h2>
          <span className="bl-reverse__hint">{t.reverseHint}</span>
          <button
            type="button"
            className="bl-btn bl-reverse__toggle"
            aria-expanded={finderOpen}
            aria-controls={`${baseId}-reverse-body`}
            onClick={() => setFinderOpen((v) => !v)}
          >
            {finderOpen ? t.showLess : t.reverseExpand}
          </button>
        </div>

        <div id={`${baseId}-reverse-body`} className="bl-reverse__body" hidden={!finderOpen}>
        <div className="bl-reverse__row">
          <span className="bl-reverse__label" id={`${baseId}-form`}>
            {t.reverseForm}
          </span>
          <div className="bl-chips" role="group" aria-labelledby={`${baseId}-form`}>
            {formOptions.map((form) => (
              <button
                key={form}
                type="button"
                className="bl-chip"
                aria-pressed={filters.form === form}
                onClick={() => patch({ form: filters.form === form ? null : form })}
              >
                <span aria-hidden="true">
                  <Pictogram form={form} size={26} />
                </span>
                {formLabel(form, uiLocale)}
                <span className="bl-chip__count bl-num">{facets.forms.get(form) ?? 0}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="bl-reverse__row">
          <span className="bl-reverse__label" id={`${baseId}-color`}>
            {t.reverseColor}
          </span>
          <div className="bl-chips" role="group" aria-labelledby={`${baseId}-color`}>
            {colorOptions.map((color) => (
              <button
                key={color}
                type="button"
                className="bl-chip bl-chip--color"
                aria-pressed={filters.colorFamily === color}
                onClick={() => patch({ colorFamily: filters.colorFamily === color ? null : color })}
              >
                {/* 色块是唯一允许出现具体色值的地方之一；文本标签同时给出，不靠颜色单独传达 */}
                <span
                  className="bl-chip__swatch"
                  style={{ background: COLOR_FAMILY_SWATCH[color] } as CSSProperties}
                  aria-hidden="true"
                />
                {enumLabel(COLOR_FAMILY_LABELS, color, uiLocale)}
                <span className="bl-chip__count bl-num">{facets.colors.get(color) ?? 0}</span>
              </button>
            ))}
          </div>
        </div>

        {shapeOptions.length > 0 ? (
          <div className="bl-reverse__row">
            <span className="bl-reverse__label" id={`${baseId}-shape`}>
              {t.reverseShape}
            </span>
            <div className="bl-chips" role="group" aria-labelledby={`${baseId}-shape`}>
              {shapeOptions.map((shape) => (
                <button
                  key={shape}
                  type="button"
                  className="bl-chip"
                  aria-pressed={filters.shape === shape}
                  onClick={() => patch({ shape: filters.shape === shape ? null : shape })}
                >
                  {shapeLabel(shape, uiLocale)}
                  <span className="bl-chip__count bl-num">{facets.shapes.get(shape) ?? 0}</span>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {reverseActive ? (
          <div className="bl-reverse__foot">
            <button
              type="button"
              className="bl-btn"
              onClick={() => patch({ form: null, colorFamily: null, shape: null })}
            >
              {t.reverseClear}
            </button>
          </div>
        ) : null}
        </div>
      </section>

      {/* ── 筛选栏 + 主栏 ── */}
      <div className="bl-shell">
        <div>
          <button
            type="button"
            className="bl-btn bl-filtertoggle"
            aria-expanded={filtersOpen}
            onClick={() => setFiltersOpen((prev) => !prev)}
          >
            <Icon name="filter" className="bl-icon--sm" />
            {filterCount > 0 ? fmt(t.filtersWithCount, { n: filterCount }) : t.filters}
          </button>

          <aside className="bl-aside" data-open={filtersOpen ? 'true' : 'false'} aria-label={t.filters}>
            <div className="bl-facet">
              <h2 className="bl-facet__title">{t.filterCategory}</h2>
              <div className="bl-facet__list">
                <button
                  type="button"
                  className="bl-chip"
                  aria-pressed={filters.category === 'all'}
                  onClick={() => patch({ category: 'all', ingredientId: 'all' })}
                >
                  {t.allCategories}
                </button>
                {CATEGORIES_PRESENT.map((category) => (
                  <button
                    key={category}
                    type="button"
                    className="bl-chip"
                    aria-pressed={filters.category === category}
                    onClick={() =>
                      patch({
                        category: filters.category === category ? 'all' : category,
                        ingredientId: 'all',
                      })
                    }
                  >
                    {enumLabel(CATEGORY_LABELS, category, uiLocale)}
                    <span className="bl-chip__count bl-num">{facets.categories.get(category) ?? 0}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="bl-facet bl-facet--stack">
              <h2 className="bl-facet__title">{t.filterIngredient}</h2>
              <div className="bl-facet__list">
                <button
                  type="button"
                  className="bl-chip"
                  aria-pressed={filters.ingredientId === 'all'}
                  onClick={() => patch({ ingredientId: 'all' })}
                >
                  {t.allIngredients}
                </button>
                {ingredientOptions.map((ingredient) => {
                  const name = ingredientName(ingredient, uiLocale);
                  return (
                    <button
                      key={ingredient.id}
                      type="button"
                      className="bl-chip"
                      aria-pressed={filters.ingredientId === ingredient.id}
                      onClick={() =>
                        patch({
                          ingredientId: filters.ingredientId === ingredient.id ? 'all' : ingredient.id,
                        })
                      }
                    >
                      <span lang={name.lang}>{name.text}</span>
                      <span className="bl-chip__count bl-num">{facets.ingredients.get(ingredient.id) ?? 0}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="bl-facet">
              <h2 className="bl-facet__title">{t.filterRegion}</h2>
              <div className="bl-facet__list">
                <button
                  type="button"
                  className="bl-chip"
                  aria-pressed={filters.region === 'all'}
                  onClick={() => patch({ region: 'all' })}
                >
                  {t.allRegions}
                </button>
                {REGIONS_PRESENT.filter(
                  (region) => (facets.regions.get(region) ?? 0) > 0 || filters.region === region,
                ).map((region) => (
                  <button
                    key={region}
                    type="button"
                    className="bl-chip"
                    aria-pressed={filters.region === region}
                    onClick={() => patch({ region: filters.region === region ? 'all' : region })}
                  >
                    {enumLabel(REGION_LABELS, region, uiLocale)}
                    <span className="bl-chip__count bl-num">{facets.regions.get(region) ?? 0}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="bl-facet">
              <h2 className="bl-facet__title">{t.filterStatus}</h2>
              <div className="bl-facet__list">
                <button
                  type="button"
                  className="bl-chip"
                  aria-pressed={filters.status === 'all'}
                  onClick={() => patch({ status: 'all' })}
                >
                  {t.allStatuses}
                </button>
                {STATUSES_PRESENT.filter(
                  (status) => (facets.statuses.get(status) ?? 0) > 0 || filters.status === status,
                ).map((status) => (
                  <button
                    key={status}
                    type="button"
                    className="bl-chip"
                    aria-pressed={filters.status === status}
                    onClick={() => patch({ status: filters.status === status ? 'all' : status })}
                  >
                    {enumLabel(STATUS_LABELS, status, uiLocale)}
                    <span className="bl-chip__count bl-num">{facets.statuses.get(status) ?? 0}</span>
                  </button>
                ))}
              </div>
            </div>

            {filterCount > 0 ? (
              <div className="bl-facet">
                <button type="button" className="bl-btn" onClick={clearFilters}>
                  {t.clearFilters}
                </button>
              </div>
            ) : null}
          </aside>
        </div>

        <div className="bl-main">
          {visible.length === 0 ? (
            <div className="bl-empty">
              <span className="bl-empty__frame">
                <Icon name="frame" />
              </span>
              <p className="bl-empty__title">{t.noResults}</p>
              <p className="bl-empty__hint">{t.noResultsHint}</p>
              <button type="button" className="bl-btn bl-btn--primary" onClick={clearFilters}>
                {t.clearFilters}
              </button>
            </div>
          ) : view === 'list' ? (
            <ListView
              brands={listRows}
              locale={uiLocale}
              t={t}
              compareIds={compareIds}
              onDetail={onDetail}
              onCompare={onCompare}
            />
          ) : (
            <>
              {groups.plates.map((plate) => (
                <PlateBlock
                  key={plate.ingredient.id}
                  plate={plate}
                  locale={uiLocale}
                  rawLocale={rawLocale}
                  t={t}
                  compareIds={compareIds}
                  onDetail={onDetail}
                  onCompare={onCompare}
                  cap={plateCap}
                  expandAll={expandAll}
                />
              ))}

              {groups.bannedPlates.length > 0 ? (
                <section className="bl-banned-section" aria-labelledby={`${baseId}-banned`}>
                  <h2 className="bl-banned-section__title" id={`${baseId}-banned`}>
                    {t.bannedSection}
                  </h2>
                  <p className="bl-banned-section__note">{t.bannedSectionNote}</p>
                  {groups.bannedPlates.map((plate) => (
                    <PlateBlock
                      key={plate.ingredient.id}
                      plate={plate}
                      locale={uiLocale}
                      rawLocale={rawLocale}
                      t={t}
                      compareIds={compareIds}
                      onDetail={onDetail}
                      onCompare={onCompare}
                      cap={plateCap}
                      expandAll={expandAll}
                    />
                  ))}
                </section>
              ) : null}
            </>
          )}
        </div>
      </div>

      {/* ── 页尾说明：状态图例 / 数据来源 / 示意图 / 纠错 ── */}
      <footer className="bl-foot" aria-label={t.footLegend}>
        <div className="bl-foot__legend">
          <span className="bl-kicker">{t.footLegend}</span>
          <ul className="bl-foot__legend-list">
            {STATUSES_PRESENT.map((status) => (
              <li key={status} className="bl-foot__legend-item">
                <Seal tone={STATUS_TONE[status] ?? 'muted'} text={enumLabel(STATUS_LABELS, status, uiLocale) ?? status} />
                <span className="bl-foot__hint">{enumLabel(STATUS_HINTS, status, uiLocale) ?? ''}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="bl-foot__cols">
          <section className="bl-foot__col">
            <h2 className="bl-foot__title">{t.footData}</h2>
            <p>{t.footDataText}</p>
            <p className="bl-num bl-foot__meta">{fmt(t.footReviewed, { date: DATA.lastReviewed ?? '—' })}</p>
          </section>
          <section className="bl-foot__col">
            <h2 className="bl-foot__title">{t.footSchematic}</h2>
            <p>{t.footSchematicText}</p>
          </section>
          <section className="bl-foot__col">
            <h2 className="bl-foot__title">{t.footFix}</h2>
            <p>{t.footFixText}</p>
            <a className="bl-foot__link" href={`/${rawLocale}/about/`}>
              {t.footFixLink}
            </a>
          </section>
        </div>
      </footer>

      {/* ── 对比托盘 ── */}
      {compareBrands.length > 0 ? (
        <div className="bl-tray" role="region" aria-label={t.compareTray}>
          <span className="bl-tray__label">{fmt(t.compareSelected, { n: compareBrands.length })}</span>
          <div className="bl-tray__items">
            {compareBrands.map((brand) => {
              const name = brandName(brand, uiLocale);
              return (
                <button
                  key={brand.id}
                  type="button"
                  className="bl-chip"
                  aria-label={fmt(t.removeFromCompare, { name: name.text })}
                  onClick={() => onCompare(brand.id)}
                >
                  <span lang={name.lang}>{name.text}</span>
                  <Icon name="close" className="bl-icon--sm" />
                </button>
              );
            })}
          </div>
          <div className="bl-tray__actions">
            <button type="button" className="bl-btn bl-btn--primary" onClick={openCompare}>
              {fmt(t.compareOpen, { n: compareBrands.length })}
            </button>
            <button type="button" className="bl-btn" onClick={() => setCompareIds([])}>
              {t.compareClear}
            </button>
          </div>
        </div>
      ) : null}

      {/* ── 弹层 ── */}
      <Modal open={detailBrand !== null} onClose={closeDetail} labelledBy={detailTitleId}>
        {detailBrand ? (
          <DetailDialog
            brand={detailBrand}
            locale={uiLocale}
            rawLocale={rawLocale}
            t={t}
            titleId={detailTitleId}
            selected={compareIds.includes(detailBrand.id)}
            compareFull={compareFull}
            onCompare={onCompare}
            onSelectBrand={setDetailId}
            onClose={closeDetail}
          />
        ) : null}
      </Modal>

      <Modal
        open={compareOpen && compareBrands.length > 0}
        onClose={closeCompare}
        labelledBy={compareTitleId}
      >
        {compareBrands.length > 0 ? (
          <CompareDialog
            brands={compareBrands}
            locale={uiLocale}
            t={t}
            titleId={compareTitleId}
            onClose={closeCompare}
          />
        ) : null}
      </Modal>
    </div>
  );
}
