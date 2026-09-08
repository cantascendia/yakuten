/**
 * 药物图鉴 v2 — 过滤 / 搜索 / 分组 纯函数层
 * 对应 docs/specs/brand-library-v2.md §5.2 / §7。
 *
 * 纪律：
 * - 本文件不依赖 React、不读 window / document、不做任何存储或网络请求，
 *   任何一条都可以在 node 里直接单测。
 * - 所有函数对残缺数据健壮：成分为空、图片缺失、可选字段缺失都不能抛。
 */

import type {
  Appearance,
  Brand,
  BrandForm,
  BrandStatus,
  ColorFamily,
  Ingredient,
  IngredientCategory,
  L10n,
  L10nList,
  Locale,
  MarketRegion,
  TabletShape,
} from './types';

/* ────────────────────────────────────────────────────────────────
   L10n 回退链：locale → en → zh
   ──────────────────────────────────────────────────────────────── */

export interface PickedText {
  text: string;
  /** 回退到中文原文时为 'zh'，渲染时要给元素加 lang="zh" */
  lang?: 'zh';
}

const HAN_RE = /[㐀-䶿一-鿿豈-﫿]/;

/** 是否含汉字 —— 只有真的落回中文文本时才标 lang="zh" */
export function hasHan(value: string): boolean {
  return HAN_RE.test(value);
}

