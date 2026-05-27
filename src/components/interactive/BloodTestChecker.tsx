import { useState, useCallback, type CSSProperties, type ChangeEvent } from 'react';
import { formatValueWithUnit } from '../../utils/medicalFormat';
import toolStrings from '../../i18n/tool-strings.json';

// Phase 12 §1.6: 外化字串到 src/i18n/tool-strings.json（铁律 #10）
// + ko 补真本地化（之前 fallback to en）
type Locale = 'zh' | 'en' | 'ja' | 'ko';

function getLocale(): Locale {
  if (typeof window !== 'undefined' && window.location.pathname.startsWith('/en')) return 'en';
  if (typeof window !== 'undefined' && window.location.pathname.startsWith('/ja')) return 'ja';
  if (typeof window !== 'undefined' && window.location.pathname.startsWith('/ko')) return 'ko';
  return 'zh';
}

type BloodCheckerStrings = {
  sections: {
    inputTitle: string;
    resultTitle: string;
    emptyHint: string;
    disclaimer1: string;
    disclaimer2: string;
    viewEmergency: string;
  };
  rangeLabels: Record<string, string>;
  actions: { printResults: string };
};

const TOOL_STRINGS = toolStrings.bloodChecker as Record<Locale, BloodCheckerStrings>;

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
const RED_WARNINGS: Record<Locale, Record<string, string>> = {
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
    display: 'flex',
    alignItems: 'center',
  },
  inputRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-sm)',
  },
  input: {
    flex: 1,
    minHeight: '44px', // WCAG 2.5.5
    background: 'transparent',
    border: 'none',
    borderBottom: '1px solid var(--color-outline)',
    color: 'var(--color-text-primary)',
    fontFamily: 'var(--font-mono)',
    fontSize: '1rem',
    padding: '10px 2px',
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
    background: 'var(--color-bg-container)',
    border: '1px solid var(--color-outline-20)',
    clipPath: 'var(--clip-corner-sm)',
    padding: 'var(--space-md)',
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
    boxShadow: '0 0 6px var(--color-text-alpha-60)',
  },
  warningBox: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-sm)',
    padding: '6px var(--space-sm)',
    background: 'var(--color-danger-alpha-10)',
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
  persistNotice: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 'var(--space-md)',
    marginTop: 'var(--space-md)',
    padding: 'var(--space-sm) var(--space-md)',
    fontSize: '0.75rem',
    color: 'var(--color-accent)',
    fontFamily: 'var(--font-body)',
  } as CSSProperties,
  clearBtn: {
    minHeight: '44px', // WCAG 2.5.5
    background: 'none',
    border: '1px solid var(--color-outline-20)',
    color: 'var(--color-text-muted)',
    fontSize: '0.75rem',
    padding: 'var(--space-xs) var(--space-md)',
    cursor: 'pointer',
    fontFamily: 'var(--font-body)',
    transition: 'color var(--transition-fast), border-color var(--transition-fast)',
  } as CSSProperties,
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
/* Mobile tabs — hidden on desktop */
.btc-mobile-tabs {
  display: none;
}
@media (max-width: 640px) {
  .btc-grid {
    grid-template-columns: 1fr;
  }
  .btc-mobile-tabs {
    display: flex;
    gap: 0;
    margin-bottom: var(--space-md);
    border-bottom: 2px solid var(--color-outline-20);
  }
  .btc-tab {
    flex: 1;
    padding: var(--space-md) var(--space-sm);
    background: none;
    border: none;
    font-family: var(--font-body);
    font-size: 0.8125rem;
    font-weight: 600;
    color: var(--color-text-muted);
    cursor: pointer;
    border-bottom: 2px solid transparent;
    margin-bottom: -2px;
    transition: color 0.15s, border-color 0.15s;
  }
  .btc-tab--active {
    color: var(--color-primary-light);
    border-bottom-color: var(--color-primary);
  }
  .btc-desktop-title {
    display: none;
  }
  .btc-grid[data-mobile-tab="input"] .btc-panel-result {
    display: none;
  }
  .btc-grid[data-mobile-tab="result"] .btc-panel-input {
    display: none;
  }
}

