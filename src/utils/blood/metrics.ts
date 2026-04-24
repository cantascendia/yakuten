/**
 * Blood metric registry, unit conversions and evaluation.
 * Ported from design_handoff_blood_checker/_v2_deps/bc-data.jsx.
 * All stored values are in canonical units; conversion happens at display time.
 */

export type Level = 'target' | 'safe' | 'caution' | 'danger' | 'empty';
export type Region = 'CN' | 'US' | 'EU' | 'JP';

export interface UnitSpec {
  id: string;
  label: string;
  toCanon: (v: number) => number;
  fromCanon: (v: number) => number;
  decimals: number;
  region?: string;
}

export interface MetricUnitRegistry {
  canonical: string;
  units: UnitSpec[];
}

export interface Metric {
  id: string;
  group: 'core' | 'extended';
  label: string;
  labelZh: string;
  icon?: string;
  canonicalUnit: string;
  target?: [number, number];
  safe?: [number, number];
  cautionAbove?: number;
  cautionBelow?: number;
  dangerAbove?: number;
  dangerBelow?: number;
  why?: string;
  sources?: string[];
}

export interface Evaluation {
  level: Level;
  color: string;
  label: string;
  note: string;
}

export const BC_UNITS: Record<string, MetricUnitRegistry> = {
  e2: {
    canonical: 'pmol/L',
    units: [
      { id: 'pmol/L', label: 'pmol/L', toCanon: (v) => v, fromCanon: (v) => v, decimals: 0, region: 'CN/EU/JP' },
      { id: 'pg/mL', label: 'pg/mL', toCanon: (v) => v * 3.671, fromCanon: (v) => v / 3.671, decimals: 0, region: 'US' },
    ],
  },
  t: {
    canonical: 'nmol/L',
    units: [
      { id: 'nmol/L', label: 'nmol/L', toCanon: (v) => v, fromCanon: (v) => v, decimals: 2, region: 'CN/EU/JP' },
      { id: 'ng/dL', label: 'ng/dL', toCanon: (v) => v / 28.842, fromCanon: (v) => v * 28.842, decimals: 0, region: 'US' },
    ],
  },
  prl: {
    canonical: 'ng/mL',
    units: [
      { id: 'ng/mL', label: 'ng/mL', toCanon: (v) => v, fromCanon: (v) => v, decimals: 1 },
      { id: 'mIU/L', label: 'mIU/L', toCanon: (v) => v / 21.2, fromCanon: (v) => v * 21.2, decimals: 0 },
    ],
  },
  alt: { canonical: 'U/L', units: [{ id: 'U/L', label: 'U/L', toCanon: (v) => v, fromCanon: (v) => v, decimals: 0 }] },
  ast: { canonical: 'U/L', units: [{ id: 'U/L', label: 'U/L', toCanon: (v) => v, fromCanon: (v) => v, decimals: 0 }] },
  k: { canonical: 'mmol/L', units: [{ id: 'mmol/L', label: 'mmol/L', toCanon: (v) => v, fromCanon: (v) => v, decimals: 2 }] },
  hb: {
    canonical: 'g/L',
    units: [
      { id: 'g/L', label: 'g/L', toCanon: (v) => v, fromCanon: (v) => v, decimals: 0 },
      { id: 'g/dL', label: 'g/dL', toCanon: (v) => v * 10, fromCanon: (v) => v / 10, decimals: 1 },
    ],
  },
  ddimer: {
    canonical: 'mg/L FEU',
    units: [
      { id: 'mg/L', label: 'mg/L FEU', toCanon: (v) => v, fromCanon: (v) => v, decimals: 2 },
      { id: 'ug/mL DDU', label: 'μg/mL DDU', toCanon: (v) => v * 2, fromCanon: (v) => v / 2, decimals: 2 },
    ],
  },
  fsh: { canonical: 'IU/L', units: [{ id: 'IU/L', label: 'IU/L', toCanon: (v) => v, fromCanon: (v) => v, decimals: 1 }] },
  lh: { canonical: 'IU/L', units: [{ id: 'IU/L', label: 'IU/L', toCanon: (v) => v, fromCanon: (v) => v, decimals: 1 }] },
  shbg: { canonical: 'nmol/L', units: [{ id: 'nmol/L', label: 'nmol/L', toCanon: (v) => v, fromCanon: (v) => v, decimals: 0 }] },
  tc: {
    canonical: 'mmol/L',
    units: [
      { id: 'mmol/L', label: 'mmol/L', toCanon: (v) => v, fromCanon: (v) => v, decimals: 2 },
      { id: 'mg/dL', label: 'mg/dL', toCanon: (v) => v / 38.67, fromCanon: (v) => v * 38.67, decimals: 0 },
    ],
  },
  tg: {
    canonical: 'mmol/L',
    units: [
      { id: 'mmol/L', label: 'mmol/L', toCanon: (v) => v, fromCanon: (v) => v, decimals: 2 },
      { id: 'mg/dL', label: 'mg/dL', toCanon: (v) => v / 88.57, fromCanon: (v) => v * 88.57, decimals: 0 },
    ],
  },
  hdl: {
    canonical: 'mmol/L',
    units: [
      { id: 'mmol/L', label: 'mmol/L', toCanon: (v) => v, fromCanon: (v) => v, decimals: 2 },
      { id: 'mg/dL', label: 'mg/dL', toCanon: (v) => v / 38.67, fromCanon: (v) => v * 38.67, decimals: 0 },
    ],
  },
  ldl: {
    canonical: 'mmol/L',
    units: [
      { id: 'mmol/L', label: 'mmol/L', toCanon: (v) => v, fromCanon: (v) => v, decimals: 2 },
      { id: 'mg/dL', label: 'mg/dL', toCanon: (v) => v / 38.67, fromCanon: (v) => v * 38.67, decimals: 0 },
    ],
  },
};