function clean(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/** 多语文本按 locale → en → zh 取值；回退到含汉字的中文时带 lang 标记 */
export function pickL10n(field: L10n | undefined | null, locale: Locale): PickedText | null {
  if (!field) return null;
  const direct = clean(field[locale]);
  if (direct) return { text: direct };
  if (locale !== 'en') {
    const en = clean(field.en);
    if (en) return { text: en };
  }
  const zh = clean(field.zh);
  if (!zh) return null;
  return locale === 'zh' || !hasHan(zh) ? { text: zh } : { text: zh, lang: 'zh' };
}

export interface PickedList {
  items: string[];
  lang?: 'zh';
}

/** 多语数组按同一条回退链取值 */
export function pickL10nList(
  field: L10nList | undefined | null,
  locale: Locale,
): PickedList | null {
  if (!field) return null;
  const pickArr = (arr: string[] | undefined): string[] | null => {
    if (!Array.isArray(arr)) return null;
    const items = arr.map((item) => clean(item)).filter((item): item is string => item !== null);
    return items.length > 0 ? items : null;
  };
  const direct = pickArr(field[locale]);
  if (direct) return { items: direct };
  if (locale !== 'en') {
    const en = pickArr(field.en);
    if (en) return { items: en };
  }
  const zh = pickArr(field.zh);
  if (!zh) return null;
  const needsLang = locale !== 'zh' && zh.some(hasHan);
  return needsLang ? { items: zh, lang: 'zh' } : { items: zh };
}

/** 品牌显示名：locale 专名 → 通用 display */
export function brandName(brand: Brand, locale: Locale): PickedText {
  const name = brand.name ?? { display: brand.id };
  if (locale !== 'zh') {
    const direct = clean(name[locale as 'en' | 'ja' | 'ko']);
    if (direct) return { text: direct };
    if (locale !== 'en') {
      const en = clean(name.en);
      if (en) return { text: en };
    }
  }
  const display = clean(name.display) ?? clean(name.intl) ?? clean(name.local) ?? brand.id;
  return locale === 'zh' || !hasHan(display) ? { text: display } : { text: display, lang: 'zh' };
}

/** 成分名：locale → en → zh（Ingredient.name 的 zh/en 为必填） */
export function ingredientName(ingredient: Ingredient, locale: Locale): PickedText {
  const name = ingredient.name;
  if (!name) return { text: ingredient.id };
  if (locale === 'ja' || locale === 'ko') {
    const direct = clean(name[locale]);
    if (direct) return { text: direct };
  }
  if (locale !== 'zh') {
    const en = clean(name.en);
    if (en) return { text: en };
  }
  const zh = clean(name.zh) ?? clean(name.en) ?? ingredient.id;
  return locale === 'zh' || !hasHan(zh) ? { text: zh } : { text: zh, lang: 'zh' };
}

/* ────────────────────────────────────────────────────────────────
   颜色族
   ──────────────────────────────────────────────────────────────── */

/** 反查色块 chip 的代表色（品牌 hex 只在 Pictogram props / chip inline style 出现） */
export const COLOR_FAMILY_SWATCH: Record<ColorFamily, string> = {
  white: '#F5F2EC',
  blue: '#6FA8DC',
  yellow: '#F2CE5B',
  pink: '#F0A0BC',
  red: '#D0453F',
  orange: '#E8873A',
  brown: '#9A6B44',
  green: '#6FB08A',
  purple: '#9B7DD4',
  peach: '#F2B48C',
  clear: '#E4E4E4',
  multi: '#B9A6C9',
};

export const COLOR_FAMILY_ORDER: ColorFamily[] = [
  'white',
  'pink',
  'red',
  'orange',
  'peach',
  'yellow',
  'green',
  'blue',
  'purple',
  'brown',
  'clear',
  'multi',
];

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

/** #RGB / #RRGGBB → rgb；非法输入返回 null（不抛） */
export function hexToRgb(hex: string | undefined | null): Rgb | null {
  const raw = clean(hex);
  if (!raw) return null;
  const value = raw.startsWith('#') ? raw.slice(1) : raw;
  if (!/^[0-9a-fA-F]+$/.test(value)) return null;
  if (value.length === 3) {
    const r = value[0];
    const g = value[1];
    const b = value[2];
    return {
      r: parseInt(`${r}${r}`, 16),
      g: parseInt(`${g}${g}`, 16),
      b: parseInt(`${b}${b}`, 16),
    };
  }
  if (value.length === 6) {
    return {
      r: parseInt(value.slice(0, 2), 16),
      g: parseInt(value.slice(2, 4), 16),
      b: parseInt(value.slice(4, 6), 16),
    };
  }
  return null;
}

export interface Hsl {
  /** 0–360 */
  h: number;
  /** 0–1 */
  s: number;
  /** 0–1 */
  l: number;
}

export function rgbToHsl({ r, g, b }: Rgb): Hsl {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return { h: 0, s: 0, l };
  const s = d / (1 - Math.abs(2 * l - 1));
  let h: number;
  if (max === rn) h = 60 * (((gn - bn) / d) % 6);
  else if (max === gn) h = 60 * ((bn - rn) / d + 2);
  else h = 60 * ((rn - gn) / d + 4);
  if (h < 0) h += 360;
  return { h, s, l };
}

/**
 * 颜色族：优先用数据里显式的 appearance.colorFamily；
 * 缺省时按 hex 粗分（HSL 分桶，只用于把 chip 兜住，不参与任何医学判断）。
 */
export function colorFamilyOf(appearance: Appearance | undefined | null): ColorFamily | null {
  if (!appearance) return null;
  if (appearance.colorFamily) return appearance.colorFamily;
  const rgb = hexToRgb(appearance.color);
  if (!rgb) return null;
  const { h, l } = rgbToHsl(rgb);
  // 近无彩色用 chroma（max-min）判，不用 HSL 饱和度 ——
  // 极亮色的 s 会被放大（#F7F5F0 的 s≈0.31 但肉眼就是白片）。
  const chroma = (Math.max(rgb.r, rgb.g, rgb.b) - Math.min(rgb.r, rgb.g, rgb.b)) / 255;
  if (chroma < 0.09) return l >= 0.7 ? 'white' : 'brown';
  if (l >= 0.93 && chroma < 0.12) return 'white';
  if (h < 15 || h >= 345) return l >= 0.72 ? 'pink' : 'red';
  if (h < 45) {
    if (l < 0.45) return 'brown';
    return l >= 0.75 ? 'peach' : 'orange';
  }
  if (h < 70) return l < 0.4 ? 'brown' : 'yellow';
  if (h < 170) return 'green';
  if (h < 255) return 'blue';
  if (h < 295) return 'purple';
  return 'pink';
}

/* ────────────────────────────────────────────────────────────────
   排序序
   ──────────────────────────────────────────────────────────────── */

export const CATEGORY_ORDER: IngredientCategory[] = [
  'estrogen',
  'antiandrogen',
  'gnrh',
  'progestogen',
  '5ari',
  'banned',
];

export const REGION_ORDER: MarketRegion[] = [
  'cn',
  'tw-hk',
  'jp',
  'kr',
  'sea',
  'in',
  'eu',
  'na',
  'oceania',
  'latam',
  'other',
];

export const STATUS_ORDER: BrandStatus[] = [
  'prescription',
  'otc',
  'approved',
  'grey',
  'cautioned',
  'discontinued',
  'banned',
];

export const FORM_ORDER: BrandForm[] = [
  'tablet',
  'capsule',
  'softgel',
  'patch',
  'gel-pump',
  'gel-sachet',
  'spray',
  'nasal-spray',
  'ampoule',
  'vial',
  'prefilled-syringe',
  'powder-vial',
  'implant',
  'pessary',
];

export const SHAPE_ORDER: TabletShape[] = [
  'round',
  'oval',
  'oblong',
  'capsule',
  'triangle',
  'square',
  'diamond',
  'octagon',
  'apple',
];

function rank<T>(order: T[], value: T): number {
  const index = order.indexOf(value);
  return index === -1 ? order.length : index;
}

/* ────────────────────────────────────────────────────────────────
   数据准备
   ──────────────────────────────────────────────────────────────── */

export function buildIngredientMap(ingredients: Ingredient[]): Map<string, Ingredient> {
  const map = new Map<string, Ingredient>();
  for (const ingredient of ingredients ?? []) {
    if (ingredient && typeof ingredient.id === 'string') map.set(ingredient.id, ingredient);
  }
  return map;
}

/**
 * 丢掉引用不存在成分的孤儿品牌 —— 图版视图渲染不出图版头，
 * 留着会让「显示 N」与实际可见卡片数对不上。数据层由
 * scripts/validate-brand-library.mjs 保证引用完整，这里只是兜底。
 */
export function sanitizeBrands(brands: Brand[], ingredients: Map<string, Ingredient>): Brand[] {
  return (brands ?? []).filter(
    (brand) => brand && typeof brand.id === 'string' && ingredients.has(brand.ingredientId),
  );
}

/** 该品牌是否属于「禁用 / 不适用」隔离区 */
export function isBanned(brand: Brand, ingredient: Ingredient | undefined): boolean {
  return brand.status === 'banned' || ingredient?.hrtUse === 'banned';
}

/* ────────────────────────────────────────────────────────────────
   搜索
   ──────────────────────────────────────────────────────────────── */

export function normalize(value: string): string {
  return value.normalize('NFKC').toLowerCase();
}

function push(bag: string[], value: unknown): void {
  const text = clean(value);
  if (text) bag.push(text);
}

function pushL10n(bag: string[], field: L10n | undefined): void {
  if (!field) return;
  push(bag, field.zh);
  push(bag, field.en);
  push(bag, field.ja);
  push(bag, field.ko);
}

/**
 * 一条品牌的可搜索文本（spec §5.2 字段全集，四语一并入索引）。
 * 与 locale 无关 —— 换语言不必重建索引。
 */
export function searchHaystack(brand: Brand, ingredient: Ingredient | undefined): string {
  const bag: string[] = [];
  const name = brand.name;
  if (name) {
    push(bag, name.display);
    push(bag, name.local);
    push(bag, name.intl);
    push(bag, name.en);
    push(bag, name.ja);
    push(bag, name.ko);
    for (const alias of name.aliases ?? []) push(bag, alias);
  }
  if (brand.manufacturer) {
    pushL10n(bag, brand.manufacturer.name);
    push(bag, brand.manufacturer.parent);
    push(bag, brand.manufacturer.country);
  }
  if (brand.market) {
    push(bag, brand.market.country);
    pushL10n(bag, brand.market.countryName);
  }
  if (ingredient) {
    push(bag, ingredient.name?.zh);
    push(bag, ingredient.name?.en);
    push(bag, ingredient.name?.inn);
    push(bag, ingredient.name?.ja);
    push(bag, ingredient.name?.ko);
    pushL10n(bag, ingredient.ester);
  }
  push(bag, brand.appearance?.imprint);
  pushL10n(bag, brand.appearance?.colorName);
  pushL10n(bag, brand.notes);
  push(bag, brand.regulatory?.code);
  for (const strength of brand.strengths ?? []) push(bag, strength);
  push(bag, brand.form);
  return normalize(bag.join('  '));
}

/** brand.id → haystack；组件里 useMemo 一次，过滤时零重建 */
export function buildSearchIndex(
  brands: Brand[],
  ingredients: Map<string, Ingredient>,
): Map<string, string> {
  const index = new Map<string, string>();
  for (const brand of brands) {
    index.set(brand.id, searchHaystack(brand, ingredients.get(brand.ingredientId)));
  }
  return index;
}

/** 查询串切词：空白分隔，全部命中才算匹配（AND） */
export function tokenizeQuery(query: string): string[] {
  return normalize(query ?? '')
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 0);
}

