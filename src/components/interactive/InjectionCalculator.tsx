import { useState, useMemo } from 'react';
import type { CSSProperties } from 'react';
import {
  formatMedicalNumber,
  formatRangeWithUnit,
  formatValueWithUnit,
} from '../../utils/medicalFormat';

type Locale = 'zh' | 'en' | 'ja';

function getLocale(): Locale {
  if (typeof window !== 'undefined' && window.location.pathname.startsWith('/en')) return 'en';
  if (typeof window !== 'undefined' && window.location.pathname.startsWith('/ja')) return 'ja';
  return 'zh';
}

const UI_COPY = {
  zh: {
    regionLabel: '注射剂量换算器',
    drugLabel: '药物规格',
    targetDoseLabel: '目标周剂量',
    weeklyUnit: 'mg/周',
    doseSlider: '剂量滑块',
    volumeLabel: '抽取体积',
    syringeLabel: '建议注射器',
    e2RangeLabel: '预期 E2 范围',
    troughEstimate: '（谷值估算）',
    applicableLabel: '适用人群',
    referenceTitle: '参考换算表',
    thDose: '剂量',
    thVolume: '体积',
    thSyringe: '注射器',
    thExpectedE2: '预期 E2',
    thApplicable: '适用人群',
    cautionTitle: '接近剂量上限',
    cautionBody: `超过 ${formatValueWithUnit(5, 'mg/周')} 需医疗监督`,
    dangerTitle: '不建议此剂量',
    dangerBody: `超过 ${formatValueWithUnit(7, 'mg/周')} 显著增加血栓风险`,
    forbiddenTitle: '禁止！',
    forbiddenBody: `单次剂量 ≥${formatValueWithUnit(10, 'mg')} 有严重健康风险，包括血栓、肝损伤。请立即咨询医生。`,
    disclaimer: '预期 E2 范围为近似谷值估算，实际血药浓度因个体代谢、注射部位、体脂比例等因素有显著差异。请定期进行血检监测，并在医疗专业人员指导下调整剂量。本工具不构成医疗建议。',
  },
  en: {
    regionLabel: 'Injection dose calculator',
    drugLabel: 'Formulation',
    targetDoseLabel: 'Target weekly dose',
    weeklyUnit: 'mg/week',
    doseSlider: 'Dose slider',
    volumeLabel: 'Draw volume',
    syringeLabel: 'Suggested syringe',
    e2RangeLabel: 'Expected E2 range',
    troughEstimate: '(approximate trough)',
    applicableLabel: 'Applicable group',
    referenceTitle: 'Reference table',
    thDose: 'Dose',
    thVolume: 'Volume',
    thSyringe: 'Syringe',
    thExpectedE2: 'Expected E2',
    thApplicable: 'Applicable group',
    cautionTitle: 'Near upper dose limit',
    cautionBody: `More than ${formatValueWithUnit(5, 'mg/week')} should be medically supervised`,
    dangerTitle: 'Dose not recommended',
    dangerBody: `More than ${formatValueWithUnit(7, 'mg/week')} substantially increases clot risk`,
    forbiddenTitle: 'Do not use',
    forbiddenBody: `A single dose ≥${formatValueWithUnit(10, 'mg')} carries serious health risks, including thrombosis and liver injury. Consult a clinician immediately.`,
    disclaimer: 'The expected E2 range is only an approximate trough estimate. Actual levels vary with metabolism, injection site, and body composition. Monitor with regular blood tests and adjust only with qualified medical guidance.',
  },
  ja: {
    regionLabel: '注射用量換算ツール',
    drugLabel: '製剤',
    targetDoseLabel: '目標週用量',
    weeklyUnit: 'mg/週',
    doseSlider: '用量スライダー',
    volumeLabel: '吸引量',
    syringeLabel: '推奨シリンジ',
    e2RangeLabel: '予想 E2 範囲',
    troughEstimate: '（トラフ推定）',
    applicableLabel: '適用対象',
    referenceTitle: '参考換算表',
    thDose: '用量',
    thVolume: '容量',
    thSyringe: 'シリンジ',
    thExpectedE2: '予想 E2',
    thApplicable: '適用対象',
    cautionTitle: '上限に近い用量',
    cautionBody: `${formatValueWithUnit(5, 'mg/週')} を超える場合は医療管理が必要です`,
    dangerTitle: '推奨できない用量',
    dangerBody: `${formatValueWithUnit(7, 'mg/週')} を超えると血栓リスクが大きく上がります`,
    forbiddenTitle: '使用禁止',
    forbiddenBody: `単回用量が ${formatValueWithUnit(10, 'mg')} 以上では、血栓や肝障害を含む重大な健康リスクがあります。直ちに医師へ相談してください。`,
    disclaimer: '予想 E2 範囲は概算の谷値推定にすぎません。実際の血中濃度は代謝、注射部位、体組成などで大きく変動します。定期的な採血を行い、調整は必ず医療専門職の指導のもとで行ってください。',
  },
} as const;

