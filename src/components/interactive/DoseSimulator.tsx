import { useState, useMemo } from 'react';
import type { CSSProperties } from 'react';
import {
  formatEveryDays,
  formatMedicalNumber,
  formatPercent,
  formatValueWithUnit,
} from '../../utils/medicalFormat';

type Locale = 'zh' | 'en' | 'ja';

function getLocale(): Locale {
  if (typeof window !== 'undefined' && window.location.pathname.startsWith('/en')) return 'en';
  if (typeof window !== 'undefined' && window.location.pathname.startsWith('/ja')) return 'ja';
  if (typeof window !== 'undefined' && window.location.pathname.startsWith('/ko')) return 'en';
  return 'zh';
}

const UI_COPY = {
  zh: {
    regionLabel: '剂量模拟器',
    title: '剂量模拟器',
    drugLabel: '药物选择',
    doseLabel: '单次剂量',
    doseSlider: '剂量滑块',
    intervalLabel: '给药间隔',
    intervalUnit: '天',
    intervalSlider: '间隔滑块',
    peakLabel: '稳态峰值',
    troughLabel: '稳态谷值',
    relativeConcentration: '相对浓度',
    fluctuationLabel: '波动幅度',
    fluctuationHigh: '波动较大',
    fluctuationOkay: '波动可控',
    halfLifeLabel: '消除半衰期',
    pkTableTitle: '药代动力学参数参考',
    thDrug: '药物',
    thRoute: '途径',
    thHalfLife: '半衰期',
    thPeakTime: '达峰时间',
    thBioavailability: '生物利用度',
    thInterval: '常用间隔',
    highDoseWarning: '当前剂量高于常规推荐，波动幅度增大，建议咨询医生。',
    dangerousDoseWarning: '当前剂量已达上限或超出安全范围，请勿自行使用此剂量。',
    disclaimer: '本工具不提供任何剂量推荐，仅供理解药物动力学特性参考。请以实际血检结果为准。',
  },
  en: {
    regionLabel: 'Dose simulator',
    title: 'Dose Simulator',
    drugLabel: 'Medication',
    doseLabel: 'Dose per administration',
    doseSlider: 'Dose slider',
    intervalLabel: 'Dosing interval',
    intervalUnit: 'days',
    intervalSlider: 'Interval slider',
    peakLabel: 'Steady-state peak',
    troughLabel: 'Steady-state trough',
    relativeConcentration: 'Relative concentration',
    fluctuationLabel: 'Fluctuation',
    fluctuationHigh: 'Higher fluctuation',
    fluctuationOkay: 'Controlled fluctuation',
    halfLifeLabel: 'Elimination half-life',
    pkTableTitle: 'Pharmacokinetic reference',
    thDrug: 'Drug',
    thRoute: 'Route',
    thHalfLife: 'Half-life',
    thPeakTime: 'Time to peak',
    thBioavailability: 'Bioavailability',
    thInterval: 'Typical interval',
    highDoseWarning: 'The current dose is above the usual range and may increase fluctuation. Consider discussing it with a clinician.',
    dangerousDoseWarning: 'The current dose is at or above the upper safety limit. Do not use this dose on your own.',
    disclaimer: 'This tool does not provide dosing recommendations. It is only for understanding pharmacokinetic behavior. Always rely on actual bloodwork.',
  },
  ja: {
    regionLabel: '用量シミュレーター',
    title: '用量シミュレーター',
    drugLabel: '薬剤',
    doseLabel: '1回量',
    doseSlider: '用量スライダー',
    intervalLabel: '投与間隔',
    intervalUnit: '日',
    intervalSlider: '間隔スライダー',
    peakLabel: '定常状態ピーク',
    troughLabel: '定常状態トラフ',
    relativeConcentration: '相対濃度',
    fluctuationLabel: '変動幅',
    fluctuationHigh: '変動が大きい',
    fluctuationOkay: '変動は管理可能',
    halfLifeLabel: '消失半減期',
    pkTableTitle: '薬物動態パラメータ参考',
    thDrug: '薬剤',
    thRoute: '経路',
    thHalfLife: '半減期',
    thPeakTime: 'ピーク到達',
    thBioavailability: '生物学的利用率',
    thInterval: '一般的な間隔',
    highDoseWarning: '現在の用量は一般的な範囲より高く、変動幅が大きくなる可能性があります。医師への相談を検討してください。',
    dangerousDoseWarning: '現在の用量は上限に達しているか安全域を超えています。この用量を自己判断で使用しないでください。',
    disclaimer: 'このツールは用量推奨を行いません。薬物動態の傾向を理解するための参考用です。実際の血液検査結果を優先してください。',
  },
} as const;