const CORE: Metric[] = [
  {
    id: 'e2',
    group: 'core',
    label: 'E2',
    labelZh: '雌二醇',
    icon: '♀',
    canonicalUnit: 'pmol/L',
    target: [367, 735],
    safe: [183, 1468],
    cautionAbove: 1835,
    cautionBelow: 73,
    why: '雌二醇谷值决定女性化速度。过低进展缓慢；持续 >500 pg/mL 增加血栓风险。',
    sources: ['WPATH SOC 8', 'Endocrine Society 2017'],
  },
  {
    id: 't',
    group: 'core',
    label: 'T',
    labelZh: '睾酮',
    icon: '♂',
    canonicalUnit: 'nmol/L',
    target: [0.35, 1.73],
    safe: [0, 3.47],
    cautionAbove: 3.47,
    why: '抗雄目标。未达标会导致女性化停滞。',
    sources: ['WPATH SOC 8'],
  },
  {
    id: 'prl',
    group: 'core',
    label: 'PRL',
    labelZh: '泌乳素',
    icon: '✦',
    canonicalUnit: 'ng/mL',
    target: [0, 25],
    safe: [0, 50],
    cautionAbove: 50,
    dangerAbove: 100,
    why: 'E2 会轻度升高 PRL。持续 >50 ng/mL 需排除垂体微腺瘤。',
    sources: ['Endocrine Society 2017'],
  },
  {
    id: 'alt',
    group: 'core',
    label: 'ALT',
    labelZh: '肝酶 ALT',
    icon: '◈',
    canonicalUnit: 'U/L',
    target: [0, 40],
    safe: [0, 80],
    cautionAbove: 80,
    dangerAbove: 120,
    why: '口服药肝代谢压力。>120 建议停药复查。',
    sources: ['WPATH SOC 8'],
  },
  {
    id: 'k',
    group: 'core',
    label: 'K⁺',
    labelZh: '血钾',
    icon: '⚡',
    canonicalUnit: 'mmol/L',
    target: [3.5, 5.0],
    safe: [3.3, 5.3],
    cautionAbove: 5.3,
    dangerAbove: 5.5,
    cautionBelow: 3.3,
    why: '螺内酯最常见的副作用。高钾可致心律失常。',
    sources: ['Endocrine Society 2017'],
  },
  {
    id: 'hb',
    group: 'core',
    label: 'Hb',
    labelZh: '血红蛋白',
    icon: '❤',
    canonicalUnit: 'g/L',
    target: [120, 160],
    safe: [110, 170],
    cautionBelow: 110,
    dangerBelow: 90,
    why: '女性化后 Hb 会下降至女性范围，属正常。过低提示贫血。',
    sources: ['WPATH SOC 8'],
  },
  {
    id: 'ddimer',
    group: 'core',
    label: 'D-Dimer',
    labelZh: 'D-二聚体',
    icon: '⚠',
    canonicalUnit: 'mg/L FEU',
    target: [0, 0.5],
    safe: [0, 0.5],
    cautionAbove: 0.5,
    dangerAbove: 1.0,
    why: '筛查血栓。如果有突发胸痛 / 下肢肿胀，立即急诊。',
    sources: ['WPATH SOC 8'],
  },
];