/* ================================
   Data & Logic
   ================================ */

interface DrugSpec {
  name: string;
  concentration: number; // mg/mL
  unit: string;
}

interface DoseInfo {
  mg: number;
  applicable: string;
  e2Range: string;
  warning?: string;
}

const DRUG_SPECS: DrugSpec[] = [
  { name: `Progynon Depot (戊酸雌二醇) ${formatValueWithUnit(10, 'mg/mL')}`, concentration: 10, unit: 'mg/mL' },
  { name: `Progynon Depot ${formatValueWithUnit(40, 'mg/mL')}`, concentration: 40, unit: 'mg/mL' },
  { name: `环戊丙酸雌二醇 ${formatValueWithUnit(5, 'mg/mL')}`, concentration: 5, unit: 'mg/mL' },
];

const DOSE_TABLE: DoseInfo[] = [
  { mg: 1, applicable: '青少年阶段 1', e2Range: formatRangeWithUnit(30, 60, 'pg/mL') },
  { mg: 2, applicable: '青少年阶段 2 / 成人起始', e2Range: formatRangeWithUnit(40, 80, 'pg/mL') },
  { mg: 3, applicable: '成人起始 / 维持', e2Range: formatRangeWithUnit(60, 120, 'pg/mL') },
  { mg: 4, applicable: '成人维持', e2Range: formatRangeWithUnit(80, 160, 'pg/mL') },
  { mg: 5, applicable: '成人维持上限', e2Range: formatRangeWithUnit(100, 200, 'pg/mL'), warning: '接近上限' },
];

function getSyringe(volumeMl: number): string {
  if (volumeMl <= 0.3) return '1 mL 注射器（胰岛素针）';
  if (volumeMl <= 1.0) return '1 mL 注射器';
  return '3 mL 注射器';
}

function getClosestDoseInfo(mg: number): DoseInfo | null {
  if (mg <= 0) return null;
  // Find the closest entry in the table
  let closest = DOSE_TABLE[0];
  let minDist = Math.abs(mg - closest.mg);
  for (const entry of DOSE_TABLE) {
    const dist = Math.abs(mg - entry.mg);
    if (dist < minDist) {
      closest = entry;
      minDist = dist;
    }
  }
  return closest;
}

type WarningLevel = 'safe' | 'caution' | 'danger' | 'forbidden';

function getWarningLevel(mg: number): WarningLevel {
  if (mg >= 10) return 'forbidden';
  if (mg > 7) return 'danger';
  if (mg > 5) return 'caution';
  return 'safe';
}

/* ================================
   Styles (CSS-in-JS using CSS Variables)
   ================================ */

