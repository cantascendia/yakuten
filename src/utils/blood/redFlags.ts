/**
 * Red-zone blood-test thresholds + life-safety warnings (zh/en/ja/ko).
 *
 * Moved verbatim from the classic BloodTestChecker when the 血检手账 tracker
 * became the only checker (2026-09). The tracker's own graded levels
 * (utils/blood/metrics.ts) are looser for E2 / T / PRL / Hb, so the tracker
 * additionally runs these classic red checks and shows RED_WARNINGS — the
 * danger warnings must never be weaker than what the classic tool showed
 * (CLAUDE.md: no weakening danger warnings).
 */
import { BC_UNITS } from './metrics';

export type Locale = 'zh' | 'en' | 'ja' | 'ko';

// --------------- Data ---------------

export interface RangeSpec {
  id: string;
  label: string;
  unit: string;
  green: [number, number];
  yellow: [number, number];
  redAbove?: number;
  redBelow?: number;
}

/**
 * BLOOD_RANGES — 经典血检自查工具的【权威阈值来源 / SSOT】。
 *
 * 有意内联，请勿迁移到 src/data/blood-ranges.json：后者当前结构仅含 zh 文本、
 * 且不含本组件红区所需的四语生命安全警告（见下方 RED_WARNINGS）。把安全阈值挪到
 * 那份 JSON 会丢失 en/ja/ko 的急救提示，属 P0 i18n 安全回归。
 * 当前 src/data/blood-ranges.json 不被任何运行时代码消费，仅作文档/规格参考；
 * 调整阈值请改这里，并视需要同步该 JSON 规格以免维护者混淆。
 *
 * 注意：下方各项 label 为中文硬编码兜底，运行时由 tool-strings.json 的 rangeLabels 覆盖。
 * 新增指标须同步在 rangeLabels 的 zh/en/ja/ko 四语补充对应 label，否则该语言会回退中文。
 */
export const BLOOD_RANGES: RangeSpec[] = [
  {
    id: 'e2',
    label: 'E2 (雌二醇)',
    unit: 'pg/mL',
    green: [100, 200],
    yellow: [200, 300],
    redAbove: 500,
    redBelow: 20,
  },
  {
    id: 't',
    label: 'T (睾酮)',
    unit: 'ng/dL',
    green: [0, 50],
    yellow: [50, 100],
    redAbove: 100,
  },
  {
    id: 'prl',
    label: 'PRL (泌乳素)',
    unit: 'ng/mL',
    green: [0, 25],
    yellow: [25, 50],
    redAbove: 50,
  },
  {
    id: 'alt',
    label: 'ALT/AST (肝功能)',
    unit: 'U/L',
    green: [0, 40],
    yellow: [40, 120],
    redAbove: 120,
  },
  {
    id: 'k',
    label: 'K\u207A (血钾)',
    unit: 'mmol/L',
    green: [3.5, 5.0],
    yellow: [5.0, 5.5],
    redAbove: 5.5,
  },
  {
    id: 'hb',
    label: 'Hb (血红蛋白)',
    unit: 'g/L',
    green: [120, 160],
    yellow: [110, 120],
    redBelow: 110,
  },
  {
    id: 'ddimer',
    label: 'D-二聚体',
    unit: 'mg/L',
    green: [0, 0.5],
    yellow: [0.5, 1.0],
    redAbove: 1.0,
  },
];

/**
 * EMERGENCY MEDICAL WARNINGS shown when a value lands in the red zone.
 * Externalized for i18n compliance (per audit AUDIT-2026-05-26-i18n-content.md).
 *
 * WARNING: These are life-safety warnings (hyperkalemia, thrombosis, liver
 * failure, etc.). All four locales (zh/en/ja/ko) must be filled with
 * medically-accurate translations. DO NOT leave any locale empty or fall
 * back to a language the user does not read — that is a P0 safety bug.
 *
 * Korean translations: AI-generated draft. PRs touching these MUST be
 * tagged `needs-medical-review` and approved by a Korean-speaking
 * clinician before release.
 */