/* ================================
   Pharmacokinetic Data
   ================================ */

interface DrugPK {
  id: string;
  name: string;
  route: string;
  halfLifeHours: number;       // terminal half-life
  peakHours: number;            // time to peak
  bioavailability: number;      // 0-1
  typicalDoseMg: number;        // default dose
  maxDoseMg: number;            // slider max
  unit: string;
  frequencyDays: number;        // typical interval
  color: string;                // chart color
}

const ROUTE_ICONS: Record<string, string> = {
  'ev-oral': '💊 ',
  'ev-sublingual': '👅 ',
  'ev-injection': '💉 ',
  'e2-gel': '🧴 ',
  'e2-patch': '🩹 ',
};

const DRUGS: DrugPK[] = [
  {
    id: 'ev-oral',
    name: '戊酸雌二醇 口服',
    route: '口服',
    halfLifeHours: 16,
    peakHours: 4,
    bioavailability: 0.05,
    typicalDoseMg: 4,
    maxDoseMg: 8,
    unit: 'mg',
    frequencyDays: 1,
    color: 'var(--color-primary, #C84B7C)',
  },
  {
    id: 'ev-sublingual',
    name: '戊酸雌二醇 舌下',
    route: '舌下含服',
    halfLifeHours: 16,
    peakHours: 1,
    bioavailability: 0.20,
    typicalDoseMg: 2,
    maxDoseMg: 6,
    unit: 'mg',
    frequencyDays: 1,
    color: 'var(--color-primary-light, #E76395)',
  },
  {
    id: 'ev-injection',
    name: '戊酸雌二醇 注射',
    route: '肌肉/皮下注射',
    halfLifeHours: 80,
    peakHours: 24,
    bioavailability: 1.0,
    typicalDoseMg: 4,
    maxDoseMg: 10,
    unit: 'mg',
    frequencyDays: 5,
    color: 'var(--color-accent, #D4A853)',
  },
  {
    id: 'e2-gel',
    name: '雌二醇凝胶',
    route: '经皮',
    halfLifeHours: 36,
    peakHours: 4,
    bioavailability: 0.10,
    typicalDoseMg: 3,
    maxDoseMg: 6,
    unit: 'mg（1–2 泵）',
    frequencyDays: 1,
    color: 'var(--color-tertiary, #7C8CF0)',
  },
  {
    id: 'e2-patch',
    name: '雌二醇贴片',
    route: '经皮',
    halfLifeHours: 36,
    peakHours: 12,
    bioavailability: 0.10,
    typicalDoseMg: 0.1,
    maxDoseMg: 0.4,
    unit: 'mg/天',
    frequencyDays: 3.5,
    color: 'var(--color-safe, #4CAF50)',
  },
];

/* ================================
   PK Model: Single-compartment
   C(t) = (D × F × ka / (V × (ka - ke))) × (e^(-ke×t) - e^(-ka×t))
   Simplified for display:
   - Absorption phase: rise to Cmax at tpeak
   - Elimination: C(t) = Cmax × e^(-0.693 × (t-tpeak) / t½)
   Multiple doses superimposed
   ================================ */

function computeConcentrationCurve(
  drug: DrugPK,
  doseMg: number,
  intervalDays: number,
  totalDays: number,
): { time: number; conc: number }[] {
  const totalHours = totalDays * 24;
  const intervalHours = intervalDays * 24;
  const ke = 0.693 / drug.halfLifeHours;
  const ka = 0.693 / (drug.peakHours * 0.5); // absorption rate constant

  // Number of doses
  const nDoses = Math.floor(totalHours / intervalHours) + 1;
  const doseTimes: number[] = [];
  for (let i = 0; i < nDoses; i++) {
    doseTimes.push(i * intervalHours);
  }

  // Scale factor: normalize so Cmax of single dose ≈ proportional to dose×bioavailability
  // Using a simplified Bateman function
  const scaleFactor = doseMg * drug.bioavailability * 10; // arbitrary units for relative comparison

  const points: { time: number; conc: number }[] = [];

  for (let t = 0; t <= totalHours; t += 1) {
    let totalConc = 0;
    for (const td of doseTimes) {
      const elapsed = t - td;
      if (elapsed < 0) continue;
      // Bateman function: C = scale × (ka/(ka-ke)) × (e^(-ke×t) - e^(-ka×t))
      if (Math.abs(ka - ke) < 0.0001) {
        // Edge case: ka ≈ ke
        totalConc += scaleFactor * ke * elapsed * Math.exp(-ke * elapsed);
      } else {
        totalConc += scaleFactor * (ka / (ka - ke)) * (Math.exp(-ke * elapsed) - Math.exp(-ka * elapsed));
      }
    }
    points.push({ time: t / 24, conc: Math.max(0, totalConc) });
  }

  return points;
}

