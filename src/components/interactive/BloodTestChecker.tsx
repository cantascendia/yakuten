import { useState, useCallback, type CSSProperties, type ChangeEvent } from 'react';
import { formatValueWithUnit } from '../../utils/medicalFormat';

type Locale = 'zh' | 'en' | 'ja';

function getLocale(): Locale {
  if (typeof window !== 'undefined' && window.location.pathname.startsWith('/en')) return 'en';
  if (typeof window !== 'undefined' && window.location.pathname.startsWith('/ja')) return 'ja';
  return 'zh';
}

const SECTION_COPY = {
  zh: {
    inputTitle: '输入血检数值',
    resultTitle: '评估结果',
    emptyHint: '在左侧输入你的血检数值，结果将实时显示在这里。',
    disclaimer1: '此工具仅供参考，不能替代医生的判读。如果你有任何疑虑，请直接就医。',
    disclaimer2: '所有计算都在你的浏览器本地完成，不会传输或存储任何数据。',
    viewEmergency: '查看急症指南',
  },
  en: {
    inputTitle: 'Enter lab values',
    resultTitle: 'Assessment',
    emptyHint: 'Enter your blood test values on the left. Results will appear here in real time.',
    disclaimer1: 'This tool is for reference only and cannot replace clinician interpretation. If you are concerned, seek medical care directly.',
    disclaimer2: 'All calculations run locally in your browser. No data is transmitted or stored.',
    viewEmergency: 'View emergency guide',
  },
  ja: {
    inputTitle: '検査値を入力',
    resultTitle: '評価結果',
    emptyHint: '左側に血液検査の数値を入力すると、結果がここに表示されます。',
    disclaimer1: 'このツールは参考用であり、医師の判断の代わりにはなりません。不安がある場合は直接受診してください。',
    disclaimer2: 'すべての計算はブラウザ内で完結し、データは送信・保存されません。',
    viewEmergency: '緊急ガイドを見る',
  },
} as const;

const RANGE_LABELS = {
  zh: {
    e2: 'E2 (雌二醇)',
    t: 'T (睾酮)',
    prl: 'PRL (泌乳素)',
    alt: 'ALT/AST (肝功能)',
    k: 'K+ (血钾)',
    hb: 'Hb (血红蛋白)',
    ddimer: 'D-二聚体',
  },
  en: {
    e2: 'E2 (Estradiol)',
    t: 'T (Testosterone)',
    prl: 'PRL (Prolactin)',
    alt: 'ALT/AST (Liver function)',
    k: 'K+ (Serum potassium)',
    hb: 'Hb (Hemoglobin)',
    ddimer: 'D-dimer',
  },
  ja: {
    e2: 'E2 (エストラジオール)',
    t: 'T (テストステロン)',
    prl: 'PRL (プロラクチン)',
    alt: 'ALT/AST (肝機能)',
    k: 'K+ (血清カリウム)',
    hb: 'Hb (ヘモグロビン)',
    ddimer: 'D-ダイマー',
  },
} as const;

/* ================================================================
   Blood Test Self-Check Tool  —  BloodTestChecker React Island
   Pure frontend calculation. Zero data transmission. No storage.
   ================================================================ */

// --------------- Data ---------------

interface RangeSpec {
  id: string;
  label: string;
  unit: string;
  green: [number, number];
  yellow: [number, number];
  redAbove?: number;
  redBelow?: number;
  /** Warning copy shown when the value lands in red */
  redWarning: string;
}