export function matchesTokens(haystack: string, tokens: string[]): boolean {
  if (tokens.length === 0) return true;
  return tokens.every((token) => haystack.includes(token));
}

/* ────────────────────────────────────────────────────────────────
   剂型分组 / 参考资料（v2.1 §0-6 左栏复选框的维度）
   ──────────────────────────────────────────────────────────────── */

/** 左栏「剂型」一组：把 14 个 BrandForm 收敛成 5 个用户认得的组 */
export type FormGroup = 'tablet' | 'gel' | 'patch' | 'injection' | 'capsule';

export const FORM_GROUP_ORDER: FormGroup[] = ['tablet', 'gel', 'patch', 'injection', 'capsule'];

/** spec v2.1 §0-6 的映射表；表里没有的剂型不入组（如鼻喷、阴道栓） */
const FORM_GROUP_OF: Partial<Record<BrandForm, FormGroup>> = {
  tablet: 'tablet',
  'gel-pump': 'gel',
  'gel-sachet': 'gel',
  spray: 'gel',
  patch: 'patch',
  ampoule: 'injection',
  vial: 'injection',
  'prefilled-syringe': 'injection',
  'powder-vial': 'injection',
  implant: 'injection',
  capsule: 'capsule',
  softgel: 'capsule',
};

export function formGroupOf(form: BrandForm | undefined | null): FormGroup | null {
  if (!form) return null;
  return FORM_GROUP_OF[form] ?? null;
}

