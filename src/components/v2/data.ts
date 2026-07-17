/**
 * v2 数据层 —— 取代原型的 window.YK_DATA 运行时全局。
 *
 * 原型（index.html:123-139）在启动时 fetch 5 个 JSON → 挂 window.YK_DATA → 才 render。
 * Astro 下改为【构建期静态 import】：JSON 在构建时内联进 HTML，
 * 静态屏零 JS，岛屿也不必等网络。
 *
 * ⚠️ 数据源纪律：一律用【仓库的 src/data/*.json】，不用设计包里的副本。
 * 设计包 design_files/src/data/ 是一份【裁剪过的旧快照】：
 *   hotlines   26 → 3   （剥掉德法俄西葡等 23 条国际热线）
 *   hospitals  49 → 25  （剥掉 24 家欧洲/拉美医院）
 *   references 43 → 42  （剥掉 awmf-s3-2019 德国指南）
 *   drugs/injection-doses 剥掉全部 *De 德语字段
 * 那是本仓库多语种本地化成果的回滚，且 hotlines 从 11637B 砍到 1516B（急救热线！）
 * 直接触碰 CONSTITUTION §1/§3。设计包的 JSON 只用于跑原型做视觉比对，一个字节都不进仓库。
 *
 * 中文 v2 页面按 scope/省份【在渲染层过滤】中国条目，JSON 本身一字不动。
 */
import drugsRaw from '../../data/drugs.json';
import hospitalsRaw from '../../data/hospitals.json';
import referencesRaw from '../../data/references.json';
import hotlinesRaw from '../../data/hotlines.json';
import injectionRaw from '../../data/injection-doses.json';

/* ========================================================================
   Types —— Astro 的 JSON import 是无类型的，此处按实测结构显式建模
   ======================================================================== */

export type DrugCategory = 'estrogen' | 'antiandrogen' | 'progestogen' | '5ari' | 'banned';
export type EvidenceLevel = 'A' | 'B' | 'C' | 'X';
export type SideEffectFrequency = 'common' | 'uncommon' | 'rare';
export type SideEffectSeverity = 'mild' | 'moderate' | 'severe';
export type InteractionSeverity = 'contraindicated' | 'major' | 'moderate' | 'minor';

export interface DoseBound { min: number; max: number; unit: string }
export interface DoseMax { value: number; unit: string }

export interface DrugRoute {
  route: string;
  doseRange: { start: DoseBound; maintenance: DoseBound; maximum: DoseMax };
  frequency: string;
  bioavailability: string;
  halfLife: string;
  peakTime: string;
  vteRisk: { rr: number; source: string };
  evidenceLevel: EvidenceLevel;
}

export interface DrugPhase { e2Target: string; duration: string }

export interface DrugMonitoring {
  test: string;
  targetRange: { min: number; max: number; unit: string };
  cautionRange?: { min: number; max: number };
  dangerThreshold?: number;
  frequency: string;
}

export interface Drug {
  id: string;
  names: { generic: string; zh: string; ja?: string; de?: string; slang: string[]; brands: string[] };
  category: DrugCategory;
  routes: DrugRoute[];
  phases: { phase1: DrugPhase; phase2: DrugPhase; phase3: DrugPhase };
  monitoring: DrugMonitoring[];
  sideEffects: Array<{ effect: string; frequency: SideEffectFrequency; severity: SideEffectSeverity }>;
  contraindications: { absolute: string[]; relative: string[] };
  interactions: Array<{ drug: string; severity: InteractionSeverity; description: string; source: string }>;
  chinaAccess: { availability: string; notes: string; affectedByBan2022: boolean };
  references: string[];
}

export interface Hospital {
  id: string;
  name: string;
  nameEn?: string;
  city: string;
  province: string;
  tier?: string;
  department: string;
  address: string;
  services: string[];
  registrationMethod: string;
  estimatedCost: string;
  communityFeedback: string;
  notes?: string;
  verificationLevel: string;
  lastVerified: string;
}

export interface Reference {
  id: string;
  authors: string;
  year: number;
  title: string;
  journal: string;
  doi?: string;
  url?: string;
  evidenceLevel: EvidenceLevel;
}

export interface Hotline {
  id: string;
  label: string;
  name: string;
  number: string;
  href: string;
  scope: string;
  hours: string;
  verificationLevel: string;
  lastVerified: string;
}

export interface InjectionDose {
  targetMg: number;
  volumeMl: number;
  applicableTo: string;
  expectedE2Range: string;
  warning?: string;
}

export interface InjectionData {
  drug: string;
  concentration: string;
  route: string;
  frequency: string;
  notes?: string;
  references?: string[];
  doses: InjectionDose[];
}

/* ========================================================================
   Exports
   ======================================================================== */

export const drugs = drugsRaw as unknown as Drug[];
export const references = referencesRaw as unknown as Reference[];
export const injection = injectionRaw as unknown as InjectionData;

