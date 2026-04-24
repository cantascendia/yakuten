import { useEffect, useState, type ChangeEvent } from 'react';
import {
  BC_ALL_METRICS,
  BC_METRICS,
  BC_METRIC_BY_ID,
  BC_UNITS,
  bcConvert,
  bcEvaluate,
  bcUnitForRegion,
  type Metric,
} from '../../../utils/blood/metrics';
import { b32Color, b32Tint } from '../../../utils/blood/scoring';
import type { BloodPrefs, BloodRecord } from '../../../utils/blood/storage';
import { getB32Copy, type Locale } from '../../../utils/blood/i18n';
import { B32Sheet, LevelChip } from './Primitives';

interface Props {
  open: boolean;
  record: BloodRecord | null;
  prefs: BloodPrefs;
  locale: Locale;
  onSave: (record: BloodRecord) => void;
  onClose: () => void;
}

export default function InputSheet({ open, record, prefs, locale, onSave, onClose }: Props) {
  const copy = getB32Copy(locale);
  const [date, setDate] = useState('');
  const [phase, setPhase] = useState('');
  const [note, setNote] = useState('');
  const [values, setValues] = useState<Record<string, number>>({});
  const [displayUnits, setDisplayUnits] = useState<Record<string, string>>({});
  const [showExtended, setShowExtended] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDate(record?.date ?? new Date().toISOString().slice(0, 10));
    setPhase(record?.phase ?? '');
    setNote(record?.note ?? '');
    setValues({ ...(record?.values ?? {}) });
    const u: Record<string, string> = {};
    for (const m of BC_ALL_METRICS) {
      const unitId = bcUnitForRegion(m.id, prefs.unitRegion);
      if (unitId) u[m.id] = unitId;
    }
    setDisplayUnits(u);
    setShowExtended(false);
  }, [open, record, prefs]);

  if (!open) return null;

  const getDisplayString = (mid: string): string => {
    const canon = values[mid];
    if (canon == null) return '';
    const m = BC_METRIC_BY_ID[mid];
    const uId = displayUnits[mid];
    const v = bcConvert(mid, canon, m.canonicalUnit, uId);
    const unit = BC_UNITS[mid].units.find((u) => u.id === uId);
    const decimals = unit?.decimals ?? 1;
    if (v == null) return '';
    // Display without trailing zeros when possible
    const rounded = Number(v.toFixed(decimals));
    return String(rounded);
  };

  const handleValueChange = (mid: string, raw: string) => {
    setValues((prev) => {
      const next = { ...prev };
      if (raw.trim() === '' || Number.isNaN(Number(raw))) {
        delete next[mid];
        return next;
      }
      const m = BC_METRIC_BY_ID[mid];
      const canonical = bcConvert(mid, Number(raw), displayUnits[mid], m.canonicalUnit);
      if (canonical != null) next[mid] = canonical;
      return next;
    });
  };

  const handleUnitChange = (mid: string, newUnit: string) => {
    setDisplayUnits((prev) => ({ ...prev, [mid]: newUnit }));
  };

  const handleSave = () => {
    const id = record?.id ?? `rec-${Date.now()}`;
    onSave({ id, date, phase, note, values });
  };

  const filledCount = Object.keys(values).length;
  const totalCount = BC_ALL_METRICS.length;

  return (
    <B32Sheet
      open={open}
      onClose={onClose}
      fullHeight
      subtitle={record ? copy.inputKickerEdit : copy.inputKickerNew}
      title={record ? copy.inputTitleEdit : copy.inputTitleNew}
      actions={
        <button type="button" className="b32-btn b32-btn-primary" onClick={handleSave}>
          {copy.inputSave}
        </button>
      }
    >
      {/* meta row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
        <label>
          <div style={metaLabelStyle}>{copy.inputDate}</div>
          <input
            className="b32-input"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
        <label>
          <div style={metaLabelStyle}>{copy.inputPhase}</div>
          <select className="b32-input" value={phase} onChange={(e) => setPhase(e.target.value)}>
            <option value="">—</option>
            {copy.phases.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label style={{ display: 'block', marginBottom: 16 }}>
        <div style={metaLabelStyle}>{copy.inputNote}</div>
        <input
          className="b32-input"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={copy.inputNotePlaceholder}
        />
      </label>

      <div
        style={{
          padding: '10px 14px',
          background: 'var(--b32-bg-2)',
          borderRadius: 'var(--b32-r-md)',
          marginBottom: 16,
          fontSize: 12,
          color: 'var(--b32-ink-2)',
          fontWeight: 600,
        }}
      >
        {copy.inputFilled(filledCount, totalCount)}
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={sectionHeadStyle}>{copy.inputCore}</div>
        <div style={gridStyle}>
          {BC_METRICS.core.map((m) => (
            <MetricField
              key={m.id}
              metric={m}
              displayValue={getDisplayString(m.id)}
              canonicalValue={values[m.id]}
              unitId={displayUnits[m.id]}
              locale={locale}
              onValueChange={(raw) => handleValueChange(m.id, raw)}
              onUnitChange={(u) => handleUnitChange(m.id, u)}
            />
          ))}
        </div>
      </div>

      <button
        type="button"
        className="b32-btn b32-btn-ghost"
        onClick={() => setShowExtended((v) => !v)}
        style={{ width: '100%', marginBottom: 16 }}
      >
        {showExtended ? copy.inputExtendedHide : copy.inputExtendedShow}
      </button>
      {showExtended && (
        <div style={{ ...gridStyle, marginBottom: 16 }}>
          {BC_METRICS.extended.map((m) => (
            <MetricField
              key={m.id}
              metric={m}
              displayValue={getDisplayString(m.id)}
              canonicalValue={values[m.id]}
              unitId={displayUnits[m.id]}
              locale={locale}
              onValueChange={(raw) => handleValueChange(m.id, raw)}
              onUnitChange={(u) => handleUnitChange(m.id, u)}
            />
          ))}
        </div>
      )}
    </B32Sheet>
  );
}

const metaLabelStyle = {
  fontSize: 11,
  color: 'var(--b32-ink-3)',
  fontWeight: 700,
  letterSpacing: '0.06em',
  textTransform: 'uppercase' as const,
  marginBottom: 4,
  fontFamily: 'var(--b32-font-accent)',
};

const sectionHeadStyle = {
  fontSize: 11,
  color: 'var(--b32-ink-3)',
  fontWeight: 700,
  letterSpacing: '0.08em',
  textTransform: 'uppercase' as const,
  marginBottom: 10,
  fontFamily: 'var(--b32-font-accent)',
};

const gridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
  gap: 10,
};

function MetricField({
  metric,
  displayValue,
  canonicalValue,
  unitId,
  locale,
  onValueChange,
  onUnitChange,
}: {
  metric: Metric;
  displayValue: string;
  canonicalValue: number | undefined;
  unitId: string;
  locale: Locale;
  onValueChange: (raw: string) => void;
  onUnitChange: (unit: string) => void;
}) {
  const unitSpec = BC_UNITS[metric.id];
  const ev = canonicalValue != null ? bcEvaluate(metric, canonicalValue) : { level: 'empty' as const };
  const color = b32Color(ev.level);
  const tint = b32Tint(ev.level);
  const active = canonicalValue != null;

  return (
    <div
      style={{
        padding: '12px 14px',
        background: active ? tint : 'var(--b32-bg-2)',
        border: active ? `1.5px solid ${color}` : '1.5px solid transparent',
        borderRadius: 'var(--b32-r-md)',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        transition: 'all .15s',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--b32-ink-2)' }}>
          {metric.labelZh} <span style={{ fontWeight: 500, color: 'var(--b32-ink-3)' }}>{metric.label}</span>
        </span>
        {unitSpec.units.length > 1 ? (
          <select
            value={unitId}
            onChange={(e: ChangeEvent<HTMLSelectElement>) => onUnitChange(e.target.value)}
            style={{
              background: 'var(--b32-paper)',
              border: '1px solid var(--b32-divider)',
              borderRadius: 8,
              padding: '2px 6px',
              fontSize: 10,
              fontWeight: 600,
              color: 'var(--b32-ink-2)',
              cursor: 'pointer',
            }}
          >
            {unitSpec.units.map((u) => (
              <option key={u.id} value={u.id}>
                {u.label}
              </option>
            ))}
          </select>
        ) : (
          <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--b32-ink-3)' }}>{unitSpec.units[0].label}</span>
        )}
      </div>
      <input
        type="number"
        inputMode="decimal"
        step="any"
        min="0"
        value={displayValue}
        placeholder="—"
        onChange={(e) => onValueChange(e.target.value)}
        style={{
          background: 'transparent',
          border: 'none',
          borderBottom: `1.5px solid ${active ? color : 'var(--b32-divider)'}`,
          outline: 'none',
          fontFamily: 'var(--b32-font-num)',
          fontSize: 22,
          fontWeight: 700,
          color: active ? color : 'var(--b32-ink)',
          padding: '4px 0',
          minHeight: 36,
        }}
      />
      {canonicalValue != null && <LevelChip level={ev.level} locale={locale} />}
    </div>
  );
}