/** 左栏「参考资料」一组 */
export type ResourceKind = 'photo' | 'leaflet';

export const RESOURCE_ORDER: ResourceKind[] = ['photo', 'leaflet'];

/** 有实拍包装参考 */
export function hasPhoto(brand: Brand): boolean {
  return (
    brand.image?.kind === 'photo' &&
    typeof brand.image?.src === 'string' &&
    brand.image.src.length > 0
  );
}

/** 有说明书 / 官方资料链接 */
export function hasLeaflet(brand: Brand): boolean {
  const links = brand.links;
  return Boolean(clean(links?.leaflet) || clean(links?.official));
}

export function resourcesOf(brand: Brand): ResourceKind[] {
  const out: ResourceKind[] = [];
  if (hasPhoto(brand)) out.push('photo');
  if (hasLeaflet(brand)) out.push('leaflet');
  return out;
}

/* ────────────────────────────────────────────────────────────────
   地区桶：参考稿左栏是 7 项（中国大陆 / 泰国 / 印度 / 日本 / 欧洲 / 北美 / 其他地区）
   ──────────────────────────────────────────────────────────────── */

export type RegionBucket = 'cn' | 'th' | 'in' | 'jp' | 'eu' | 'na' | 'other';

export const REGION_BUCKET_ORDER: RegionBucket[] = ['cn', 'th', 'in', 'jp', 'eu', 'na', 'other'];

/** MarketRegion → 参考稿的 7 个桶；未单列的地区（台港澳/韩国/大洋洲/拉美…）归「其他地区」 */
export function regionBucketOf(region: MarketRegion | undefined | null): RegionBucket {
  switch (region) {
    case 'cn':
      return 'cn';
    case 'sea':
      return 'th';
    case 'in':
      return 'in';
    case 'jp':
      return 'jp';
    case 'eu':
      return 'eu';
    case 'na':
      return 'na';
    default:
      return 'other';
  }
}

/* ────────────────────────────────────────────────────────────────
   过滤（多选：组内 OR、组间 AND）
   ──────────────────────────────────────────────────────────────── */

export interface FilterState {
  query: string;
  /** 上市地区（多选） */
  regions: RegionBucket[];
  /** 药物类别（多选） */
  categories: IngredientCategory[];
  /** 剂型组（多选） */
  formGroups: FormGroup[];
  /** 参考资料（多选） */
  resources: ResourceKind[];
  /** 外观反查第一级 */
  form: BrandForm | null;
  /** 外观反查第二级 */
  colorFamily: ColorFamily | null;
  /** 外观反查第三级 */
  shape: TabletShape | null;
}