const styles: Record<string, CSSProperties> = {
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
    width: '100px',
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
  doseUnit: {
    fontSize: '0.875rem',
    color: 'var(--color-text-muted)',
    fontFamily: 'var(--font-body)',
    whiteSpace: 'nowrap' as const,
  },
  resultGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: 'var(--space-md)',
    marginTop: 'var(--space-lg)',
  },
  resultCard: {
    background: 'var(--color-bg-container)',
    border: '1px solid var(--color-outline-20)',
    clipPath: 'var(--clip-corner-sm)',
    padding: 'var(--space-md)',
    textAlign: 'center' as const,
  },
  resultLabel: {
    fontSize: '0.75rem',
    color: 'var(--color-text-muted)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.08em',
    marginBottom: 'var(--space-xs)',
    fontFamily: 'var(--font-body)',
  },
  resultValue: {
    fontFamily: 'var(--font-mono)',
    fontSize: '1.75rem',
    fontWeight: 700,
    color: 'var(--color-accent)',
    lineHeight: 1.2,
  },
  resultSub: {
    fontSize: '0.8125rem',
    color: 'var(--color-text-secondary)',
    marginTop: 'var(--space-xs)',
    fontFamily: 'var(--font-body)',
    whiteSpace: 'nowrap' as const,
  },
  badge: {
    display: 'inline-block',
    padding: '2px var(--space-sm)',
    fontSize: '0.75rem',
    fontWeight: 600,
    fontFamily: 'var(--font-body)',
    background: 'rgba(200, 75, 124, 0.15)',
    color: 'var(--color-primary-light)',
    borderRadius: 0,
    clipPath: 'polygon(0 0, 92% 0, 100% 30%, 100% 100%, 8% 100%, 0 70%)',
  },
  warningCaution: {
    background: 'rgba(255, 152, 0, 0.1)',
    borderLeft: '4px solid var(--color-caution)',
    padding: 'var(--space-sm) var(--space-md)',
    marginTop: 'var(--space-md)',
    color: 'var(--color-caution)',
    fontWeight: 600,
    fontSize: '0.875rem',
    fontFamily: 'var(--font-body)',
  },
  warningDanger: {
    background: 'var(--sl-color-red-low, rgba(244, 67, 54, 0.1))',
    borderLeft: '4px solid var(--color-danger)',
    padding: 'var(--space-sm) var(--space-md)',
    marginTop: 'var(--space-md)',
    color: 'var(--color-danger)',
    fontWeight: 600,
    fontSize: '0.875rem',
    fontFamily: 'var(--font-body)',
  },
  warningForbidden: {
    background: 'linear-gradient(135deg, var(--color-danger, #F44336), var(--color-danger-dark, #D32F2F))',
    color: 'var(--color-text-on-dark, #FFFFFF)',
    padding: 'var(--space-md) var(--space-lg)',
    marginTop: 'var(--space-md)',
    fontWeight: 700,
    fontSize: '1rem',
    textAlign: 'center' as const,
    clipPath: 'var(--clip-corner-sm)',
    fontFamily: 'var(--font-body)',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    marginTop: 'var(--space-md)',
    fontSize: '0.875rem',
    fontFamily: 'var(--font-body)',
  },
  th: {
    textAlign: 'left' as const,
    padding: 'var(--space-sm) var(--space-md)',
    borderBottom: '2px solid var(--color-outline)',
    color: 'var(--color-text-muted)',
    fontSize: '0.75rem',
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
  activeRow: {
    background: 'rgba(200, 75, 124, 0.08)',
  },
  sectionDivider: {
    border: 'none',
    borderTop: '1px solid var(--color-outline-20)',
    marginBlock: 'var(--space-lg)',
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
   Syringe Icon (SVG)
   ================================ */

function SyringeIcon({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M18 2l4 4" />
      <path d="M17 7l3-3" />
      <path d="m19 9-8.7 8.7c-.4.4-1 .4-1.4 0L5.3 14.1c-.4-.4-.4-1 0-1.4L14 4" />
      <path d="m5 19-3 3" />
      <path d="m2 22 3-3" />
      <path d="m9 13 2 2" />
      <path d="m11 11 2 2" />
      <path d="m13 9 2 2" />
    </svg>
  );
}

/* ================================
   Component
   ================================ */

export default function InjectionCalculator() {
  const locale = getLocale();
  const ui = UI_COPY[locale];
  const [drugIndex, setDrugIndex] = useState(0);
  const [doseMg, setDoseMg] = useState(2);

  const drug = DRUG_SPECS[drugIndex];
  const warningLevel = getWarningLevel(doseMg);
  const isForbidden = warningLevel === 'forbidden';

  const volumeMl = useMemo(() => doseMg / drug.concentration, [doseMg, drug.concentration]);
  const syringeRec = useMemo(() => getSyringe(volumeMl), [volumeMl]);
  const doseInfo = useMemo(() => getClosestDoseInfo(doseMg), [doseMg]);

  function handleDoseChange(value: number) {
    const clamped = Math.max(0.5, Math.min(10, value));
    // Round to nearest 0.5
    setDoseMg(Math.round(clamped * 2) / 2);
  }

  // Color for the volume display based on warning level
  const volumeColor =
    warningLevel === 'safe'
      ? 'var(--color-accent)'
      : warningLevel === 'caution'
        ? 'var(--color-caution)'
        : 'var(--color-danger)';

  return (
    <div style={styles.container} role="region" aria-label={ui.regionLabel}>
      {/* --- Drug Selection --- */}
      <div style={styles.section}>
        <label htmlFor="drug-select" style={styles.label}>
          {ui.drugLabel}
        </label>
        <select
          id="drug-select"
          value={drugIndex}
          onChange={(e) => setDrugIndex(Number(e.target.value))}
          style={styles.select}
          onFocus={(e) => {
            e.currentTarget.style.borderBottomColor = 'var(--color-primary)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderBottomColor = 'var(--color-outline)';
          }}
        >
          {DRUG_SPECS.map((spec, i) => (
            <option key={i} value={i}>
              {spec.name}
            </option>
          ))}
        </select>
      </div>

      {/* --- Dose Input --- */}
      <div style={styles.section}>
        <label htmlFor="dose-input" style={styles.label}>
          {ui.targetDoseLabel}
        </label>
        <div style={styles.inputRow}>
          <input
            id="dose-input"
            type="number"
            min={0.5}
            max={10}
            step={0.5}
            value={doseMg}
            onChange={(e) => handleDoseChange(Number(e.target.value))}
            style={{
              ...styles.numberInput,
              borderBottomColor: isForbidden ? 'var(--color-danger)' : undefined,
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderBottomColor = isForbidden
                ? 'var(--color-danger)'
                : 'var(--color-primary)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderBottomColor = isForbidden
                ? 'var(--color-danger)'
                : 'var(--color-outline)';
            }}
            aria-describedby="dose-warning"
          />
          <span style={styles.doseUnit}>{ui.weeklyUnit}</span>
          <input
            type="range"
            min={0.5}
            max={10}
            step={0.5}
            value={doseMg}
            onChange={(e) => handleDoseChange(Number(e.target.value))}
            style={styles.slider}
            aria-label={ui.doseSlider}
          />
        </div>
      </div>

      {/* --- Warnings --- */}
      <div id="dose-warning" aria-live="polite">
        {warningLevel === 'caution' && (
          <div style={styles.warningCaution} role="alert">
            <strong>&#9888; {ui.cautionTitle}</strong> &mdash; {ui.cautionBody}
          </div>
        )}
        {warningLevel === 'danger' && (
          <div style={styles.warningDanger} role="alert">
            <strong>&#9888; {ui.dangerTitle}</strong> &mdash; {ui.dangerBody}
          </div>
        )}
        {warningLevel === 'forbidden' && (
          <div style={styles.warningForbidden} role="alert">
            <strong>&#9888; {ui.forbiddenTitle}</strong> {ui.forbiddenBody}
          </div>
        )}
      </div>

      {/* --- Results --- */}
      {!isForbidden && (
        <div style={styles.resultGrid}>
          {/* Volume */}
          <div style={styles.resultCard}>
            <div style={styles.resultLabel}>{ui.volumeLabel}</div>
            <div style={{ ...styles.resultValue, color: volumeColor }}>
              {formatMedicalNumber(volumeMl, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div style={styles.resultSub}>mL</div>
          </div>

          {/* Syringe */}
          <div style={styles.resultCard}>
            <div style={styles.resultLabel}>{ui.syringeLabel}</div>
            <div
              style={{
                color: 'var(--color-primary-light)',
                fontSize: '1.5rem',
                marginBottom: 'var(--space-xs)',
                display: 'flex',
                justifyContent: 'center',
              }}
            >
              <SyringeIcon size={28} />
            </div>
            <div style={styles.resultSub}>{syringeRec}</div>
          </div>

          {/* E2 Range */}
          <div style={styles.resultCard}>
            <div style={styles.resultLabel}>{ui.e2RangeLabel}</div>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '1.125rem',
                fontWeight: 700,
                color: 'var(--color-info)',
                lineHeight: 1.4,
              }}
            >
              {doseInfo?.e2Range ?? '--'}
            </div>
            <div style={styles.resultSub}>{ui.troughEstimate}</div>
          </div>

          {/* Applicable Group */}
          <div style={styles.resultCard}>
            <div style={styles.resultLabel}>{ui.applicableLabel}</div>
            <div style={{ marginTop: 'var(--space-sm)' }}>
              <span style={styles.badge}>{doseInfo?.applicable ?? '--'}</span>
            </div>
            {doseInfo?.warning && (
              <div
                style={{
                  marginTop: 'var(--space-sm)',
                  fontSize: '0.75rem',
                  color: 'var(--color-caution)',
                  fontWeight: 600,
                }}
              >
                {doseInfo.warning}
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- Reference Table --- */}
      <hr style={styles.sectionDivider} />
      <div style={styles.section}>
        <div style={{ ...styles.label, marginBottom: 'var(--space-md)' }}>
          {ui.referenceTitle} &mdash; {drug.name}
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>{ui.thDose}</th>
                <th style={styles.th}>{ui.thVolume}</th>
                <th style={styles.th}>{ui.thSyringe}</th>
                <th style={styles.th}>{ui.thExpectedE2}</th>
                <th style={styles.th}>{ui.thApplicable}</th>
              </tr>
            </thead>
            <tbody>
              {DOSE_TABLE.map((row) => {
                const vol = row.mg / drug.concentration;
                const isActive = Math.abs(doseMg - row.mg) < 0.25;
                return (
                  <tr key={row.mg} style={isActive ? styles.activeRow : undefined}>
                    <td style={styles.tdMono}>{formatValueWithUnit(row.mg, 'mg')}</td>
                    <td style={styles.tdMono}>{formatValueWithUnit(vol, 'mL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td style={styles.td}>{getSyringe(vol)}</td>
                    <td style={styles.td}>{row.e2Range}</td>
                    <td style={styles.td}>
                      {row.applicable}
                      {row.warning && (
                        <span
                          style={{
                            marginLeft: 'var(--space-sm)',
                            color: 'var(--color-caution)',
                            fontSize: '0.75rem',
                          }}
                        >
                          ({row.warning})
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- Disclaimer --- */}
      <div style={styles.disclaimer}>
        {ui.disclaimer}
      </div>
    </div>
  );
}

