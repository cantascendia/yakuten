/**
 * 药物图鉴 v2.1 — 主 React island
 * spec: docs/specs/brand-library-v2.1-visual.md（§0 逐区 / §1 信息架构 / §2 PackArt / §3 token）
 *
 * 设计概念：干净的浅色目录（owner 参考稿）。左栏复选框筛选 + 右侧品牌族卡片网格；
 * 一张卡 = 一个品牌族（同成分同国际名的多国版本合并），版本切换在详情对话框里做。
 *
 * 红线（本文件逐条守）：
 * - 零存储：无 localStorage / sessionStorage / cookie / URL 状态；不向任何端点发请求。
 * - 无购买链接、无药商推荐、无价格、无剂量建议。
 * - 颜色只走 CSS 变量；品牌片剂色仅经 Pictogram / PackArt props 与反查 chip 的 inline style 出现。
 * - 禁 emoji（含国旗）；图标全 inline SVG（24 网格、stroke 1.75、currentColor）。
 * - SSR 安全：render 里不读 window，locale 由 props 决定；路径探测只在 effect 里做。
 */

import { memo, useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import rawData from '../../../data/brand-library.json';
import rawDrugs from '../../../data/drugs.json';
import rawReferences from '../../../data/references.json';
import { getDrugPageUrl } from '../../../utils/drugLinks';
import PackArt from './PackArt';
import Pictogram, { FORM_LABELS, SHAPE_LABELS } from './Pictogram';
import {
  CATEGORY_LABELS,
  COATING_LABELS,
  COLOR_FAMILY_LABELS,
  CONFIDENCE_LABELS,
  FORM_GROUP_LABELS,
  REGION_BUCKET_LABELS,
  REGION_LABELS,
  SCORE_LABELS,
  STATUS_LABELS,
  fmt,
  getUI,
  label,
  labelOf,
  resolveUiLocale,
} from './i18n';
import type { Quad, UIStrings } from './i18n';
import {
  COLOR_FAMILY_ORDER,
  COLOR_FAMILY_SWATCH,
  COMPARE_LIMIT,
  EMPTY_FILTERS,
  FORM_GROUP_ORDER,
  FORM_ORDER,
  REGION_BUCKET_ORDER,
  RESOURCE_ORDER,
  SHAPE_ORDER,
  activeFilterCount,
  brandName,
  buildFacets,
  buildIngredientMap,
  buildSearchIndex,
  colorFamilyOf,
  familyName,
  filterBrands,
  groupFamilies,
  hasPhoto,
  ingredientName,
  isBanned,
  localeFromPathname,
  makeContext,
  pickL10n,
  pickL10nList,
  rowHasDiff,
  sanitizeBrands,
  sortFamilies,
  toggleIn,
} from './search';
import type {
  BrandFamily,
  FilterState,
  FormGroup,
  PickedText,
  RegionBucket,
  ResourceKind,
  SortKey,
} from './search';
import type {
  Brand,
  BrandForm,
  BrandLibraryData,
  ColorFamily,
  Ingredient,
  IngredientCategory,
  Locale,
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
const CJK_RE = /[　-鿿＀-￯]/;
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

/** drugs.json：仅用于补一个学名/通用名，成分自身字段缺失时兜底 */
interface DrugRecord {
  id?: string;
  names?: { generic?: string; zh?: string };
}
const DRUG_NAMES = new Map<string, DrugRecord['names']>();
for (const drug of (rawDrugs as unknown as DrugRecord[]) ?? []) {
  if (drug && typeof drug.id === 'string') DRUG_NAMES.set(drug.id, drug.names);
}

/** 左栏「药物类别」的显示顺序（§0-6：GnRH 作为第 5 项） */
const CATEGORY_FILTER_ORDER: IngredientCategory[] = [
  'estrogen',
  'antiandrogen',
  'progestogen',
  '5ari',
  'gnrh',
];
const CATEGORIES_PRESENT = CATEGORY_FILTER_ORDER.filter((category) =>
  INGREDIENTS.some((ingredient) => ingredient.category === category),
);

/** 非四语页面 UI 回退到 en 时，根元素需显式 lang，避免屏幕阅读器按页面语言朗读英文控件 */
const UI_LANG: Record<Locale, string> = { zh: 'zh-CN', en: 'en', ja: 'ja', ko: 'ko' };

const NMPA_QUERY_URL = 'https://www.nmpa.gov.cn/datasearch/';

const SORT_OPTIONS: { key: SortKey; labelKey: 'sortName' | 'sortIngredient' | 'sortRegion' }[] = [
  { key: 'name', labelKey: 'sortName' },
  { key: 'ingredient', labelKey: 'sortIngredient' },
  { key: 'region', labelKey: 'sortRegion' },
];

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

/** Pictogram / PackArt 需要一个合法剂型；数据缺失或写错时退回片剂构图 */
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

/** 族内各版本的地区标签（多国用「 / 」连接） */
function regionLine(family: BrandFamily, locale: Locale): string {
  const names = family.regions
    .map((region) => enumLabel(REGION_LABELS, region, locale))
    .filter((name): name is string => Boolean(name));
  return names.join(' / ');
}

function formLine(family: BrandFamily, locale: Locale): string {
  const names = family.forms
    .map((form) => formLabel(form, locale))
    .filter((name): name is string => Boolean(name));
  return names.join(' / ');
}

/** 一个版本在版本切换条上的名字：地区名（同族同地区多条时补剂型） */
function versionLabel(family: BrandFamily, brand: Brand, locale: Locale): PickedText {
  const country = pickL10n(brand.market?.countryName, locale);
  const base = country?.text ?? enumLabel(REGION_LABELS, brand.market?.region, locale) ?? brand.id;
  const duplicated =
    family.brands.filter((item) => (pickL10n(item.market?.countryName, locale)?.text ?? '') === base).length > 1;
  const form = duplicated ? formLabel(brand.form, locale) : null;
  const text = form ? `${base} · ${form}` : base;
  return country?.lang ? { text, lang: country.lang } : { text };
}

/* ────────────────────────────────────────────────────────────────
   图标（inline SVG，24 网格，currentColor）
   ──────────────────────────────────────────────────────────────── */

type IconName =
  | 'search'
  | 'close'
  | 'grid'
  | 'list'
  | 'filter'
  | 'external'
  | 'compare'
  | 'check'
  | 'doc'
  | 'info'
  | 'chat'
  | 'chevron'
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
  grid: (
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
      <rect x="3.5" y="5.5" width="10" height="13" />
      <path d="M16.5 8.5h4v10h-10" />
    </>
  ),
  check: <path d="m5 12.5 4.5 4.5L19 7" />,
  doc: (
    <>
      <path d="M6 3.5h8L19 8v12.5H6z" />
      <path d="M13.5 3.5V8H19" />
      <path d="M9 12.5h7M9 16h5" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5.5M12 7.8h.01" />
    </>
  ),
  chat: (
    <>
      <path d="M4.5 5.5h15v10h-9l-4 3.5v-3.5h-2z" />
      <path d="M8.5 10h7" />
    </>
  ),
  chevron: <path d="m6 9.5 6 6 6-6" />,
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

/** 类别胶囊（§0-8 六色）；禁用族显示红色「不适用于 HRT」 */
function CategoryPill({
  category,
  banned,
  locale,
  t,
}: {
  category: IngredientCategory;
  banned: boolean;
  locale: Locale;
  t: UIStrings;
}): ReactNode {
  const tone = banned ? 'banned' : category;
  const text = banned ? t.bannedSeal : enumLabel(CATEGORY_LABELS, category, locale) ?? '';
  if (!text) return null;
  return (
    <span className="bl-pill" data-cat={tone}>
      {text}
    </span>
  );
}

/** 卡片 / 表格里的图：实拍优先，否则 PackArt 包装示意（§2） */
function Artwork({
  family,
  locale,
  t,
}: {
  family: BrandFamily;
  locale: Locale;
  t: UIStrings;
}): ReactNode {
  const [failed, setFailed] = useState(false);
  const onError = useCallback(() => setFailed(true), []);
  const photoBrand = family.photo;
  const image = photoBrand?.image;
  const name = familyName(family, locale);

  if (image?.src && !failed) {
    const alt = pickL10n(image.alt, locale);
    return (
      <>
        <img
          className="bl-art__photo"
          src={image.src}
          alt={alt?.text ?? name.text}
          lang={alt?.lang}
          loading="lazy"
          decoding="async"
          onError={onError}
        />
        <span className="bl-art__tag">{t.badgePhoto}</span>
      </>
    );
  }

  const primary = family.primary;
  const appearance = primary.appearance;
  return (
    <>
      <PackArt
        className="bl-art__svg"
        name={primary.name?.intl ?? name.text}
        strength={(primary.strengths ?? [])[0]}
        maker={primary.manufacturer?.parent ?? primary.manufacturer?.name?.en ?? primary.manufacturer?.name?.zh}
        category={family.ingredient.category}
        banned={family.banned}
        form={safeForm(primary.form)}
        shape={appearance?.shape}
        color={appearance?.color}
        secondaryColor={appearance?.secondaryColor}
        coating={appearance?.coating}
        score={appearance?.score}
        title={fmt(t.packAlt, { name: name.text })}
      />
      <span className="bl-art__tag">{t.badgePack}</span>
    </>
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
   品牌族卡片（§0-8）
   ──────────────────────────────────────────────────────────────── */

interface CardProps {
  family: BrandFamily;
  locale: Locale;
  t: UIStrings;
  selected: boolean;
  compareFull: boolean;
  onDetail: (familyId: string, brandId: string | null, trigger: HTMLElement | null) => void;
  onCompare: (id: string) => void;
}

const FamilyCard = memo(function FamilyCard({
  family,
  locale,
  t,
  selected,
  compareFull,
  onDetail,
  onCompare,
}: CardProps): ReactNode {
  const name = familyName(family, locale);
  const ingredient = family.ingredient;
  const reason = pickL10n(ingredient.reason, locale);
  const regions = regionLine(family, locale);
  const forms = formLine(family, locale);
  const compareId = family.primary.id;

  const handleDetail = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => onDetail(family.id, null, event.currentTarget),
    [family.id, onDetail],
  );
  const handleCompare = useCallback(() => onCompare(compareId), [compareId, onCompare]);

  return (
    <article className="bl-card" data-selected={selected ? 'true' : undefined} data-banned={family.banned ? 'true' : undefined}>
      <div className="bl-card__art">
        <Artwork family={family} locale={locale} t={t} />
        {family.banned ? <span className="bl-card__hatch" aria-hidden="true" /> : null}
      </div>

      <div className="bl-card__body">
        <h3 className="bl-card__name" lang={name.lang}>
          {name.text}
        </h3>
        <p className="bl-card__pills">
          <CategoryPill category={ingredient.category} banned={family.banned} locale={locale} t={t} />
        </p>
        {family.banned && reason ? (
          <p className="bl-card__reason" lang={reason.lang}>
            {reason.text}
          </p>
        ) : null}

        <dl className="bl-kv">
          <div className="bl-kv__row">
            <dt>{t.cardIngredient}</dt>
            <dd>
              <Txt value={ingredientName(ingredient, locale)} />
            </dd>
          </div>
          <div className="bl-kv__row">
            <dt>{t.cardForm}</dt>
            <dd className="bl-card__form">{forms || t.none}</dd>
          </div>
          <div className="bl-kv__row">
            <dt>{t.cardRegions}</dt>
            <dd>{regions || t.none}</dd>
          </div>
          <div className="bl-kv__row">
            <dt>{t.cardSpecs}</dt>
            <dd>
              <button
                type="button"
                className="bl-linkbtn"
                aria-label={fmt(t.cardSpecsOf, { name: name.text })}
                onClick={(event) => onDetail(family.id, null, event.currentTarget)}
              >
                {t.cardSpecsLink}
              </button>
            </dd>
          </div>
        </dl>
      </div>

      <div className="bl-card__foot">
        <button
          type="button"
          className="bl-linkbtn bl-linkbtn--strong"
          onClick={handleDetail}
          aria-label={fmt(t.detailOf, { name: name.text })}
        >
          {t.cardDetail}
          <Icon name="arrow" className="bl-icon--sm" />
        </button>
        <button
          type="button"
          className="bl-cmpbtn"
          aria-pressed={selected}
          disabled={!selected && compareFull}
          title={!selected && compareFull ? t.compareLimit : undefined}
          aria-label={
            selected ? fmt(t.removeFromCompare, { name: name.text }) : fmt(t.compareToggleOf, { name: name.text })
          }
          onClick={handleCompare}
        >
          <Icon name={selected ? 'check' : 'compare'} className="bl-icon--sm" />
          {t.compare}
        </button>
      </div>
    </article>
  );
});

/* ────────────────────────────────────────────────────────────────
   列表视图（语义 <table>，§1）
   ──────────────────────────────────────────────────────────────── */

function ListView({
  families,
  locale,
  t,
  compareIds,
  onDetail,
  onCompare,
}: {
  families: BrandFamily[];
  locale: Locale;
  t: UIStrings;
  compareIds: string[];
  onDetail: (familyId: string, brandId: string | null, trigger: HTMLElement | null) => void;
  onCompare: (id: string) => void;
}): ReactNode {
  const compareFull = compareIds.length >= COMPARE_LIMIT;
  return (
    <div className="bl-tablewrap">
      <table className="bl-table">
        <caption className="bl-sr">{t.listCaption}</caption>
        <thead>
          <tr>
            <th scope="col">{t.colBrand}</th>
            <th scope="col">{t.cardIngredient}</th>
            <th scope="col">{t.cardForm}</th>
            <th scope="col">{t.cardRegions}</th>
            <th scope="col">{t.colStatus}</th>
            <th scope="col">{t.colAction}</th>
          </tr>
        </thead>
        <tbody>
          {families.map((family) => {
            const name = familyName(family, locale);
            const selected = compareIds.includes(family.primary.id);
            const statusText = enumLabel(STATUS_LABELS, family.primary.status, locale);
            return (
              <tr key={family.id}>
                <th scope="row">
                  <span className="bl-table__name" lang={name.lang}>
                    {name.text}
                  </span>
                </th>
                <td>
                  <Txt value={ingredientName(family.ingredient, locale)} />
                </td>
                <td className="bl-card__form">{formLine(family, locale) || t.none}</td>
                <td>{regionLine(family, locale) || t.none}</td>
                <td>
                  {family.banned ? (
                    <span className="bl-pill" data-cat="banned">
                      {t.bannedSeal}
                    </span>
                  ) : (
                    statusText ?? t.none
                  )}
                </td>
                <td>
                  <span className="bl-table__actions">
                    <button
                      type="button"
                      className="bl-linkbtn bl-linkbtn--strong"
                      aria-label={fmt(t.detailOf, { name: name.text })}
                      onClick={(event) => onDetail(family.id, null, event.currentTarget)}
                    >
                      {t.cardDetail}
                    </button>
                    <button
                      type="button"
                      className="bl-cmpbtn"
                      aria-pressed={selected}
                      disabled={!selected && compareFull}
                      aria-label={
                        selected
                          ? fmt(t.removeFromCompare, { name: name.text })
                          : fmt(t.compareToggleOf, { name: name.text })
                      }
                      onClick={() => onCompare(family.primary.id)}
                    >
                      <Icon name={selected ? 'check' : 'compare'} className="bl-icon--sm" />
                      {t.compare}
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
   详情对话框（族 → 版本切换 → 单版本字段）
   ──────────────────────────────────────────────────────────────── */

function DetailDialog({
  family,
  brand,
  locale,
  rawLocale,
  t,
  titleId,
  selected,
  compareFull,
  onCompare,
  onSelectVersion,
  onClose,
}: {
  family: BrandFamily;
  brand: Brand;
  locale: Locale;
  rawLocale: string;
  t: UIStrings;
  titleId: string;
  selected: boolean;
  compareFull: boolean;
  onCompare: (id: string) => void;
  onSelectVersion: (id: string) => void;
  onClose: () => void;
}): ReactNode {
  const ingredient = family.ingredient;
  const name = brandName(brand, locale);
  const title = familyName(family, locale);
  const banned = isBanned(brand, ingredient);
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
  const ester = pickL10n(ingredient.ester, locale);
  const role = pickL10n(ingredient.role, locale);
  const equivalence = pickL10n(ingredient.equivalence, locale);
  const reason = pickL10n(ingredient.reason, locale);
  const statusText = enumLabel(STATUS_LABELS, brand.status, locale);
  const drugUrl = getDrugPageUrl(brand.drugId, rawLocale);
  const latin = ingredient.name?.inn ?? ingredient.name?.en ?? DRUG_NAMES.get(ingredient.primaryDrugId)?.generic;

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
          <h2 className="bl-dialog__title" id={titleId} lang={title.lang}>
            {title.text}
          </h2>
          <p className="bl-dialog__sub">
            <CategoryPill category={ingredient.category} banned={family.banned} locale={locale} t={t} />
            <Txt value={ingredientName(ingredient, locale)} />
            {latin ? <span className="bl-dialog__latin">{latin}</span> : null}
          </p>
        </div>
        <button type="button" className="bl-iconbtn" onClick={onClose} aria-label={t.close}>
          <Icon name="close" />
        </button>
      </div>

      <div className="bl-dialog__body">
        {/* 成分小节（§1：图版头搬进对话框） */}
        <section className="bl-section">
          <h3 className="bl-section__title">{t.ingredientRole}</h3>
          {role ? (
            <p className="bl-section__text">
              {ester ? (
                <>
                  <b>{t.esterLabel}</b> <Txt value={ester} /> ·{' '}
                </>
              ) : null}
              <Txt value={role} />
            </p>
          ) : null}
          {equivalence ? (
            <p className="bl-section__text">
              <b>{t.equivalenceLabel}</b> <Txt value={equivalence} />
            </p>
          ) : null}
          {reason ? (
            <p className="bl-section__text bl-section__text--warn">
              <Txt value={reason} />
            </p>
          ) : null}
          {ingredient.references && ingredient.references.length > 0 ? (
            <p className="bl-section__text">
              <b>{t.referencesLabel}</b>{' '}
              {ingredient.references.map((id) => (
                <span key={id} className="bl-ref" title={REFERENCES.get(id)?.title ?? id}>
                  <ExternalLink href={referenceHref(id, rawLocale)} hint={t.opensNewTab}>
                    {id}
                  </ExternalLink>
                </span>
              ))}
            </p>
          ) : null}
        </section>

        {/* 版本切换（§1） */}
        {family.brands.length > 1 ? (
          <section className="bl-section">
            <h3 className="bl-section__title">{t.versionsLabel}</h3>
            <p className="bl-section__hint">{t.versionsHint}</p>
            <div className="bl-versions" role="group" aria-label={t.versionsLabel}>
              {family.brands.map((item) => {
                const vLabel = versionLabel(family, item, locale);
                return (
                  <button
                    key={item.id}
                    type="button"
                    className="bl-version"
                    aria-pressed={item.id === brand.id}
                    onClick={() => onSelectVersion(item.id)}
                  >
                    <span lang={vLabel.lang}>{vLabel.text}</span>
                  </button>
                );
              })}
            </div>
          </section>
        ) : null}

        <div className="bl-detail">
          <div>
            <div className={banned ? 'bl-detail__stage bl-detail__stage--banned' : 'bl-detail__stage'}>
              {hasPhoto(brand) && brand.image?.src ? (
                <img
                  className="bl-art__photo"
                  src={brand.image.src}
                  alt={pickL10n(brand.image.alt, locale)?.text ?? name.text}
                  loading="lazy"
                  decoding="async"
                />
              ) : (
                <PackArt
                  className="bl-art__svg"
                  name={brand.name?.intl ?? name.text}
                  strength={(brand.strengths ?? [])[0]}
                  maker={brand.manufacturer?.parent ?? brand.manufacturer?.name?.en}
                  category={ingredient.category}
                  banned={banned}
                  form={safeForm(brand.form)}
                  shape={appearance?.shape}
                  color={appearance?.color}
                  secondaryColor={appearance?.secondaryColor}
                  coating={appearance?.coating}
                  score={appearance?.score}
                  title={fmt(t.packAlt, { name: name.text })}
                />
              )}
            </div>
            <p className="bl-credit">{creditLine}</p>
            <div className="bl-detail__pictogram" aria-hidden="true">
              <Pictogram
                form={safeForm(brand.form)}
                shape={appearance?.shape}
                color={appearance?.color}
                secondaryColor={appearance?.secondaryColor}
                coating={appearance?.coating}
                score={appearance?.score}
                imprint={appearance?.imprint}
                size={132}
              />
            </div>
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
                aria-label={
                  selected ? fmt(t.removeFromCompare, { name: name.text }) : fmt(t.compareToggleOf, { name: name.text })
                }
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
              <dt>{t.colBrand}</dt>
              <dd lang={name.lang}>{name.text}</dd>
              {(brand.strengths ?? []).length > 0 ? (
                <>
                  <dt>{t.fieldStrengths}</dt>
                  <dd className="bl-num" lang={strengthsOf(brand, locale).lang}>
                    {strengthsOf(brand, locale).text}
                  </dd>
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
                <Txt value={country} />
                {(() => {
                  const region = enumLabel(REGION_LABELS, brand.market?.region, locale);
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

        <p className="bl-credit">{t.dataNote}</p>
      </div>
    </>
  );
}

/* ────────────────────────────────────────────────────────────────
   对比对话框
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
        <button type="button" className="bl-iconbtn" onClick={onClose} aria-label={t.close}>
          <Icon name="close" />
        </button>
      </div>
      <div className="bl-dialog__body">
        <div className="bl-tablewrap">
          <table className="bl-table bl-compare">
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
   左栏复选框组（§0-6）
   ──────────────────────────────────────────────────────────────── */

function CheckGroup<T extends string>({
  title,
  idBase,
  options,
  selected,
  labelOfOption,
  onToggle,
  children,
}: {
  title: string;
  idBase: string;
  options: T[];
  selected: readonly T[];
  labelOfOption: (value: T) => string;
  onToggle: (value: T) => void;
  children?: ReactNode;
}): ReactNode {
  return (
    <fieldset className="bl-fset">
      <legend className="bl-fset__title">{title}</legend>
      {children}
      <ul className="bl-fset__list">
        {options.map((value) => {
          const id = `${idBase}-${value}`;
          return (
            <li key={value} className="bl-opt">
              <input
                type="checkbox"
                id={id}
                className="bl-opt__box"
                checked={selected.includes(value)}
                onChange={() => onToggle(value)}
              />
              <label className="bl-opt__label" htmlFor={id}>
                {labelOfOption(value)}
              </label>
            </li>
          );
        })}
      </ul>
    </fieldset>
  );
}

/* ────────────────────────────────────────────────────────────────
   入口
   ──────────────────────────────────────────────────────────────── */

export default function BrandLibrary({ locale }: { locale?: Locale }): ReactNode {
  /*
   * SSR：render 里不读 window，先按 props 渲染，挂载后再按路径校正。
   * - uiLocale：UI 文案与数据回退链，四语之一。
   * - rawLocale：站内链接用的路径语言码，17 语都要拿对。
   */
  const [pathLocale, setPathLocale] = useState<string | null>(null);
  useEffect(() => {
    setPathLocale(localeFromPathname(window.location.pathname));
  }, []);

  const uiLocale = resolveUiLocale(locale ?? pathLocale);
  const rawLocale = pathLocale ?? locale ?? 'zh';
  const t = getUI(uiLocale);

  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [sort, setSort] = useState<SortKey>('ingredient');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [finderOpen, setFinderOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  const [detail, setDetail] = useState<{ familyId: string; brandId: string | null } | null>(null);
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
  const families = useMemo(
    () => sortFamilies(groupFamilies(visible, INGREDIENT_MAP), sort),
    [visible, sort],
  );

  const filterCount = activeFilterCount(filters);

  const onDetail = useCallback((familyId: string, brandId: string | null, trigger: HTMLElement | null) => {
    detailTrigger.current = trigger;
    setDetail({ familyId, brandId });
  }, []);

  const closeDetail = useCallback(() => {
    setDetail(null);
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

  const detailFamily = detail ? families.find((family) => family.id === detail.familyId) ?? null : null;
  const detailBrand = detailFamily
    ? detailFamily.brands.find((brand) => brand.id === detail?.brandId) ?? detailFamily.primary
    : null;
  const compareBrands = compareIds
    .map((id) => BRAND_MAP.get(id))
    .filter((brand): brand is Brand => Boolean(brand));
  const compareFull = compareIds.length >= COMPARE_LIMIT;

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

  const guideUrl = `/${rawLocale}/guides/`;
  const feedbackUrl = `/${rawLocale}/about/`;

  return (
    <div className="bl-root" data-paper="true" data-hydrated={hydrated ? 'true' : undefined} lang={UI_LANG[uiLocale]}>
      {/* ── 面包屑（§0-1） ── */}
      <nav className="bl-crumbs" aria-label={t.crumbLabel}>
        <a href={`/${rawLocale}/`}>{t.crumbHome}</a>
        <span aria-hidden="true">/</span>
        <a href={`/${rawLocale}/tools/`}>{t.crumbTools}</a>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{t.crumbCurrent}</span>
      </nav>

      {/* ── 标题区 + 右上提示卡（§0-2 / §0-3） ── */}
      <header className="bl-hero">
        <div className="bl-hero__text">
          <h1 className="bl-hero__title" id="_top">
            {t.heroTitle}
          </h1>
          <p className="bl-hero__lede">{t.heroLede}</p>
        </div>
        <aside className="bl-note">
          <Icon name="doc" className="bl-note__icon" />
          <div>
            <p className="bl-note__title">{t.noteTitle}</p>
            <a className="bl-link bl-note__link" href={guideUrl}>
              {t.noteLink}
              <Icon name="external" className="bl-icon--sm" />
            </a>
          </div>
        </aside>
      </header>

      {/* ── 搜索条（§0-4） ── */}
      <form
        className="bl-search"
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          // 输入时已实时筛选，按钮/回车只是显式确认（并把焦点留在结果上下文里）
          searchRef.current?.blur();
        }}
      >
        <div className="bl-search__field">
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
        </div>
        <button type="submit" className="bl-search__btn">
          {t.searchSubmit}
        </button>
      </form>
      <p className="bl-search__tip">{t.searchTip}</p>

      {/* ── 信息条（§0-5） ── */}
      <p className="bl-infobar">
        <Icon name="info" className="bl-icon--sm" />
        {t.infoBar}
      </p>

      {/* ── 外观反查（折叠，§1） ── */}
      <div className="bl-finder">
        <button
          type="button"
          className="bl-finder__toggle"
          aria-expanded={finderOpen}
          aria-controls={`${baseId}-finder`}
          onClick={() => setFinderOpen((value) => !value)}
        >
          {t.reverseExpand}
          <Icon name="chevron" className="bl-icon--sm" />
        </button>
        <div id={`${baseId}-finder`} className="bl-finder__body" hidden={!finderOpen}>
          <div className="bl-finder__row">
            <span className="bl-finder__label" id={`${baseId}-form`}>
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
                  <span aria-hidden="true" className="bl-chip__pict">
                    <Pictogram form={form} size={24} />
                  </span>
                  {formLabel(form, uiLocale)}
                  <span className="bl-chip__count bl-num">{facets.forms.get(form) ?? 0}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="bl-finder__row">
            <span className="bl-finder__label" id={`${baseId}-color`}>
              {t.reverseColor}
            </span>
            <div className="bl-chips" role="group" aria-labelledby={`${baseId}-color`}>
              {colorOptions.map((color: ColorFamily) => (
                <button
                  key={color}
                  type="button"
                  className="bl-chip"
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
            <div className="bl-finder__row">
              <span className="bl-finder__label" id={`${baseId}-shape`}>
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
            <div className="bl-finder__foot">
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
      </div>

      {/* ── 左栏筛选 + 主栏（§0-6 / §0-7 / §0-8） ── */}
      <div className="bl-shell">
        <div className="bl-sidewrap">
          <button
            type="button"
            className="bl-btn bl-sidetoggle"
            aria-expanded={panelOpen}
            aria-controls={`${baseId}-side`}
            onClick={() => setPanelOpen((value) => !value)}
          >
            <Icon name="filter" className="bl-icon--sm" />
            {filterCount > 0 ? fmt(t.filtersWithCount, { n: filterCount }) : t.filters}
          </button>

          <aside
            id={`${baseId}-side`}
            className="bl-side"
            data-open={panelOpen ? 'true' : 'false'}
            aria-label={t.filterTitle}
          >
            <div className="bl-side__head">
              <h2 className="bl-side__title">{t.filterTitle}</h2>
              <button type="button" className="bl-linkbtn" onClick={clearFilters}>
                {t.filterReset}
              </button>
            </div>

            <CheckGroup<RegionBucket>
              title={t.groupRegion}
              idBase={`${baseId}-region`}
              options={REGION_BUCKET_ORDER}
              selected={filters.regions}
              labelOfOption={(value) => enumLabel(REGION_BUCKET_LABELS, value, uiLocale) ?? value}
              onToggle={(value) => patch({ regions: toggleIn(filters.regions, value) })}
            >
              <button
                type="button"
                className="bl-allbtn"
                aria-pressed={filters.regions.length === 0}
                onClick={() => patch({ regions: [] })}
              >
                {t.allRegions}
              </button>
            </CheckGroup>

            <CheckGroup<IngredientCategory>
              title={t.groupCategory}
              idBase={`${baseId}-cat`}
              options={CATEGORIES_PRESENT}
              selected={filters.categories}
              labelOfOption={(value) => enumLabel(CATEGORY_LABELS, value, uiLocale) ?? value}
              onToggle={(value) => patch({ categories: toggleIn(filters.categories, value) })}
            />

            <CheckGroup<FormGroup>
              title={t.groupForm}
              idBase={`${baseId}-formgroup`}
              options={FORM_GROUP_ORDER}
              selected={filters.formGroups}
              labelOfOption={(value) => enumLabel(FORM_GROUP_LABELS, value, uiLocale) ?? value}
              onToggle={(value) => patch({ formGroups: toggleIn(filters.formGroups, value) })}
            />

            <CheckGroup<ResourceKind>
              title={t.groupResource}
              idBase={`${baseId}-res`}
              options={RESOURCE_ORDER}
              selected={filters.resources}
              labelOfOption={(value) => (value === 'photo' ? t.resourcePhoto : t.resourceLeaflet)}
              onToggle={(value) => patch({ resources: toggleIn(filters.resources, value) })}
            />

            <div className="bl-ask">
              <Icon name="chat" className="bl-ask__icon" />
              <div>
                <p className="bl-ask__title">{t.askTitle}</p>
                <a className="bl-link" href={feedbackUrl}>
                  {t.askLink}
                  <Icon name="arrow" className="bl-icon--sm" />
                </a>
              </div>
            </div>
          </aside>
        </div>

        <div className="bl-main">
          <div className="bl-listhead">
            <h2 className="bl-listhead__title">{t.listTitle}</h2>
            <p className="bl-listhead__count" role="status" aria-live="polite">
              <span className="bl-sr">{t.resultsRegionLabel}: </span>
              {fmt(t.summaryFamilies, { families: families.length, versions: visible.length })}
            </p>
            <div className="bl-listhead__tools">
              <label className="bl-sortlabel" htmlFor={`${baseId}-sort`}>
                {t.sortLabel}
              </label>
              <select
                id={`${baseId}-sort`}
                className="bl-select"
                value={sort}
                onChange={(event) => setSort(event.target.value as SortKey)}
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.key} value={option.key}>
                    {t[option.labelKey]}
                  </option>
                ))}
              </select>
              <div className="bl-viewtoggle" role="group" aria-label={t.viewLabel}>
                <button
                  type="button"
                  className="bl-viewbtn"
                  aria-pressed={view === 'grid'}
                  aria-label={t.viewGrid}
                  onClick={() => setView('grid')}
                >
                  <Icon name="grid" className="bl-icon--sm" />
                </button>
                <button
                  type="button"
                  className="bl-viewbtn"
                  aria-pressed={view === 'list'}
                  aria-label={t.viewList}
                  onClick={() => setView('list')}
                >
                  <Icon name="list" className="bl-icon--sm" />
                </button>
              </div>
            </div>
          </div>

          {families.length === 0 ? (
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
              families={families}
              locale={uiLocale}
              t={t}
              compareIds={compareIds}
              onDetail={onDetail}
              onCompare={onCompare}
            />
          ) : (
            <div className="bl-grid">
              {families.map((family) => (
                <FamilyCard
                  key={family.id}
                  family={family}
                  locale={uiLocale}
                  t={t}
                  selected={compareIds.includes(family.primary.id)}
                  compareFull={compareFull}
                  onDetail={onDetail}
                  onCompare={onCompare}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── 底部核对提示条（§0-9） ── */}
      <section className="bl-check" aria-labelledby={`${baseId}-check`}>
        <div className="bl-check__lead">
          <Icon name="doc" className="bl-check__icon" />
          <div>
            <h2 className="bl-check__title" id={`${baseId}-check`}>
              {t.checkTitle}
            </h2>
            <p className="bl-check__sub">{t.checkSub}</p>
          </div>
        </div>
        <ul className="bl-check__items">
          <li>
            <Icon name="check" className="bl-icon--sm" />
            {t.checkItem1}
          </li>
          <li>
            <Icon name="check" className="bl-icon--sm" />
            {t.checkItem2}
          </li>
          <li>
            <Icon name="check" className="bl-icon--sm" />
            {t.checkItem3}
          </li>
        </ul>
        <a className="bl-link bl-check__link" href={guideUrl}>
          {t.checkLink}
          <Icon name="arrow" className="bl-icon--sm" />
        </a>
      </section>

      {/* ── 紧凑页尾说明（§1） ── */}
      <p className="bl-foot">
        {fmt(t.footCompact, { date: DATA.lastReviewed ?? '—' })}{' '}
        <a className="bl-link" href={feedbackUrl}>
          {t.footFixLink}
        </a>
      </p>

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
      <Modal open={detailFamily !== null && detailBrand !== null} onClose={closeDetail} labelledBy={detailTitleId}>
        {detailFamily && detailBrand ? (
          <DetailDialog
            family={detailFamily}
            brand={detailBrand}
            locale={uiLocale}
            rawLocale={rawLocale}
            t={t}
            titleId={detailTitleId}
            selected={compareIds.includes(detailBrand.id)}
            compareFull={compareFull}
            onCompare={onCompare}
            onSelectVersion={(id) => setDetail({ familyId: detailFamily.id, brandId: id })}
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
