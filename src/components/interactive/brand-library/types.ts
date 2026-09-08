/**
 * 药物图鉴 v2 — 数据类型 SSOT
 * 对应 docs/specs/brand-library-v2.md §4；数据文件 src/data/brand-library.json。
 *
 * 纪律：品牌/厂商/规格/外观是事实型产品信息，不含剂量建议；不确定的字段留空不猜。
 */

export type Locale = 'zh' | 'en' | 'ja' | 'ko';

/** 多语文本：zh 必填，其余可选；UI 回退链 locale → en → zh */
export interface L10n {
  zh: string;
  en?: string;
  ja?: string;
  ko?: string;
}

export interface L10nList {
  zh: string[];
  en?: string[];
  ja?: string[];
  ko?: string[];
}

export type IngredientCategory =
  | 'estrogen'
  | 'antiandrogen'
  | 'gnrh'
  | 'progestogen'
  | '5ari'
  | 'banned';

/** 该成分在 HRT 语境下的角色定位（不是剂量建议） */
export type HrtUse = 'standard' | 'situational' | 'cautioned' | 'banned';

export interface Ingredient {
  /** 稳定 id，如 'estradiol-valerate' */
  id: string;
  /** 图版号（页面显示 №，按 category 内顺序） */
  plate: number;
  category: IngredientCategory;
  /** 关联 drugs.json 的 id（可多个：同成分不同途径） */
  drugIds: string[];
  /** 主链接用的 drugs.json id（→ drugLinks.getDrugPageUrl） */
  primaryDrugId: string;
  name: { zh: string; en: string; inn?: string; ja?: string; ko?: string };
  /** 酯/前体（如 '戊酸酯'），无则省略 */
  ester?: L10n;
  /** 一句话角色（事实描述，非建议） */
  role: L10n;
  /** 化学等效换算事实（如 '2 mg 戊酸雌二醇 ≈ 1.53 mg 雌二醇'），无则省略 */
  equivalence?: L10n;
  hrtUse: HrtUse;
  /** hrtUse 为 cautioned/banned 时的原因一句话 */
  reason?: L10n;
  /** role / reason 中医学结论的依据：references.json 的 id 列表（UI 紧邻渲染引用链接） */
  references?: string[];
}

export type BrandStatus =
  | 'prescription'
  | 'otc'
  | 'approved'
  | 'grey'
  | 'discontinued'
  | 'banned'
  | 'cautioned';

export type BrandForm =
  | 'tablet'
  | 'capsule'
  | 'softgel'
  | 'patch'
  | 'gel-pump'
  | 'gel-sachet'
  | 'spray'
  | 'ampoule'
  | 'vial'
  | 'prefilled-syringe'
  | 'implant'
  | 'nasal-spray'
  | 'pessary'
  | 'powder-vial';

export type TabletShape =
  | 'round'
  | 'oval'
  | 'oblong'
  | 'triangle'
  | 'octagon'
  | 'apple'
  | 'square'
  | 'diamond'
  | 'capsule';

export type Coating = 'sugar' | 'film' | 'none';
export type Score = 'none' | 'single' | 'cross';

export type MarketRegion =
  | 'cn'
  | 'tw-hk'
  | 'jp'
  | 'kr'
  | 'sea'
  | 'in'
  | 'eu'
  | 'na'
  | 'oceania'
  | 'latam'
  | 'other';

export type Confidence = 'verified' | 'reported' | 'unverified';

export type RegulatoryAuthority =
  | 'NMPA'
  | 'TFDA'
  | 'PMDA'
  | 'MFDS'
  | 'FDA'
  | 'EMA'
  | 'MHRA'
  | 'Swissmedic'
  | 'CDSCO'
  | 'TGA'
  | 'Medsafe'
  | 'HSA'
  | 'ThaiFDA'
  | 'BPOM'
  | 'COFEPRIS'
  | 'ANVISA'
  | 'other';

export interface Appearance {
  /** 片剂/胶囊形状；非固体剂型省略 */
  shape?: TabletShape;
  /** 示意图主体色（hex）。透明溶液/凝胶用近白或省略 */
  color?: string;
  /** 次色（双色胶囊/贴片边缘等） */
  secondaryColor?: string;
  colorName?: L10n;
  coating?: Coating;
  score?: Score;
  /** 压印文字，如 'BAYER' / 'DP' */
  imprint?: string;
  /** 自由文字外观描述 */
  description: L10n;
  /** 反查 chip 用的显式色族；缺省时 search.ts 依据 color hex 粗分 */
  colorFamily?: ColorFamily;
}

export interface BrandImage {
  /** 本地路径（/brands/x.webp）或外链 */
  src: string;
  kind: 'photo' | 'schematic';
  /** 来源/署名，如 '站方实拍' / 'Abbott 官网' */
  credit?: L10n;
  alt: L10n;
}

export interface Brand {
  /** 稳定 id，如 'progynova-de' */
  id: string;
  ingredientId: string;
  /** 详情页链接用 drugs.json id */
  drugId: string;
  name: {
    /** 页面显示名，如 '补佳乐 Progynova' */
    display: string;
    /** 当地语言商品名（如 'プロギノン・デポー'） */
    local?: string;
    /** 国际/拉丁商品名 */
    intl?: string;
    aliases?: string[];
    en?: string;
    ja?: string;
    ko?: string;
  };
  manufacturer: {
    name: L10n;
    /** 母公司/授权方 */
    parent?: string;
    /** ISO 3166-1 alpha-2 */
    country: string;
  };
  market: {
    /** 上市/流通国家 ISO 3166-1 alpha-2（多国用主要国，其余写 notes） */
    country: string;
    countryName: L10n;
    region: MarketRegion;
  };
  status: BrandStatus;
  form: BrandForm;
  /** 规格列表，如 ['1 mg', '2 mg'] / ['10 mg/mL × 1 mL'] */
  strengths: string[];
  /** 包装规格，如 '21 片/盒' */
  pack?: L10n;
  appearance: Appearance;
  /** 外包装特征 */
  packaging?: L10n;
  /** 鉴别要点（真伪/版本区分） */
  identification?: L10nList;
  notes?: L10n;
  image?: BrandImage;
  links?: {
    official?: string;
    leaflet?: string;
    regulator?: string;
  };
  regulatory?: {
    authority: RegulatoryAuthority;
    /** 批准文号 / 注册证号 */
    code?: string;
  };
  confidence: Confidence;
  /** ISO date */
  lastVerified?: string;
}

export interface BrandLibraryData {
  version: 2;
  lastReviewed: string;
  ingredients: Ingredient[];
  brands: Brand[];
}

/** 反查条颜色族（示意图 color → 族由 colorFamily 字段显式给出，避免算法误判） */
export type ColorFamily =
  | 'white'
  | 'blue'
  | 'yellow'
  | 'pink'
  | 'red'
  | 'orange'
  | 'brown'
  | 'green'
  | 'purple'
  | 'peach'
  | 'clear'
  | 'multi';