/**
 * 中国大陆省份白名单 —— 用于把 hospitals.json 的 49 家过滤成中文页该显示的条目。
 *
 * 为什么用显式白名单而不是 CJK 正则：
 *   · 正则 /[一-鿿]/ 今天恰好能用（国际条目全是拉丁/西里尔/格鲁吉亚字母），
 *     但将来若加入港澳台条目会被【静默纳入】—— 那是需要人工决策的事，不该由正则替我们决定。
 *   · 显式列表可 grep、可审计、加条目时会强制作者思考归属。
 * 实测覆盖 hospitals.json 现有全部中国条目。
 */
const CN_PROVINCES = new Set([
  '北京', '上海', '天津', '重庆',
  '广东', '江苏', '浙江', '四川', '湖南', '湖北', '陕西', '辽宁',
  '黑龙江', '山东', '河南', '安徽', '云南', '福建', '贵州',
]);

/** 中文 v2 页面用：只保留中国大陆医院，保留省份过滤 chips 的数据基础。 */
export const hospitalsCN = (hospitalsRaw as unknown as Hospital[]).filter((h) => CN_PROVINCES.has(h.province));

/**
 * 中文 v2 页面用：只保留全国性热线。
 * 实测 scope === '全国' 精确命中 3 条（12356 心理援助 / 希望24 / 120 急救），
 * 与原型墨底热线卡按 3 条设计的版式完全吻合。
 */
export const hotlinesCN = (hotlinesRaw as unknown as Hotline[]).filter((h) => h.scope === '全国');

/* ========================================================================
   共享映射表 —— 移植自原型各屏顶部的硬编码常量，去重后集中一处
   ======================================================================== */

/** 药物分类（原型 drug-index-screen.jsx:YK_CATS / drug-detail-screen.jsx:YKDD_CAT） */
export const CATEGORIES: Record<DrugCategory, { zh: string; en: string; color: string }> = {
  estrogen: { zh: '雌激素', en: 'Estrogens', color: 'var(--sakura-pink)' },
  antiandrogen: { zh: '抗雄激素', en: 'Antiandrogens', color: 'var(--butter)' },
  progestogen: { zh: '孕激素', en: 'Progestogens', color: 'var(--lavender)' },
  '5ari': { zh: '5α还原酶抑制剂', en: '5-ARI', color: 'var(--mint)' },
  banned: { zh: '禁用', en: 'Banned', color: 'var(--coral)' },
};

export const CATEGORY_ORDER: DrugCategory[] = ['estrogen', 'antiandrogen', 'progestogen', '5ari', 'banned'];

/** 给药途径中译（原型 drug-detail-screen.jsx:YKDD_ROUTE_ZH） */
export const ROUTE_ZH: Record<string, string> = {
  oral: '口服',
  sublingual: '舌下含服',
  transdermal: '经皮',
  patch: '贴片',
  gel: '凝胶',
  injection: '注射',
  'injection-im': '肌肉注射',
  'injection-sc': '皮下注射',
  implant: '皮下埋植',
  topical: '外用',
};

/** 中国获取方式中译（原型 drug-detail-screen.jsx:YKDD_ACCESS_ZH / drug-index-screen.jsx） */
export const ACCESS_ZH: Record<string, string> = {
  pharmacy: '药房有售',
  prescription: '需处方',
  overseas: '海外/代购',
  hospital: '医院可开',
  banned: '网售禁止',
  unavailable: '不易获得',
  limited: '较少见',
};

/** 副作用频率（原型 drug-detail-screen.jsx:YKDD_FREQ） */
export const FREQ_ZH: Record<SideEffectFrequency, string> = {
  common: '常见 >10%',
  uncommon: '少见 1–10%',
  rare: '罕见 <1%',
};

/** 副作用严重度配色（原型 drug-detail-screen.jsx:YKDD_SEV） */
export const SEVERITY_COLOR: Record<SideEffectSeverity, string> = {
  mild: 'var(--mint-deep)',
  moderate: 'var(--honey)',
  severe: 'var(--danger)',
};

/* ========================================================================
   共享格式化 / 判定 —— 移植自原型，逐字保留阈值
   ======================================================================== */

/** 区间格式化（原型 drug-detail-screen.jsx:YKDDRange / compare-screen.jsx:fmtRange） */
export function fmtRange(r?: DoseBound | null): string {
  if (!r) return '—';
  const v = r.min === r.max ? `${r.min}` : `${r.min}–${r.max}`;
  return `${v} ${r.unit}`;
}

/**
 * VTE 相对风险配色 —— 阈值逐字取自原型
 * （drug-index-screen.jsx / drug-detail-screen.jsx / compare-screen.jsx 三处一致）：
 *   rr > 2   → danger
 *   rr > 1.2 → caution/honey
 *   否则      → mint-deep
 */
export function vteColor(rr: number): string {
  if (rr > 2) return 'var(--danger)';
  if (rr > 1.2) return 'var(--honey)';
  return 'var(--mint-deep)';
}

export const isBanned = (d: Drug): boolean => d.category === 'banned';