const EXTENDED: Metric[] = [
  {
    id: 'fsh',
    group: 'extended',
    label: 'FSH',
    labelZh: '促卵泡素',
    icon: '◦',
    canonicalUnit: 'IU/L',
    target: [0, 10],
    safe: [0, 20],
    why: '反映下丘脑-垂体-性腺轴抑制情况。',
    sources: ['Endocrine Society 2017'],
  },
  {
    id: 'lh',
    group: 'extended',
    label: 'LH',
    labelZh: '促黄体素',
    icon: '◦',
    canonicalUnit: 'IU/L',
    target: [0, 8],
    safe: [0, 15],
    why: '同 FSH。',
    sources: ['Endocrine Society 2017'],
  },
  {
    id: 'shbg',
    group: 'extended',
    label: 'SHBG',
    labelZh: '性激素结合球蛋白',
    icon: '◦',
    canonicalUnit: 'nmol/L',
    target: [40, 120],
    safe: [20, 200],
    why: 'E2 刺激 SHBG 升高。偏低提示吸收或剂量问题。',
    sources: ['Endocrine Society 2017'],
  },
  {
    id: 'tc',
    group: 'extended',
    label: 'TC',
    labelZh: '总胆固醇',
    icon: '◇',
    canonicalUnit: 'mmol/L',
    target: [0, 5.2],
    safe: [0, 6.2],
    cautionAbove: 6.2,
    why: 'HRT 一般改善血脂。升高需排查饮食因素。',
    sources: ['中国成人血脂异常防治指南 2023'],
  },
  {
    id: 'hdl',
    group: 'extended',
    label: 'HDL-C',
    labelZh: '高密度脂蛋白',
    icon: '◇',
    canonicalUnit: 'mmol/L',
    target: [1.0, 3.0],
    safe: [0.9, 3.0],
    cautionBelow: 0.9,
    why: '保护性脂蛋白，越高越好。',
    sources: ['中国成人血脂异常防治指南 2023'],
  },
  {
    id: 'ldl',
    group: 'extended',
    label: 'LDL-C',
    labelZh: '低密度脂蛋白',
    icon: '◇',
    canonicalUnit: 'mmol/L',
    target: [0, 3.4],
    safe: [0, 4.1],
    cautionAbove: 4.1,
    why: '动脉粥样硬化主要成因。',
    sources: ['中国成人血脂异常防治指南 2023'],
  },
  {
    id: 'tg',
    group: 'extended',
    label: 'TG',
    labelZh: '甘油三酯',
    icon: '◇',
    canonicalUnit: 'mmol/L',
    target: [0, 1.7],
    safe: [0, 2.3],
    cautionAbove: 2.3,
    dangerAbove: 5.6,
    why: '受 E2 影响较大，尤其口服制剂。',
    sources: ['中国成人血脂异常防治指南 2023'],
  },
];

export const BC_METRICS = { core: CORE, extended: EXTENDED };
export const BC_ALL_METRICS: Metric[] = [...CORE, ...EXTENDED];
export const BC_METRIC_BY_ID: Record<string, Metric> = Object.fromEntries(
  BC_ALL_METRICS.map((m) => [m.id, m])
);

export function bcEvaluate(metric: Metric, canonicalValue: number | null | undefined): Evaluation {
  if (canonicalValue == null || Number.isNaN(canonicalValue)) {
    return { level: 'empty', color: 'var(--b32-ink-4)', label: '—', note: '' };
  }
  const v = canonicalValue;
  if (metric.dangerAbove != null && v >= metric.dangerAbove)
    return { level: 'danger', color: 'var(--b32-danger)', label: '危险 · 立即就医', note: '此数值已达急症阈值。' };
  if (metric.dangerBelow != null && v <= metric.dangerBelow)
    return { level: 'danger', color: 'var(--b32-danger)', label: '危险 · 立即就医', note: '此数值已达急症阈值。' };
  if (metric.cautionAbove != null && v > metric.cautionAbove)
    return { level: 'caution', color: 'var(--b32-caution)', label: '偏高 · 需复查', note: '超出安全上限，建议复查与医生沟通。' };
  if (metric.cautionBelow != null && v < metric.cautionBelow)
    return { level: 'caution', color: 'var(--b32-caution)', label: '偏低 · 需复查', note: '低于安全下限，建议复查与医生沟通。' };
  if (metric.target && v >= metric.target[0] && v <= metric.target[1])
    return { level: 'target', color: 'var(--b32-target)', label: '目标区间', note: '很棒，保持当前方案。' };
  if (metric.safe && v >= metric.safe[0] && v <= metric.safe[1])
    return { level: 'safe', color: 'var(--b32-safe)', label: '可接受', note: '未达最佳目标，但尚在可接受范围。' };
  return { level: 'caution', color: 'var(--b32-caution)', label: '偏离', note: '偏离目标，建议与医生讨论。' };
}

export function bcFormat(value: number | null | undefined, decimals: number): string {
  if (value == null || Number.isNaN(value)) return '—';
  return Number(value).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
}

export function bcConvert(
  metricId: string,
  value: number | null | undefined,
  fromUnitId: string,
  toUnitId: string
): number | null {
  if (value == null || Number.isNaN(value)) return null;
  const unitSpec = BC_UNITS[metricId];
  if (!unitSpec) return value;
  const from = unitSpec.units.find((u) => u.id === fromUnitId) ?? unitSpec.units[0];
  const to = unitSpec.units.find((u) => u.id === toUnitId) ?? unitSpec.units[0];
  return to.fromCanon(from.toCanon(value));
}

export function bcUnitForRegion(metricId: string, region: Region): string | null {
  const spec = BC_UNITS[metricId];
  if (!spec) return null;
  const preferred = spec.units.find((u) => u.region && u.region.includes(region));
  return (preferred ?? spec.units[0]).id;
}