const BLOOD_RANGES: RangeSpec[] = [
  {
    id: 'e2',
    label: 'E2 (雌二醇)',
    unit: 'pg/mL',
    green: [100, 200],
    yellow: [200, 300],
    redAbove: 500,
    redBelow: 20,
    redWarning: '雌二醇水平异常，请尽快就医复查。',
  },
  {
    id: 't',
    label: 'T (睾酮)',
    unit: 'ng/dL',
    green: [0, 50],
    yellow: [50, 100],
    redAbove: 100,
    redWarning: '睾酮偏高，抗雄药物可能需要调整，请咨询医生。',
  },
  {
    id: 'prl',
    label: 'PRL (泌乳素)',
    unit: 'ng/mL',
    green: [0, 25],
    yellow: [25, 50],
    redAbove: 50,
    redWarning: '泌乳素明显升高，需排除垂体微腺瘤，请尽快就医。',
  },
  {
    id: 'alt',
    label: 'ALT/AST (肝功能)',
    unit: 'U/L',
    green: [0, 40],
    yellow: [40, 120],
    redAbove: 120,
    redWarning: '肝功能指标异常，建议立即停药并就医。',
  },
  {
    id: 'k',
    label: 'K\u207A (血钾)',
    unit: 'mmol/L',
    green: [3.5, 5.0],
    yellow: [5.0, 5.5],
    redAbove: 5.5,
    redWarning: '高钾血症风险，可能危及生命，请立即就医！',
  },
  {
    id: 'hb',
    label: 'Hb (血红蛋白)',
    unit: 'g/L',
    green: [120, 160],
    yellow: [110, 120],
    redBelow: 110,
    redWarning: '血红蛋白偏低，可能存在贫血，请就医检查。',
  },
  {
    id: 'ddimer',
    label: 'D-二聚体',
    unit: 'mg/L',
    green: [0, 0.5],
    yellow: [0.5, 1.0],
    redAbove: 1.0,
    redWarning: 'D-二聚体升高，有血栓风险，请立即就医！',
  },
];

// --------------- Evaluation helpers ---------------

type Level = 'none' | 'green' | 'yellow' | 'red';

function evaluate(spec: RangeSpec, value: number): Level {
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
function barBounds(spec: RangeSpec): [number, number] {
  const lo = spec.redBelow !== undefined ? spec.redBelow * 0.6 : 0;
  const hi = (spec.redAbove ?? spec.yellow[1] ?? spec.green[1]) * 1.3;
  return [lo, hi];
}

function pct(value: number, lo: number, hi: number): number {
  return Math.max(0, Math.min(100, ((value - lo) / (hi - lo)) * 100));
}

// --------------- Styles (CSS-in-JS referencing CSS vars) ---------------

const s: Record<string, CSSProperties> = {
  wrapper: {
    maxWidth: 960,
    margin: '0 auto',
    fontFamily: 'var(--font-body)',
    color: 'var(--color-text-primary)',
  },
  container: {
    background: 'var(--glass-bg)',
    backdropFilter: 'var(--glass-blur)',
    WebkitBackdropFilter: 'var(--glass-blur)',
    border: 'var(--glass-border)',
    clipPath: 'var(--clip-corner)',
    padding: 'var(--space-lg)',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 'var(--space-xl)',
  },
  /* Input form column */
  formSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-md)',
  },
  sectionTitle: {
    fontFamily: 'var(--font-display)',
    fontSize: '1.15rem',
    color: 'var(--color-primary-light)',
    marginBottom: 'var(--space-sm)',
    letterSpacing: '0.02em',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-xs)',
  },
  label: {
    fontSize: '0.85rem',
    color: 'var(--color-text-secondary)',
  },
  inputRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-sm)',
  },
  input: {
    flex: 1,
    background: 'transparent',
    border: 'none',
    borderBottom: '1px solid var(--color-outline)',
    color: 'var(--color-text-primary)',
    fontFamily: 'var(--font-mono)',
    fontSize: '1rem',
    padding: '6px 2px',
    outline: 'none',
    transition: 'border-color var(--transition-fast)',
  },
  inputUnit: {
    fontSize: '0.8rem',
    color: 'var(--color-text-muted)',
    minWidth: 60,
    textAlign: 'right' as const,
    whiteSpace: 'nowrap' as const,
  },
  /* Results column */
  resultsSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-md)',
  },
  resultRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  resultLabel: {
    fontSize: '0.8rem',
    color: 'var(--color-text-secondary)',
    display: 'flex',
    justifyContent: 'space-between',
  },
  barOuter: {
    position: 'relative',
    height: 14,
    borderRadius: 0,
    overflow: 'hidden',
    background: 'var(--color-bg-container)',
  },
  barSegment: {
    position: 'absolute',
    top: 0,
    height: '100%',
  },
  marker: {
    position: 'absolute',
    top: -3,
    width: 3,
    height: 20,
    background: 'var(--color-text-primary)',
    transform: 'translateX(-50%)',
    zIndex: 2,
    boxShadow: '0 0 6px rgba(230,224,238,0.6)',
  },
  warningBox: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-sm)',
    padding: '6px var(--space-sm)',
    background: 'rgba(244,67,54,0.12)',
    border: '1px solid var(--color-danger)',
    fontSize: '0.8rem',
    color: 'var(--color-danger)',
    lineHeight: 1.4,
  },
  warningLink: {
    flexShrink: 0,
    padding: '4px 10px',
    background: 'var(--color-danger)',
    color: '#fff',
    fontFamily: 'var(--font-body)',
    fontSize: '0.75rem',
    border: 'none',
    cursor: 'pointer',
    textDecoration: 'none',
    whiteSpace: 'nowrap' as const,
  },
  disclaimer: {
    marginTop: 'var(--space-lg)',
    padding: 'var(--space-md)',
    background: 'var(--color-bg-container)',
    border: '1px solid var(--color-outline-20)',
    fontSize: '0.82rem',
    color: 'var(--color-text-muted)',
    lineHeight: 1.7,
    textAlign: 'center' as const,
  },
  emptyHint: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    minHeight: 200,
    color: 'var(--color-text-muted)',
    fontSize: '0.9rem',
    textAlign: 'center' as const,
    lineHeight: 1.6,
    padding: 'var(--space-lg)',
  },
};