export const RED_WARNINGS: Record<Locale, Record<string, string>> = {
  zh: {
    e2: '雌二醇水平异常，请尽快就医复查。',
    t: '睾酮偏高，抗雄药物可能需要调整，请咨询医生。',
    prl: '泌乳素明显升高，需排除垂体微腺瘤，请尽快就医。',
    alt: '肝功能指标异常，建议立即停药并就医。',
    k: '高钾血症风险，可能危及生命，请立即就医！',
    hb: '血红蛋白偏低，可能存在贫血，请就医检查。',
    ddimer: 'D-二聚体升高，有血栓风险，请立即就医！',
  },
  en: {
    e2: 'Estradiol level is abnormal. Please seek medical follow-up as soon as possible.',
    t: 'Testosterone is elevated. Anti-androgen therapy may need adjustment — consult your clinician.',
    prl: 'Prolactin is significantly elevated. A pituitary microadenoma must be ruled out — seek medical care promptly.',
    alt: 'Liver enzymes are abnormal. Stop medication immediately and seek medical care.',
    k: 'Risk of hyperkalemia. This can be life-threatening — seek medical care immediately!',
    hb: 'Hemoglobin is low. Anemia is possible — seek medical evaluation.',
    ddimer: 'D-dimer is elevated. Risk of thrombosis — seek medical care immediately!',
  },
  ja: {
    e2: 'エストラジオール値が異常です。できるだけ早く医療機関を受診してください。',
    t: 'テストステロンが高めです。抗アンドロゲン療法の調整が必要な可能性があります。医師に相談してください。',
    prl: 'プロラクチンが著しく上昇しています。下垂体微小腺腫の鑑別が必要です。早急に受診してください。',
    alt: '肝機能の数値が異常です。直ちに服薬を中止し、医療機関を受診してください。',
    k: '高カリウム血症のリスクがあります。生命に関わる可能性があるため、直ちに受診してください！',
    hb: 'ヘモグロビンが低めです。貧血の可能性があるため、医療機関で検査を受けてください。',
    ddimer: 'D-ダイマーが上昇しています。血栓のリスクがあるため、直ちに受診してください！',
  },
  // TODO(medical-review-ko): Korean translations below are an AI-generated
  // first pass following the audit. A Korean-speaking clinician MUST verify
  // medical terminology (especially "고칼륨혈증", "에스트라디올",
  // "D-이합체") before this ships to production.
  ko: {
    e2: '에스트라디올 수치 이상입니다. 가능한 빨리 의료기관에 방문하세요.',
    t: '테스토스테론이 높습니다. 항안드로겐제 조정이 필요할 수 있으니 의사와 상담하세요.',
    prl: '프로락틴이 현저히 상승했습니다. 뇌하수체 미세선종을 배제해야 하므로 즉시 의료기관을 방문하세요.',
    alt: '간기능 수치 이상입니다. 즉시 복용을 중단하고 의료기관에 방문하세요.',
    k: '고칼륨혈증 위험이 있습니다. 생명을 위협할 수 있으니 즉시 의료기관에 방문하세요!',
    hb: '헤모글로빈이 낮습니다. 빈혈 가능성이 있으니 의료기관에서 검사를 받으세요.',
    ddimer: 'D-이합체가 상승했습니다. 혈전 위험이 있으니 즉시 의료기관에 방문하세요!',
  },
};

// --------------- Evaluation helpers ---------------

export type Level = 'none' | 'green' | 'yellow' | 'red';

export function evaluate(spec: RangeSpec, value: number): Level {
  if (spec.redAbove !== undefined && value >= spec.redAbove) return 'red';
  if (spec.redBelow !== undefined && value <= spec.redBelow) return 'red';
  if (value >= spec.green[0] && value <= spec.green[1]) return 'green';
  if (value >= spec.yellow[0] && value <= spec.yellow[1]) return 'yellow';
  // Below green minimum but not red — treat as yellow
  if (value < spec.green[0] && (spec.redBelow === undefined || value > spec.redBelow)) return 'yellow';
  // Above yellow max but below red — treat as yellow
  if (spec.redAbove !== undefined && value > spec.yellow[1] && value < spec.redAbove) return 'yellow';
  return 'yellow';
}

// --------------- Bar visualisation helpers ---------------

/**
 * Compute the visual range of the bar in "display units".
 * We want: a little below the lowest meaningful boundary and above the highest.
 */
export function barBounds(spec: RangeSpec): [number, number] {
  const lo = spec.redBelow !== undefined ? spec.redBelow * 0.6 : 0;
  const hi = (spec.redAbove ?? spec.yellow[1] ?? spec.green[1]) * 1.3;
  return [lo, hi];
}

export function pct(value: number, lo: number, hi: number): number {
  return Math.max(0, Math.min(100, ((value - lo) / (hi - lo)) * 100));
}

// --------------- Tracker bridge ---------------

/** Canonical tracker value → the classic spec's display unit (same factors the tracker uses). */
function toClassicUnit(spec: RangeSpec, canonical: number): number {
  const unit = BC_UNITS[spec.id]?.units.find((u) => u.id === spec.unit);
  return unit ? unit.fromCanon(canonical) : canonical;
}

export interface RedFlag {
  id: string;
  message: string;
}

/** Classic red-zone warnings for a tracker record's canonical values. */
export function redFlagsFor(values: Record<string, number>, locale: Locale): RedFlag[] {
  const flags: RedFlag[] = [];
  for (const spec of BLOOD_RANGES) {
    const raw = values[spec.id];
    if (raw == null || Number.isNaN(raw)) continue;
    const v = toClassicUnit(spec, raw);
    if (evaluate(spec, v) === 'red') {
      flags.push({ id: spec.id, message: RED_WARNINGS[locale][spec.id] ?? RED_WARNINGS.zh[spec.id] });
    }
  }
  return flags;
}