function findSteadyStateTrough(
  curve: { time: number; conc: number }[],
  intervalDays: number,
): number {
  // Find the trough (minimum) in the last interval
  const lastDay = curve[curve.length - 1]?.time ?? 0;
  const troughStart = lastDay - intervalDays;
  const lastInterval = curve.filter(p => p.time >= troughStart);
  if (lastInterval.length === 0) return 0;
  return Math.min(...lastInterval.map(p => p.conc));
}

function findSteadyStatePeak(
  curve: { time: number; conc: number }[],
  intervalDays: number,
): number {
  const lastDay = curve[curve.length - 1]?.time ?? 0;
  const peakStart = lastDay - intervalDays;
  const lastInterval = curve.filter(p => p.time >= peakStart);
  if (lastInterval.length === 0) return 0;
  return Math.max(...lastInterval.map(p => p.conc));
}

/* ================================
   Mini SVG Chart (no external deps)
   ================================ */

function ConcentrationChart({
  data,
  color,
  width = 600,
  height = 200,
}: {
  data: { time: number; conc: number }[];
  color: string;
  width?: number;
  height?: number;
}) {
  if (data.length === 0) return null;

  const maxConc = Math.max(...data.map(d => d.conc));
  const maxTime = Math.max(...data.map(d => d.time));
  const padding = { top: 10, right: 10, bottom: 30, left: 45 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const xScale = (t: number) => padding.left + (t / maxTime) * chartW;
  const yScale = (c: number) => padding.top + chartH - (c / (maxConc * 1.1)) * chartH;

  // Build path
  const pathD = data
    .map((d, i) => `${i === 0 ? 'M' : 'L'}${xScale(d.time).toFixed(1)},${yScale(d.conc).toFixed(1)}`)
    .join(' ');

  // Fill area
  const areaD = pathD + ` L${xScale(maxTime).toFixed(1)},${yScale(0).toFixed(1)} L${xScale(0).toFixed(1)},${yScale(0).toFixed(1)} Z`;

  // Y-axis ticks
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(r => ({
    value: Math.round(r * maxConc),
    y: yScale(r * maxConc),
  }));

  // X-axis ticks (every 2 days or so)
  const xStep = maxTime <= 7 ? 1 : maxTime <= 14 ? 2 : 3;
  const xTicks: number[] = [];
  for (let d = 0; d <= maxTime; d += xStep) xTicks.push(d);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      style={{ width: '100%', maxWidth: width, height: 'auto' }}
      role="img"
      aria-label="血药浓度曲线图"
    >
      {/* Grid lines */}
      {yTicks.map((t, i) => (
        <line
          key={`yg-${i}`}
          x1={padding.left}
          x2={width - padding.right}
          y1={t.y}
          y2={t.y}
          stroke="var(--color-outline-20)"
          strokeDasharray="4 4"
        />
      ))}

      {/* Area fill */}
      <path d={areaD} fill={color} fillOpacity={0.08} />

      {/* Line */}
      <path d={pathD} fill="none" stroke={color} strokeWidth={2} />

      {/* Y axis labels */}
      {yTicks.map((t, i) => (
        <text
          key={`yl-${i}`}
          x={padding.left - 6}
          y={t.y + 4}
          textAnchor="end"
          fill="var(--color-text-muted)"
          fontSize={10}
          fontFamily="var(--font-mono)"
        >
          {t.value}
        </text>
      ))}

      {/* X axis labels */}
      {xTicks.map((d, i) => (
        <text
          key={`xl-${i}`}
          x={xScale(d)}
          y={height - 8}
          textAnchor="middle"
          fill="var(--color-text-muted)"
          fontSize={10}
          fontFamily="var(--font-mono)"
        >
          {formatMedicalNumber(d)} 天
        </text>
      ))}

      {/* Axis labels */}
      <text
        x={padding.left - 6}
        y={padding.top - 2}
        textAnchor="end"
        fill="var(--color-text-secondary)"
        fontSize={9}
        fontFamily="var(--font-body)"
      >
        相对浓度
      </text>
    </svg>
  );
}

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
  section: {
    marginBottom: 'var(--space-lg)',
  },
  label: {
    display: 'block',
    fontFamily: 'var(--font-body)',
    fontSize: '0.875rem',
    color: 'var(--color-text-secondary)',
    marginBottom: 'var(--space-sm)',
    fontWeight: 600,
  },
  select: {
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
    cursor: 'pointer',
    transition: 'border-color var(--transition-fast)',
  },
  inputRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-md)',
    flexWrap: 'wrap' as const,
  },
  numberInput: {
    width: '90px',
    padding: 'var(--space-sm) var(--space-md)',
    background: 'var(--color-bg-container)',
    color: 'var(--color-text-primary)',
    border: 'none',
    borderBottom: '2px solid var(--color-outline)',
    fontFamily: 'var(--font-mono)',
    fontSize: '1.125rem',
    fontWeight: 700,
    outline: 'none',
    borderRadius: 0,
    textAlign: 'center' as const,
    transition: 'border-color var(--transition-fast)',
  },
  slider: {
    flex: 1,
    minWidth: '120px',
    accentColor: 'var(--color-primary)',
    cursor: 'pointer',
  },
  unit: {
    fontSize: '0.875rem',
    color: 'var(--color-text-muted)',
    fontFamily: 'var(--font-body)',
    whiteSpace: 'nowrap' as const,
  },
  chartBox: {
    background: 'var(--color-bg-container)',
    border: '1px solid var(--color-outline-20)',
    padding: 'var(--space-md)',
    marginTop: 'var(--space-lg)',
    overflow: 'hidden',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
    gap: 'var(--space-md)',
    marginTop: 'var(--space-lg)',
  },
  statCard: {
    background: 'var(--color-bg-container)',
    border: '1px solid var(--color-outline-20)',
    clipPath: 'var(--clip-corner-sm)',
    padding: 'var(--space-md)',
    textAlign: 'center' as const,
  },
  statLabel: {
    fontSize: '0.75rem',
    color: 'var(--color-text-muted)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.08em',
    marginBottom: 'var(--space-xs)',
    fontFamily: 'var(--font-body)',
  },
  statValue: {
    fontFamily: 'var(--font-mono)',
    fontSize: '1.5rem',
    fontWeight: 700,
    lineHeight: 1.2,
  },
  statSub: {
    fontSize: '0.75rem',
    color: 'var(--color-text-secondary)',
    marginTop: 'var(--space-xs)',
    fontFamily: 'var(--font-body)',
  },
  warningBox: {
    background: 'var(--color-caution-alpha-08)',
    borderLeft: '4px solid var(--color-caution)',
    padding: 'var(--space-sm) var(--space-md)',
    marginTop: 'var(--space-md)',
    color: 'var(--color-caution)',
    fontWeight: 600,
    fontSize: '0.875rem',
    fontFamily: 'var(--font-body)',
  },
  dangerBox: {
    background: 'var(--color-danger-alpha-10)',
    borderLeft: '4px solid var(--color-danger)',
    padding: 'var(--space-sm) var(--space-md)',
    marginTop: 'var(--space-md)',
    color: 'var(--color-danger)',
    fontWeight: 600,
    fontSize: '0.875rem',
    fontFamily: 'var(--font-body)',
  },
  divider: {
    border: 'none',
    borderTop: '1px solid var(--color-outline-20)',
    marginBlock: 'var(--space-lg)',
  },
  pkTable: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    marginTop: 'var(--space-md)',
    fontSize: '0.8125rem',
    fontFamily: 'var(--font-body)',
  },
  th: {
    textAlign: 'left' as const,
    padding: 'var(--space-sm) var(--space-md)',
    borderBottom: '2px solid var(--color-outline)',
    color: 'var(--color-text-muted)',
    fontSize: '0.6875rem',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.06em',
    fontWeight: 600,
  },
  td: {
    padding: 'var(--space-sm) var(--space-md)',
    borderBottom: '1px solid var(--color-outline-20)',
    color: 'var(--color-text-primary)',
  },
  tdMono: {
    padding: 'var(--space-sm) var(--space-md)',
    borderBottom: '1px solid var(--color-outline-20)',
    fontFamily: 'var(--font-mono)',
    color: 'var(--color-accent)',
    fontWeight: 600,
  },
  disclaimer: {
    fontSize: '0.75rem',
    color: 'var(--color-text-muted)',
    marginTop: 'var(--space-lg)',
    lineHeight: 1.6,
    fontFamily: 'var(--font-body)',
  },
};