// --------------- Responsive style tag ---------------

const RESPONSIVE_CSS = `
.btc-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-xl);
}
@media (max-width: 640px) {
  .btc-grid {
    grid-template-columns: 1fr;
  }
}
.btc-input:focus {
  border-bottom-color: var(--color-primary) !important;
}
@keyframes btc-pulse-red {
  0%, 100% { box-shadow: 0 0 0 0 rgba(244,67,54,0.3); }
  50% { box-shadow: 0 0 12px 2px rgba(244,67,54,0.35); }
}
.btc-red-row {
  animation: btc-pulse-red 2s ease-in-out infinite;
}
@media (prefers-reduced-motion: reduce) {
  .btc-red-row {
    animation: none;
    box-shadow: 0 0 8px 1px rgba(244,67,54,0.25);
  }
}
`;

// --------------- Component ---------------

export default function BloodTestChecker() {
  const [values, setValues] = useState<Record<string, string>>({});
  const locale = getLocale();
  const copy = SECTION_COPY[locale];

  const handleChange = useCallback((id: string, raw: string) => {
    setValues((prev) => ({ ...prev, [id]: raw }));
  }, []);

  const hasAnyValue = Object.values(values).some((v) => v.trim() !== '');

  return (
    <div style={s.wrapper}>
      {/* Inject responsive + animation CSS */}
      <style>{RESPONSIVE_CSS}</style>

      <div style={s.container}>
        <div className="btc-grid">
          {/* -------- Left: Input Form -------- */}
          <div style={s.formSection}>
            <div style={s.sectionTitle}>{copy.inputTitle}</div>
            {BLOOD_RANGES.map((spec) => (
              <InputField
                key={spec.id}
                spec={spec}
                locale={locale}
                value={values[spec.id] ?? ''}
                onChange={handleChange}
              />
            ))}
          </div>

          {/* -------- Right: Results Dashboard -------- */}
          <div style={s.resultsSection}>
            <div style={s.sectionTitle}>{copy.resultTitle}</div>
            {hasAnyValue ? (
              BLOOD_RANGES.map((spec) => {
                const raw = values[spec.id] ?? '';
                if (raw.trim() === '') return null;
                const num = parseFloat(raw);
                if (isNaN(num)) return null;
                return <ResultBar key={spec.id} spec={spec} value={num} />;
              })
            ) : (
              <div style={s.emptyHint}>
                {copy.emptyHint}
              </div>
            )}
          </div>
        </div>

        {/* -------- Disclaimer -------- */}
        <div style={s.disclaimer}>
          {copy.disclaimer1}
          <br />
          {copy.disclaimer2}
        </div>
      </div>
    </div>
  );
}