export const EMPTY_FILTERS: FilterState = {
  query: '',
  regions: [],
  categories: [],
  formGroups: [],
  resources: [],
  form: null,
  colorFamily: null,
  shape: null,
};

export type FilterKey = keyof FilterState;

/** 数组型条件的开关（不可变，返回新数组；纯函数，可直接单测） */
export function toggleIn<T>(list: readonly T[], value: T): T[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

/** 生效中的条件数（含搜索词），用于「筛选 (n)」与空状态判断 */
export function activeFilterCount(filters: FilterState): number {
  let count = 0;
  if (tokenizeQuery(filters.query).length > 0) count += 1;
  count += filters.regions.length;
  count += filters.categories.length;
  count += filters.formGroups.length;
  count += filters.resources.length;
  if (filters.form) count += 1;
  if (filters.colorFamily) count += 1;
  if (filters.shape) count += 1;
  return count;
}

export interface MatchContext {
  ingredients: Map<string, Ingredient>;
  index: Map<string, string>;
  tokens: string[];
}

/**
 * 单条品牌是否通过筛选。skip 用于 facet 计数：
 * 计算某一维度的可选项时，跳过该维度自身（否则永远只剩已选那一项）。
 */
export function brandPasses(
  brand: Brand,
  filters: FilterState,
  ctx: MatchContext,
  skip?: ReadonlySet<FilterKey>,
): boolean {
  const skipped = (key: FilterKey): boolean => skip?.has(key) === true;
  const ingredient = ctx.ingredients.get(brand.ingredientId);

  if (!skipped('query') && !matchesTokens(ctx.index.get(brand.id) ?? '', ctx.tokens)) return false;
  if (
    !skipped('regions') &&
    filters.regions.length > 0 &&
    !filters.regions.includes(regionBucketOf(brand.market?.region))
  )
    return false;
  if (
    !skipped('categories') &&
    filters.categories.length > 0 &&
    !(ingredient && filters.categories.includes(ingredient.category))
  )
    return false;
  if (!skipped('formGroups') && filters.formGroups.length > 0) {
    const group = formGroupOf(brand.form);
    if (!group || !filters.formGroups.includes(group)) return false;
  }
  if (!skipped('resources') && filters.resources.length > 0) {
    const kinds = resourcesOf(brand);
    if (!filters.resources.every((kind) => kinds.includes(kind))) return false;
  }
  if (!skipped('form') && filters.form && brand.form !== filters.form) return false;
  if (
    !skipped('colorFamily') &&
    filters.colorFamily &&
    colorFamilyOf(brand.appearance) !== filters.colorFamily
  )
    return false;
  if (!skipped('shape') && filters.shape && brand.appearance?.shape !== filters.shape) return false;
  return true;
}

export function makeContext(
  brands: Brand[],
  ingredients: Map<string, Ingredient>,
  query: string,
  index?: Map<string, string>,
): MatchContext {
  return {
    ingredients,
    index: index ?? buildSearchIndex(brands, ingredients),
    tokens: tokenizeQuery(query),
  };
}

export function filterBrands(
  brands: Brand[],
  filters: FilterState,
  ctx: MatchContext,
  skip?: ReadonlySet<FilterKey>,
): Brand[] {
  return brands.filter((brand) => brandPasses(brand, filters, ctx, skip));
}

/* ────────────────────────────────────────────────────────────────
   Facet 计数（左栏复选框 + 外观反查条逐级收窄）
   ──────────────────────────────────────────────────────────────── */

export interface Facets {
  regions: Map<RegionBucket, number>;
  categories: Map<IngredientCategory, number>;
  formGroups: Map<FormGroup, number>;
  resources: Map<ResourceKind, number>;
  forms: Map<BrandForm, number>;
  colors: Map<ColorFamily, number>;
  shapes: Map<TabletShape, number>;
}

function bump<K>(map: Map<K, number>, key: K | undefined | null): void {
  if (key === undefined || key === null) return;
  map.set(key, (map.get(key) ?? 0) + 1);
}

const SKIP_REGION: ReadonlySet<FilterKey> = new Set<FilterKey>(['regions']);
const SKIP_CATEGORY: ReadonlySet<FilterKey> = new Set<FilterKey>(['categories']);
const SKIP_FORMGROUP: ReadonlySet<FilterKey> = new Set<FilterKey>(['formGroups']);
const SKIP_RESOURCE: ReadonlySet<FilterKey> = new Set<FilterKey>(['resources']);
const SKIP_FORM: ReadonlySet<FilterKey> = new Set<FilterKey>(['form', 'colorFamily', 'shape']);
const SKIP_COLOR: ReadonlySet<FilterKey> = new Set<FilterKey>(['colorFamily', 'shape']);
const SKIP_SHAPE: ReadonlySet<FilterKey> = new Set<FilterKey>(['shape']);

/**
 * 每个维度按「跳过自身」的口径计数。
 * 反查条是三级漏斗：颜色项由已选剂型收窄，形状项再由剂型+颜色收窄。
 */
export function buildFacets(brands: Brand[], filters: FilterState, ctx: MatchContext): Facets {
  const facets: Facets = {
    regions: new Map(),
    categories: new Map(),
    formGroups: new Map(),
    resources: new Map(),
    forms: new Map(),
    colors: new Map(),
    shapes: new Map(),
  };
  for (const brand of brands) {
    const ingredient = ctx.ingredients.get(brand.ingredientId);
    if (brandPasses(brand, filters, ctx, SKIP_REGION))
      bump(facets.regions, regionBucketOf(brand.market?.region));
    if (brandPasses(brand, filters, ctx, SKIP_CATEGORY)) bump(facets.categories, ingredient?.category);
    if (brandPasses(brand, filters, ctx, SKIP_FORMGROUP)) bump(facets.formGroups, formGroupOf(brand.form));
    if (brandPasses(brand, filters, ctx, SKIP_RESOURCE)) {
      for (const kind of resourcesOf(brand)) bump(facets.resources, kind);
    }
    if (brandPasses(brand, filters, ctx, SKIP_FORM)) bump(facets.forms, brand.form);
    if (brandPasses(brand, filters, ctx, SKIP_COLOR)) bump(facets.colors, colorFamilyOf(brand.appearance));
    if (brandPasses(brand, filters, ctx, SKIP_SHAPE)) bump(facets.shapes, brand.appearance?.shape);
  }
  return facets;
}


/* ────────────────────────────────────────────────────────────────
   分组：成分 → 图版
   ──────────────────────────────────────────────────────────────── */

export interface Plate {
  ingredient: Ingredient;
  brands: Brand[];
  /** 该图版覆盖的上市地区数（去重 market.region） */
  regionCount: number;
  /** 整版进「禁用 / 不适用」区 */
  banned: boolean;
}

export interface PlateGroups {
  plates: Plate[];
  bannedPlates: Plate[];
}

/** 图版内排序：禁用条目沉底，其余按地区序 → 名称 */
export function compareBrandsInPlate(a: Brand, b: Brand, ingredient: Ingredient | undefined): number {
  const bannedDelta = Number(isBanned(a, ingredient)) - Number(isBanned(b, ingredient));
  if (bannedDelta !== 0) return bannedDelta;
  const regionDelta = rank(REGION_ORDER, a.market?.region ?? 'other') - rank(REGION_ORDER, b.market?.region ?? 'other');
  if (regionDelta !== 0) return regionDelta;
  const nameA = a.name?.display ?? a.id;
  const nameB = b.name?.display ?? b.id;
  return nameA.localeCompare(nameB, 'zh-Hans-CN');
}

export function comparePlates(a: Plate, b: Plate): number {
  const categoryDelta =
    rank(CATEGORY_ORDER, a.ingredient.category) - rank(CATEGORY_ORDER, b.ingredient.category);
  if (categoryDelta !== 0) return categoryDelta;
  const plateA = typeof a.ingredient.plate === 'number' ? a.ingredient.plate : Number.MAX_SAFE_INTEGER;
  const plateB = typeof b.ingredient.plate === 'number' ? b.ingredient.plate : Number.MAX_SAFE_INTEGER;
  if (plateA !== plateB) return plateA - plateB;
  return a.ingredient.id.localeCompare(b.ingredient.id);
}

/** 去重后的上市地区数 */
export function countRegions(brands: Brand[]): number {
  const regions = new Set<MarketRegion>();
  for (const brand of brands) {
    if (brand.market?.region) regions.add(brand.market.region);
  }
  return regions.size;
}

/**
 * 把品牌分到成分图版；hrtUse === 'banned' 的成分整版移到末尾隔离区。
 * 空图版（该成分本轮无命中）不产出。
 */
export function groupIntoPlates(brands: Brand[], ingredients: Map<string, Ingredient>): PlateGroups {
  const buckets = new Map<string, Brand[]>();
  for (const brand of brands) {
    const bucket = buckets.get(brand.ingredientId);
    if (bucket) bucket.push(brand);
    else buckets.set(brand.ingredientId, [brand]);
  }
  const plates: Plate[] = [];
  const bannedPlates: Plate[] = [];
  for (const [ingredientId, bucket] of buckets) {
    const ingredient = ingredients.get(ingredientId);
    if (!ingredient) continue;
    const sorted = [...bucket].sort((a, b) => compareBrandsInPlate(a, b, ingredient));
    const plate: Plate = {
      ingredient,
      brands: sorted,
      regionCount: countRegions(sorted),
      banned: ingredient.hrtUse === 'banned',
    };
    (plate.banned ? bannedPlates : plates).push(plate);
  }
  plates.sort(comparePlates);
  bannedPlates.sort(comparePlates);
  return { plates, bannedPlates };
}

/** 列表视图排序：图版序 → 图版内序 */
export function sortForList(brands: Brand[], ingredients: Map<string, Ingredient>): Brand[] {
  const { plates, bannedPlates } = groupIntoPlates(brands, ingredients);
  return [...plates, ...bannedPlates].flatMap((plate) => plate.brands);
}

/* ────────────────────────────────────────────────────────────────
   杂项
   ──────────────────────────────────────────────────────────────── */

/** 从 URL 路径取语言码（站点 17 语同构；取不到给 null） */
export function localeFromPathname(pathname: string | undefined | null): string | null {
  if (typeof pathname !== 'string') return null;
  const match = pathname.match(/^\/([a-z]{2}(?:-[a-z]{2})?)(?:\/|$)/i);
  return match ? match[1].toLowerCase() : null;
}

/** 对比托盘上限（spec §5.5：≤3 列） */
export const COMPARE_LIMIT = 3;

/** 对比表某一行的取值是否存在差异（用于差异行高亮） */
export function rowHasDiff(values: string[]): boolean {
  if (values.length < 2) return false;
  return values.some((value) => value !== values[0]);
}

/* ────────────────────────────────────────────────────────────────
   品牌族（v2.1 §1）：同成分 + 同国际名 = 一张卡，多国版本合并
   ──────────────────────────────────────────────────────────────── */

/** 去掉名字里的地区括注：「Progynova（泰国版）」→「Progynova」 */
export function stripParenthetical(value: string): string {
  return value
    .replace(/[（(［【[][^）)］】\]]*[）)］】\]]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** 族键：ingredientId + 去括号的国际名（缺 intl 时用 display） */
export function familyKeyOf(brand: Brand): string {
  const raw = clean(brand.name?.intl) ?? clean(brand.name?.display) ?? brand.id;
  return `${brand.ingredientId}::${normalize(stripParenthetical(raw))}`;
}

export interface BrandFamily {
  /** 稳定 key（= familyKeyOf） */
  id: string;
  ingredient: Ingredient;
  /** 族内各国版本，按地区序排 */
  brands: Brand[];
  /** 代表版本（地区序第一个）：卡片标题、类别、外观都取它 */
  primary: Brand;
  /** 族内有实拍的版本（没有则 null）——卡片图优先用它 */
  photo: Brand | null;
  /** 去重后的上市地区，按地区序 */
  regions: MarketRegion[];
  /** 去重后的剂型，按剂型序 */
  forms: BrandForm[];
  /** 规格并集（保序去重） */
  strengths: string[];
  /** 整族在 HRT 语境下不适用 */
  banned: boolean;
}

function uniqueBy<T>(values: T[], order: T[]): T[] {
  const seen = new Set<T>();
  for (const value of values) if (value !== undefined && value !== null) seen.add(value);
  const known = order.filter((item) => seen.has(item));
  const extra = [...seen].filter((item) => !order.includes(item));
  return [...known, ...extra];
}

/**
 * 把品牌归并成族。空数据、孤儿成分都不抛：引用不到成分的品牌直接跳过
 * （sanitizeBrands 已在上游兜过一次）。
 */
export function groupFamilies(brands: Brand[], ingredients: Map<string, Ingredient>): BrandFamily[] {
  const buckets = new Map<string, Brand[]>();
  for (const brand of brands ?? []) {
    if (!brand || !ingredients.has(brand.ingredientId)) continue;
    const key = familyKeyOf(brand);
    const bucket = buckets.get(key);
    if (bucket) bucket.push(brand);
    else buckets.set(key, [brand]);
  }
  const families: BrandFamily[] = [];
  for (const [id, bucket] of buckets) {
    const ingredient = ingredients.get(bucket[0].ingredientId);
    if (!ingredient) continue;
    const sorted = [...bucket].sort((a, b) => {
      const regionDelta =
        rank(REGION_ORDER, a.market?.region ?? 'other') - rank(REGION_ORDER, b.market?.region ?? 'other');
      if (regionDelta !== 0) return regionDelta;
      return (a.name?.display ?? a.id).localeCompare(b.name?.display ?? b.id, 'zh-Hans-CN');
    });
    const strengths: string[] = [];
    for (const brand of sorted) {
      for (const strength of brand.strengths ?? []) {
        if (strength && !strengths.includes(strength)) strengths.push(strength);
      }
    }
    families.push({
      id,
      ingredient,
      brands: sorted,
      primary: sorted[0],
      photo: sorted.find((brand) => hasPhoto(brand)) ?? null,
      regions: uniqueBy(
        sorted.map((brand) => brand.market?.region).filter((region): region is MarketRegion => Boolean(region)),
        REGION_ORDER,
      ),
      forms: uniqueBy(
        sorted.map((brand) => brand.form).filter((form): form is BrandForm => Boolean(form)),
        FORM_ORDER,
      ),
      strengths,
      banned: sorted.every((brand) => isBanned(brand, ingredient)),
    });
  }
  return families;
}

/** 卡片标题：代表版本的名字去掉地区括注 */
export function familyName(family: BrandFamily, locale: Locale): PickedText {
  const picked = brandName(family.primary, locale);
  const text = stripParenthetical(picked.text) || picked.text;
  return picked.lang ? { text, lang: picked.lang } : { text };
}

/** 排序键：品牌名称（默认）/ 成分（图版号）/ 地区（地区序） */
export type SortKey = 'name' | 'ingredient' | 'region';

export const SORT_KEYS: SortKey[] = ['name', 'ingredient', 'region'];

/** 名称排序用的可比键：优先拉丁名（intl / en），中文名回退拼音由 localeCompare 处理 */
function familySortName(family: BrandFamily): string {
  const name = family.primary.name;
  const latin = clean(name?.intl) ?? clean(name?.en);
  const raw = latin ?? clean(name?.display) ?? family.primary.id;
  return stripParenthetical(raw).toLowerCase();
}

function compareByName(a: BrandFamily, b: BrandFamily): number {
  return familySortName(a).localeCompare(familySortName(b), 'zh-Hans-CN');
}

/** 禁用族一律沉底（§1）；其余按所选键排 */
export function sortFamilies(families: BrandFamily[], key: SortKey): BrandFamily[] {
  const out = [...families];
  out.sort((a, b) => {
    const bannedDelta = Number(a.banned) - Number(b.banned);
    if (bannedDelta !== 0) return bannedDelta;
    if (key === 'ingredient') {
      const categoryDelta =
        rank(CATEGORY_ORDER, a.ingredient.category) - rank(CATEGORY_ORDER, b.ingredient.category);
      if (categoryDelta !== 0) return categoryDelta;
      const plateA = typeof a.ingredient.plate === 'number' ? a.ingredient.plate : Number.MAX_SAFE_INTEGER;
      const plateB = typeof b.ingredient.plate === 'number' ? b.ingredient.plate : Number.MAX_SAFE_INTEGER;
      if (plateA !== plateB) return plateA - plateB;
      // 同成分内：版本多（多国流通）的品牌族靠前，其次有实拍的靠前，再按名称
      const versionsDelta = b.brands.length - a.brands.length;
      if (versionsDelta !== 0) return versionsDelta;
      const photoDelta = Number(Boolean(b.photo)) - Number(Boolean(a.photo));
      if (photoDelta !== 0) return photoDelta;
      return compareByName(a, b);
    }
    if (key === 'region') {
      const regionDelta =
        rank(REGION_ORDER, a.regions[0] ?? 'other') - rank(REGION_ORDER, b.regions[0] ?? 'other');
      if (regionDelta !== 0) return regionDelta;
      return compareByName(a, b);
    }
    return compareByName(a, b);
  });
  return out;
}