.btc-input:focus {
  border-bottom: 2px solid transparent !important;
  border-image: linear-gradient(90deg, var(--color-primary), var(--color-primary-container)) 1;
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
  const [mobileTab, setMobileTab] = useState<'input' | 'result'>('input');
  const locale = getLocale();
  const copy = TOOL_STRINGS[locale].sections;

  const handleChange = useCallback((id: string, raw: string) => {
    setValues((prev) => ({ ...prev, [id]: raw }));
  }, []);

  const hasAnyValue = Object.values(values).some((v) => v.trim() !== '');

  return (
    <div style={s.wrapper}>
      {/* Inject responsive + animation CSS */}
      <style>{RESPONSIVE_CSS}</style>

      <div style={s.container}>
        {/* -------- Mobile Tab Switcher -------- */}
        <div className="btc-mobile-tabs">
          <button
            className={`btc-tab ${mobileTab === 'input' ? 'btc-tab--active' : ''}`}
            onClick={() => setMobileTab('input')}
          >
            {copy.inputTitle}
          </button>
          <button
            className={`btc-tab ${mobileTab === 'result' ? 'btc-tab--active' : ''}`}
            onClick={() => setMobileTab('result')}
          >
            {copy.resultTitle}{hasAnyValue ? ` (${Object.values(values).filter(v => v.trim() !== '').length})` : ''}
          </button>
        </div>

        <div className="btc-grid" data-mobile-tab={mobileTab}>
          {/* -------- Left: Input Form -------- */}
          <div style={s.formSection} className="btc-panel-input">
            <div style={s.sectionTitle} className="btc-desktop-title">{copy.inputTitle}</div>
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
          <div style={s.resultsSection} className="btc-panel-result">
            <div style={s.sectionTitle} className="btc-desktop-title">{copy.resultTitle}</div>
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

        {/* -------- Actions bar -------- */}
        {hasAnyValue && (
          <div style={s.persistNotice}>
            <button onClick={() => window.print()} style={s.clearBtn}>
              {TOOL_STRINGS[locale].actions.printResults}
            </button>
          </div>
        )}

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

  const num = value && value.trim() !== '' ? parseFloat(value) : NaN;
  const hasValue = !isNaN(num);
  const level = hasValue ? evaluate(spec, num) : null;
  const isRed = level === 'red';
  const labelText = TOOL_STRINGS[locale].rangeLabels[spec.id] ?? spec.label;
  const statusText = hasValue
    ? level === 'green'
      ? `${labelText}: 在目标范围内`
      : level === 'yellow'
        ? `${labelText}: 需注意`
        : level === 'red'
          ? `${labelText}: 超出安全范围，需就医评估`
          : ''
    : '';
  const statusId = `btc-status-${spec.id}`;

  return (
    <div style={s.inputGroup}>
      <label style={s.label} htmlFor={`btc-${spec.id}`}>
        {labelText}
        {hasValue && (
          <span
            aria-hidden="true"
            style={{
              display: 'inline-block',
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background:
                level === 'green'
                  ? 'var(--color-safe)'
                  : level === 'yellow'
                    ? 'var(--color-caution)'
                    : level === 'red'
                      ? 'var(--color-danger)'
                      : 'transparent',
              marginLeft: '6px',
              flexShrink: 0,
            }}
          />
        )}
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
          aria-label={`${labelText} value input`}
          aria-invalid={isRed || undefined}
          aria-describedby={statusText ? statusId : undefined}
        />
        <span style={s.inputUnit}>{spec.unit}</span>
      </div>
      {statusText && (
        <span
          id={statusId}
          role="status"
          aria-live="polite"
          style={{
            position: 'absolute',
            width: '1px',
            height: '1px',
            padding: 0,
            margin: '-1px',
            overflow: 'hidden',
            clip: 'rect(0 0 0 0)',
            whiteSpace: 'nowrap',
            border: 0,
          }}
        >
          {statusText}
        </span>
      )}
    </div>
  );
}

function ResultBar({ spec, value }: { spec: RangeSpec; value: number }) {
  const level = evaluate(spec, value);
  const [lo, hi] = barBounds(spec);
  const locale: Locale = getLocale();
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
        <span>{TOOL_STRINGS[locale].rangeLabels[spec.id] ?? spec.label}</span>
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
          <span aria-hidden="true">{level === 'green' ? '✓ ' : level === 'yellow' ? '⚠ ' : level === 'red' ? '✗ ' : ''}</span>
          {formatValueWithUnit(value, spec.unit)}
        </span>
      </div>

      {/* Stacked bar */}
      <div style={s.barOuter} role="meter" aria-label={TOOL_STRINGS[locale].rangeLabels[spec.id] ?? spec.label} aria-valuenow={value} aria-valuemin={lo} aria-valuemax={hi}>
        {/* Red background spans full width */}
        <div
          style={{
            ...s.barSegment,
            left: 0,
            width: '100%',
            background: 'var(--color-danger-alpha-50)',
          }}
        />
        {/* Yellow zone */}
        <div
          style={{
            ...s.barSegment,
            left: `${yellowLeft}%`,
            width: `${yellowRight - yellowLeft}%`,
            background: 'var(--color-caution-alpha-75)',
          }}
        />
        {/* Green zone */}
        <div
          style={{
            ...s.barSegment,
            left: `${greenLeft}%`,
            width: `${greenRight - greenLeft}%`,
            background: 'var(--color-safe-alpha-80)',
          }}
        />
        {/* Value marker */}
        <div style={{ ...s.marker, left: `${markerPos}%` }} />
      </div>

      {/* Warning box for red */}
      {isRed && (
        <div style={s.warningBox}>
          <span>{RED_WARNINGS[locale][spec.id] ?? RED_WARNINGS.zh[spec.id]}</span>
          <a href={risksHref} style={s.warningLink}>
            {TOOL_STRINGS[locale].sections.viewEmergency}
          </a>
        </div>
      )}
    </div>
  );
}