// --------------- Sub-components ---------------

function InputField({
  spec,
  locale,
  value,
  onChange,
}: {
  spec: RangeSpec;
  locale: Locale;
  value: string;
  onChange: (id: string, raw: string) => void;
}) {
  const handleInput = (e: ChangeEvent<HTMLInputElement>) => {
    onChange(spec.id, e.target.value);
  };

  return (
    <div style={s.inputGroup}>
      <label style={s.label} htmlFor={`btc-${spec.id}`}>
        {RANGE_LABELS[locale][spec.id as keyof typeof RANGE_LABELS.zh] ?? spec.label}
      </label>
      <div style={s.inputRow}>
        <input
          id={`btc-${spec.id}`}
          className="btc-input"
          type="number"
          inputMode="decimal"
          step="any"
          min="0"
          placeholder="--"
          style={s.input}
          value={value}
          onChange={handleInput}
          aria-label={`${RANGE_LABELS[locale][spec.id as keyof typeof RANGE_LABELS.zh] ?? spec.label} value input`}
        />
        <span style={s.inputUnit}>{spec.unit}</span>
      </div>
    </div>
  );
}

function ResultBar({ spec, value }: { spec: RangeSpec; value: number }) {
  const level = evaluate(spec, value);
  const [lo, hi] = barBounds(spec);
  const locale =
    typeof window !== 'undefined' && window.location.pathname.startsWith('/en')
      ? 'en'
      : typeof window !== 'undefined' && window.location.pathname.startsWith('/ja')
        ? 'ja'
        : 'zh';
  const risksHref = `/${locale}/risks/`;

  // Colour stops for the bar
  const greenLeft = pct(spec.green[0], lo, hi);
  const greenRight = pct(spec.green[1], lo, hi);
  const yellowLeft = pct(spec.yellow[0], lo, hi);
  const yellowRight = pct(spec.yellow[1], lo, hi);

  const markerPos = pct(value, lo, hi);

  const isRed = level === 'red';

  return (
    <div style={s.resultRow} className={isRed ? 'btc-red-row' : ''}>
      <div style={s.resultLabel}>
        <span>{RANGE_LABELS[locale][spec.id as keyof typeof RANGE_LABELS.zh] ?? spec.label}</span>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            whiteSpace: 'nowrap',
            color:
              level === 'green'
                ? 'var(--color-safe)'
                : level === 'yellow'
                  ? 'var(--color-caution)'
                  : level === 'red'
                    ? 'var(--color-danger)'
                    : 'var(--color-text-muted)',
          }}
        >
          {formatValueWithUnit(value, spec.unit)}
        </span>
      </div>

      {/* Stacked bar */}
      <div style={s.barOuter} role="meter" aria-label={RANGE_LABELS[locale][spec.id as keyof typeof RANGE_LABELS.zh] ?? spec.label} aria-valuenow={value} aria-valuemin={lo} aria-valuemax={hi}>
        {/* Red background spans full width */}
        <div
          style={{
            ...s.barSegment,
            left: 0,
            width: '100%',
            background: 'rgba(244,67,54,0.5)',
          }}
        />
        {/* Yellow zone */}
        <div
          style={{
            ...s.barSegment,
            left: `${yellowLeft}%`,
            width: `${yellowRight - yellowLeft}%`,
            background: 'rgba(255,152,0,0.75)',
          }}
        />
        {/* Green zone */}
        <div
          style={{
            ...s.barSegment,
            left: `${greenLeft}%`,
            width: `${greenRight - greenLeft}%`,
            background: 'rgba(76,175,80,0.8)',
          }}
        />
        {/* Value marker */}
        <div style={{ ...s.marker, left: `${markerPos}%` }} />
      </div>

      {/* Warning box for red */}
      {isRed && (
        <div style={s.warningBox}>
          <span>{spec.redWarning}</span>
          <a href={risksHref} style={s.warningLink}>
            {SECTION_COPY[locale].viewEmergency}
          </a>
        </div>
      )}
    </div>
  );
}