/* ================================
   Component
   ================================ */

export default function DoseSimulator() {
  const locale = getLocale();
  const ui = UI_COPY[locale];
  const [drugId, setDrugId] = useState('ev-injection');
  const [doseMg, setDoseMg] = useState(4);
  const [intervalDays, setIntervalDays] = useState(5);

  const drug = DRUGS.find(d => d.id === drugId) ?? DRUGS[2];

  // Sync defaults when switching drug
  function handleDrugChange(id: string) {
    const d = DRUGS.find(dd => dd.id === id);
    if (d) {
      setDrugId(id);
      setDoseMg(d.typicalDoseMg);
      setIntervalDays(d.frequencyDays);
    }
  }

  const totalDays = useMemo(() => {
    // Show enough days for steady-state (~5 half-lives or 14 days, whichever is more)
    const fiveHalfLives = (5 * drug.halfLifeHours) / 24;
    return Math.max(14, Math.ceil(fiveHalfLives));
  }, [drug]);

  const curve = useMemo(
    () => computeConcentrationCurve(drug, doseMg, intervalDays, totalDays),
    [drug, doseMg, intervalDays, totalDays],
  );

  const trough = useMemo(() => findSteadyStateTrough(curve, intervalDays), [curve, intervalDays]);
  const peak = useMemo(() => findSteadyStatePeak(curve, intervalDays), [curve, intervalDays]);
  const fluctuation = peak > 0 ? ((peak - trough) / peak * 100) : null;

  // Warning logic
  const isHighDose = doseMg > drug.typicalDoseMg * 1.5;
  const isDangerous = doseMg >= drug.maxDoseMg;

  // Dose step
  const doseStep = drug.id === 'e2-patch' ? 0.025 : drug.id.includes('gel') ? 0.5 : 0.5;
  const doseMin = drug.id === 'e2-patch' ? 0.025 : 0.5;

  return (
    <div style={s.container} role="region" aria-label={ui.regionLabel}>
      <div style={s.title}>
        <span style={s.iconBadge}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
        </span>
        {ui.title}
      </div>

      {/* Drug Selection */}
      <div style={s.section}>
        <label htmlFor="sim-drug" style={s.label}>{ui.drugLabel}</label>
        <select
          id="sim-drug"
          value={drugId}
          onChange={e => handleDrugChange(e.target.value)}
          style={s.select}
        >
          {DRUGS.map(d => (
            <option key={d.id} value={d.id}>{ROUTE_ICONS[d.id] ?? ''}{d.name} ({d.route})</option>
          ))}
        </select>
      </div>

      {/* Responsive CSS for dose controls */}
      <style>{`
        .sim-controls { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-lg); }
        @media (max-width: 540px) { .sim-controls { grid-template-columns: 1fr; } }
      `}</style>

      {/* Dose + Interval */}
      <div className="sim-controls">
        <div style={s.section}>
          <label htmlFor="sim-dose" style={s.label}>
            {ui.doseLabel}
          </label>
          <div style={s.inputRow}>
            <input
              id="sim-dose"
              type="number"
              min={doseMin}
              max={drug.maxDoseMg}
              step={doseStep}
              value={doseMg}
              onChange={e => setDoseMg(Math.max(doseMin, Math.min(drug.maxDoseMg, Number(e.target.value))))}
              style={s.numberInput}
            />
            <span style={s.unit}>{drug.unit}</span>
          </div>
          <input
            type="range"
            min={doseMin}
            max={drug.maxDoseMg}
            step={doseStep}
            value={doseMg}
            onChange={e => setDoseMg(Number(e.target.value))}
            style={{ ...s.slider, marginTop: 'var(--space-sm)', width: '100%' }}
            aria-label={ui.doseSlider}
          />
        </div>

        <div style={s.section}>
          <label htmlFor="sim-interval" style={s.label}>
            {ui.intervalLabel}
          </label>
          <div style={s.inputRow}>
            <input
              id="sim-interval"
              type="number"
              min={0.5}
              max={14}
              step={0.5}
              value={intervalDays}
              onChange={e => setIntervalDays(Math.max(0.5, Math.min(14, Number(e.target.value))))}
              style={s.numberInput}
            />
            <span style={s.unit}>{ui.intervalUnit}</span>
          </div>
          <input
            type="range"
            min={0.5}
            max={14}
            step={0.5}
            value={intervalDays}
            onChange={e => setIntervalDays(Number(e.target.value))}
            style={{ ...s.slider, marginTop: 'var(--space-sm)', width: '100%' }}
            aria-label={ui.intervalSlider}
          />
        </div>
      </div>

      {/* Warnings */}
        {isHighDose && !isDangerous && (
          <div style={s.warningBox} role="alert">
            {ui.highDoseWarning}
          </div>
        )}
        {isDangerous && (
          <div style={s.dangerBox} role="alert">
            {ui.dangerousDoseWarning}
          </div>
        )}

      {/* Chart */}
      <div style={s.chartBox}>
        <ConcentrationChart data={curve} color={drug.color} />
      </div>

      {/* Stats */}
      <div style={s.statsGrid}>
        <div style={s.statCard}>
          <div style={s.statLabel}>{ui.peakLabel}</div>
          <div style={{ ...s.statValue, color: drug.color }}>
            {formatMedicalNumber(peak, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
          </div>
          <div style={s.statSub}>{ui.relativeConcentration}</div>
        </div>
        <div style={s.statCard}>
          <div style={s.statLabel}>{ui.troughLabel}</div>
          <div style={{ ...s.statValue, color: 'var(--color-accent)' }}>
            {formatMedicalNumber(trough, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
          </div>
          <div style={s.statSub}>{ui.relativeConcentration}</div>
        </div>
        <div style={s.statCard}>
          <div style={s.statLabel}>{ui.fluctuationLabel}</div>
          <div style={{ ...s.statValue, color: (fluctuation ?? 0) > 80 ? 'var(--color-caution)' : 'var(--color-safe)' }}>
            {fluctuation === null ? '—' : formatPercent(fluctuation, { maximumFractionDigits: 0 })}
          </div>
          <div style={s.statSub}>{(fluctuation ?? 0) > 80 ? ui.fluctuationHigh : ui.fluctuationOkay}</div>
        </div>
        <div style={s.statCard}>
          <div style={s.statLabel}>{ui.halfLifeLabel}</div>
          <div style={{ ...s.statValue, color: 'var(--color-info)' }}>
            {formatValueWithUnit(drug.halfLifeHours, 'h')}
          </div>
          <div style={s.statSub}>{drug.route}</div>
        </div>
      </div>

      {/* PK Reference Table */}
      <hr style={s.divider} />
      <div style={s.section}>
        <div style={{ ...s.label, marginBottom: 'var(--space-md)' }}>
          {ui.pkTableTitle}
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={s.pkTable}>
            <thead>
              <tr>
                <th style={s.th}>{ui.thDrug}</th>
                <th style={s.th}>{ui.thRoute}</th>
                <th style={s.th}>{ui.thHalfLife}</th>
                <th style={s.th}>{ui.thPeakTime}</th>
                <th style={s.th}>{ui.thBioavailability}</th>
                <th style={s.th}>{ui.thInterval}</th>
              </tr>
            </thead>
            <tbody>
              {DRUGS.map(d => (
                <tr key={d.id} style={d.id === drugId ? { background: 'var(--color-primary-alpha-15)' } : undefined}>
                  <td style={s.td}>{d.name}</td>
                  <td style={s.td}>{d.route}</td>
                  <td style={s.tdMono}>{formatValueWithUnit(d.halfLifeHours, 'h')}</td>
                  <td style={s.tdMono}>{formatValueWithUnit(d.peakHours, 'h')}</td>
                  <td style={s.tdMono}>{formatPercent(d.bioavailability * 100, { maximumFractionDigits: 0 })}</td>
                  <td style={s.td}>{formatEveryDays(d.frequencyDays)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Disclaimer */}
      <div style={s.disclaimer}>
        {ui.disclaimer}
      </div>
    </div>
  );
}

