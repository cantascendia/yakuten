import type { CSSProperties } from 'react';
import {
  BC_METRICS,
  BC_UNITS,
  bcConvert,
  bcEvaluate,
  bcFormat,
  bcUnitForRegion,
  type Metric,
} from '../../../utils/blood/metrics';
import {
  b32Buckets,
  b32Color,
  b32FormatValue,
  b32Grade,
  b32Highlights,
  b32LevelLabelZh,
  b32Score,
  b32Series,
  b32Streak,
  b32Tint,
  type Highlights,
  type ImprovementItem,
  type MilestoneItem,
  type WorryItem,
} from '../../../utils/blood/scoring';
import { bcTrend, type BloodPrefs, type BloodRecord } from '../../../utils/blood/storage';
import { getB32Copy, gradeSubtitle, gradeTitle, type Locale } from '../../../utils/blood/i18n';
import {
  LevelChip,
  LevelDot,
  RingGauge,
  SectionLabel,
  Sparkline,
  StickerBadge,
  WashiTape,
  useIsDesktop,
  type WashiColor,
} from './Primitives';

interface Props {
  records: BloodRecord[];
  activeRecord: BloodRecord | null;
  prefs: BloodPrefs;
  locale: Locale;
  onSelectRecord: (id: string) => void;
  onAddNew: () => void;
  onEditRecord: (record: BloodRecord) => void;
  onOpenShare: () => void;
}

export default function Dashboard({
  records,
  activeRecord,
  prefs,
  locale,
  onSelectRecord,
  onAddNew,
  onEditRecord,
  onOpenShare,
}: Props) {
  const copy = getB32Copy(locale);
  const isDesktop = useIsDesktop();
  const score = b32Score(activeRecord);
  const grade = b32Grade(score);
  const buckets = b32Buckets(activeRecord);
  const highlights = activeRecord ? b32Highlights(records, activeRecord.id) : { improvements: [], milestones: [], worries: [] };
  const sorted = [...records].sort((a, b) => b.date.localeCompare(a.date));
  const activeIdx = sorted.findIndex((r) => r.id === activeRecord?.id);
  const streak = b32Streak(records);

  const segments = (
    [
      { weight: buckets.target, color: 'var(--b32-target)' },
      { weight: buckets.safe, color: 'var(--b32-safe)' },
      { weight: buckets.caution, color: 'var(--b32-caution)' },
      { weight: buckets.danger, color: 'var(--b32-danger)' },
    ] as const
  ).filter((s) => s.weight > 0);

  const gridStyle: CSSProperties = isDesktop
    ? { display: 'grid', gridTemplateColumns: '1.15fr 1fr', gap: 22, alignItems: 'start' }
    : { display: 'grid', gridTemplateColumns: '1fr', gap: 16 };

  return (
    <div>
      <div style={gridStyle}>
        <HeroGradeCard
          score={score}
          grade={grade}
          buckets={buckets}
          activeRecord={activeRecord}
          segments={segments.length > 0 ? segments.map((s) => ({ ...s })) : [{ weight: 1, color: 'var(--b32-ink-4)' }]}
          streak={streak}
          recordNth={records.length - activeIdx}
          isDesktop={isDesktop}
          locale={locale}
          onOpenShare={onOpenShare}
          onAddNew={onAddNew}
          onEditActive={() => activeRecord && onEditRecord(activeRecord)}
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <HighlightsStrip highlights={highlights} prefs={prefs} locale={locale} />
          <TimelineRail records={sorted} activeId={activeRecord?.id ?? null} locale={locale} onSelect={onSelectRecord} onAddNew={onAddNew} />
        </div>
      </div>

      {activeRecord && (
        <div style={{ marginTop: 20 }}>
          <SectionLabel tape="pink">{copy.sectionMetrics}</SectionLabel>
          <div className="b32-card" style={{ padding: '6px 0', overflow: 'hidden' }}>
            {[...BC_METRICS.core, ...BC_METRICS.extended].map((m) => {
              const v = activeRecord.values[m.id];
              if (v == null) return null;
              return (
                <MetricRow
                  key={m.id}
                  metric={m}
                  records={records}
                  currentRecordId={activeRecord.id}
                  value={v}
                  prefs={prefs}
                  locale={locale}
                />
              );
            })}
            {Object.keys(activeRecord.values).length === 0 && (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--b32-ink-3)', fontSize: 13 }}>
                {copy.sectionMetricsEmpty}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function HeroGradeCard({
  score,
  grade,
  buckets,
  activeRecord,
  segments,
  streak,
  recordNth,
  isDesktop,
  locale,
  onOpenShare,
  onAddNew,
  onEditActive,
}: {
  score: number | null;
  grade: ReturnType<typeof b32Grade>;
  buckets: ReturnType<typeof b32Buckets>;
  activeRecord: BloodRecord | null;
  segments: { weight: number; color: string }[];
  streak: ReturnType<typeof b32Streak>;
  recordNth: number;
  isDesktop: boolean;
  locale: Locale;
  onOpenShare: () => void;
  onAddNew: () => void;
  onEditActive: () => void;
}) {
  const copy = getB32Copy(locale);

  if (!activeRecord) {
    return (
      <div className="b32-card b32-fade-in" style={{ padding: '40px 28px', textAlign: 'center' }}>
        <StickerBadge color="var(--b32-sakura-blush)" size={80} rotate={-4}>
          <svg width="36" height="36" viewBox="0 0 40 40" fill="none" aria-hidden="true">
            <path d="M20 4 C 12 14 8 20 8 26 a 12 12 0 0 0 24 0 c 0 -6 -4 -12 -12 -22 Z" fill="var(--b32-sakura-deep)" />
          </svg>
        </StickerBadge>
        <div style={{ fontFamily: 'var(--b32-font-display)', fontSize: 26, fontWeight: 700, marginTop: 16 }}>
          {copy.emptyHeadline}
        </div>
        <p style={{ fontSize: 14, color: 'var(--b32-ink-2)', maxWidth: 340, margin: '10px auto 22px', lineHeight: 1.7, whiteSpace: 'pre-line' }}>
          {copy.emptyBody}
        </p>
        <button type="button" onClick={onAddNew} className="b32-btn b32-btn-primary">
          {copy.emptyCta}
        </button>
      </div>
    );
  }

  const toneColor =
    grade.tone === 'hype'
      ? 'var(--b32-sakura-deep)'
      : grade.tone === 'warm'
      ? 'var(--b32-mint-deep)'
      : 'var(--b32-lavender-deep)';
  const toneTint =
    grade.tone === 'hype'
      ? 'var(--b32-sakura-paper)'
      : grade.tone === 'warm'
      ? 'var(--b32-mint-paper)'
      : 'var(--b32-lavender-paper)';
  const washiColor: WashiColor = grade.tone === 'hype' ? 'pink' : grade.tone === 'warm' ? 'mint' : 'lavender';

  const titleText = gradeTitle(copy, grade.tone, grade.grade);
  const subtitleText = gradeSubtitle(copy, grade.grade);
  const recordNumStr = String(recordNth).padStart(2, '0');

  return (
    <div className="b32-card b32-fade-in" style={{ padding: 0, overflow: 'hidden', position: 'relative' }}>
      <div style={{ position: 'absolute', top: -4, left: 30, display: 'flex', gap: 12, alignItems: 'center' }}>
        <WashiTape color={washiColor} width={90} rotate={-2} />
      </div>
      <div style={{ position: 'absolute', top: 14, right: 16 }}>
        <StickerBadge color={toneColor} size={44} rotate={8} style={{ color: 'white' }}>
          <span style={{ fontSize: 14, fontWeight: 800, letterSpacing: '0.02em' }}>{grade.grade}</span>
        </StickerBadge>
      </div>

      <div
        style={{
          padding: isDesktop ? '40px 32px 24px' : '40px 22px 22px',
          display: 'flex',
          alignItems: 'center',
          gap: 26,
          flexWrap: 'wrap',
        }}
      >
        <RingGauge
          size={isDesktop ? 200 : 180}
          stroke={16}
          segments={segments}
          score={score}
          label={copy.heroPowerLabel}
          sublabel={activeRecord.date}
        />
        <div style={{ flex: '1 1 220px', minWidth: 200 }}>
          <div
            style={{
              fontFamily: 'var(--b32-font-accent)',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.14em',
              color: 'var(--b32-sakura-deep)',
              marginBottom: 6,
            }}
          >
            {copy.heroRecordNth(recordNumStr, activeRecord.phase || copy.noPhase)}
          </div>
          <div
            style={{
              fontFamily: 'var(--b32-font-display)',
              fontWeight: 700,
              fontSize: isDesktop ? 30 : 26,
              lineHeight: 1.15,
              color: 'var(--b32-ink)',
              marginBottom: 8,
            }}
          >
            {titleText}
          </div>
          <div
            style={{
              fontFamily: 'var(--b32-font-hand)',
              fontSize: 18,
              lineHeight: 1.5,
              color: toneColor,
              marginBottom: 16,
              transform: 'rotate(-0.3deg)',
            }}
          >
            {subtitleText}
          </div>

          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
            {buckets.danger > 0 && <BucketPill n={buckets.danger} level="danger" locale={locale} />}
            {buckets.caution > 0 && <BucketPill n={buckets.caution} level="caution" locale={locale} />}
            {buckets.target > 0 && <BucketPill n={buckets.target} level="target" locale={locale} />}
            {buckets.safe > 0 && <BucketPill n={buckets.safe} level="safe" locale={locale} />}
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" onClick={onOpenShare} className="b32-btn b32-btn-primary">
              <ShareIcon /> {copy.shareCta}
            </button>
            <button type="button" onClick={onAddNew} className="b32-btn b32-btn-ghost">
              {copy.addNew}
            </button>
            <button type="button" onClick={onEditActive} className="b32-btn b32-btn-soft">
              ✎ {locale === 'zh' ? '编辑' : locale === 'ja' ? '編集' : 'Edit'}
            </button>
          </div>
        </div>
      </div>

      <div
        style={{
          padding: '12px 22px',
          background: toneTint,
          borderTop: '1px dashed rgba(74, 40, 56, 0.18)',
          display: 'flex',
          gap: 18,
          flexWrap: 'wrap',
          fontSize: 12,
          color: 'var(--b32-ink-2)',
        }}
      >
        <StreakItem label={copy.streakRecordedLabel} value={copy.streakRecordedValue(streak.count)} />
        {streak.days > 0 && <StreakItem label={copy.streakSpanLabel} value={copy.streakSpanValue(streak.days)} />}
        <StreakItem label={copy.streakFirstLabel} value={streak.first ?? '—'} />
      </div>
    </div>
  );
}

function BucketPill({ n, level, locale }: { n: number; level: 'target' | 'safe' | 'caution' | 'danger'; locale: Locale }) {
  const copy = getB32Copy(locale);
  const labelMap = {
    target: locale === 'zh' ? b32LevelLabelZh('target') : copy.levelTarget,
    safe: locale === 'zh' ? b32LevelLabelZh('safe') : copy.levelSafe,
    caution: locale === 'zh' ? b32LevelLabelZh('caution') : copy.levelCaution,
    danger: locale === 'zh' ? b32LevelLabelZh('danger') : copy.levelDanger,
  };
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '4px 10px',
        borderRadius: 999,
        background: b32Tint(level),
        color: b32Color(level),
        fontSize: 12,
        fontWeight: 700,
        fontFamily: 'var(--b32-font-accent)',
      }}
    >
      <LevelDot level={level} size={6} />
      {labelMap[level]} {n}
    </span>
  );
}

function StreakItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span
        style={{
          fontSize: 10,
          color: 'var(--b32-ink-3)',
          fontWeight: 700,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          fontFamily: 'var(--b32-font-accent)',
          marginRight: 6,
        }}
      >
        {label}
      </span>
      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--b32-ink)' }} className="b32-tabnum">
        {value}
      </span>
    </div>
  );
}

function ShareIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M8 10V2M5 5l3-3 3 3" />
      <path d="M3 9v3a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V9" />
    </svg>
  );
}

function HighlightsStrip({ highlights, prefs, locale }: { highlights: Highlights; prefs: BloodPrefs; locale: Locale }) {
  const copy = getB32Copy(locale);
  const top = [
    ...highlights.milestones.map((h) => ({ ...h, kind: 'milestone' as const })),
    ...highlights.improvements.filter((h) => !h.isNew).slice(0, 2).map((h) => ({ ...h, kind: 'improvement' as const })),
    ...highlights.worries.slice(0, 1).map((h) => ({ ...h, kind: 'worry' as const })),
  ].slice(0, 3);

  if (top.length === 0) return null;

  return (
    <div>
      <SectionLabel tape="mint">{copy.sectionHighlights}</SectionLabel>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {top.map((h, i) => (
          <HighlightCard key={i} h={h} prefs={prefs} locale={locale} />
        ))}
      </div>
    </div>
  );
}

// MilestoneItem already has a `kind: 'first-target'` literal — omit it before
// we tag the highlight union so the discriminant is unambiguous.
type HighlightUnion =
  | (Omit<MilestoneItem, 'kind'> & { kind: 'milestone' })
  | (ImprovementItem & { kind: 'improvement' })
  | (WorryItem & { kind: 'worry' });

function HighlightCard({ h, prefs, locale }: { h: HighlightUnion; prefs: BloodPrefs; locale: Locale }) {
  const copy = getB32Copy(locale);
  const m = h.metric;
  const palette = {
    milestone: { bg: 'var(--b32-butter-paper)', border: 'var(--b32-honey)', tag: copy.tagMilestone, emoji: '🎉', tone: 'var(--b32-honey)' },
    improvement: { bg: 'var(--b32-mint-paper)', border: 'var(--b32-mint-deep)', tag: copy.tagImprovement, emoji: '📈', tone: 'var(--b32-mint-deep)' },
    worry: { bg: 'var(--b32-sakura-paper)', border: 'var(--b32-sakura-deep)', tag: copy.tagWorry, emoji: '🩺', tone: 'var(--b32-sakura-deep)' },
  }[h.kind];

  let line = '';
  if (h.kind === 'milestone') {
    line = copy.milestoneFirstTarget;
  } else if (h.kind === 'improvement') {
    if (h.isNew) {
      line = copy.improvementFirstRecord;
    } else if (h.from != null) {
      const from = b32FormatValue(m.id, h.from, prefs.unitRegion);
      const to = b32FormatValue(m.id, h.to, prefs.unitRegion);
      line = copy.improvementRange(from.text, to.text, to.unit);
    }
  } else if (h.kind === 'worry') {
    const worryLabel = locale === 'zh'
      ? (h.labelKey === 'worry.review' ? copy.levelDanger : copy.levelCaution)
      : (h.labelKey === 'worry.review' ? copy.levelDanger : copy.levelCaution);
    line = `${worryLabel}${copy.worrySuffix}`;
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '36px 1fr',
        gap: 12,
        alignItems: 'center',
        width: '100%',
        padding: '14px 16px',
        background: palette.bg,
        border: `1.5px solid ${palette.border}`,
        borderRadius: 'var(--b32-r-md)',
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 12,
          background: 'white',
          border: `1.5px solid ${palette.border}`,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 18,
        }}
        aria-hidden="true"
      >
        {palette.emoji}
      </div>
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: palette.tone,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            fontFamily: 'var(--b32-font-accent)',
          }}
        >
          {palette.tag} · {m.labelZh}
        </div>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--b32-ink)', marginTop: 2 }}>{line}</div>
      </div>
    </div>
  );
}

function TimelineRail({
  records,
  activeId,
  locale,
  onSelect,
  onAddNew,
}: {
  records: BloodRecord[];
  activeId: string | null;
  locale: Locale;
  onSelect: (id: string) => void;
  onAddNew: () => void;
}) {
  const copy = getB32Copy(locale);
  if (records.length <= 1) return null;
  return (
    <div>
      <SectionLabel tape="butter">{copy.sectionTimeline}</SectionLabel>
      <div className="b32-card" style={{ padding: 10, maxHeight: 260, overflow: 'auto' }}>
        {records.map((r) => {
          const s = b32Score(r);
          const g = b32Grade(s);
          const active = r.id === activeId;
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => onSelect(r.id)}
              style={{
                display: 'grid',
                gridTemplateColumns: '36px 1fr auto',
                gap: 10,
                alignItems: 'center',
                width: '100%',
                padding: '10px 12px',
                marginBottom: 4,
                background: active ? 'var(--b32-sakura-paper)' : 'transparent',
                border: active ? '1.5px solid var(--b32-sakura-deep)' : '1.5px solid transparent',
                borderRadius: 'var(--b32-r-sm)',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all .15s',
              }}
            >
              <StickerBadge color={active ? 'var(--b32-sakura-deep)' : 'var(--b32-bg-2)'} size={36} rotate={-4} style={{ color: active ? 'white' : 'var(--b32-ink-2)' }}>
                <span style={{ fontSize: 13, fontWeight: 800 }}>{g.grade}</span>
              </StickerBadge>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--b32-ink)' }} className="b32-tabnum">
                  {r.date}
                </div>
                <div style={{ fontSize: 11, color: 'var(--b32-ink-3)', marginTop: 1 }}>{r.phase || '—'}</div>
              </div>
              <div className="b32-tabnum" style={{ fontSize: 15, fontWeight: 700, color: active ? 'var(--b32-sakura-deep)' : 'var(--b32-ink-2)' }}>
                {s ?? '—'}
              </div>
            </button>
          );
        })}
        <button
          type="button"
          onClick={onAddNew}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            width: '100%',
            padding: '10px 12px',
            marginTop: 4,
            background: 'transparent',
            border: '1.5px dashed var(--b32-ink-4)',
            borderRadius: 'var(--b32-r-sm)',
            cursor: 'pointer',
            fontFamily: 'var(--b32-font-accent)',
            fontSize: 13,
            fontWeight: 700,
            color: 'var(--b32-ink-2)',
          }}
        >
          {copy.timelineAddHint}
        </button>
      </div>
    </div>
  );
}

function MetricRow({
  metric,
  records,
  currentRecordId,
  value,
  prefs,
  locale,
}: {
  metric: Metric;
  records: BloodRecord[];
  currentRecordId: string;
  value: number;
  prefs: BloodPrefs;
  locale: Locale;
}) {
  const ev = bcEvaluate(metric, value);
  const color = b32Color(ev.level);
  const unitId = bcUnitForRegion(metric.id, prefs.unitRegion);
  const unit = unitId ? BC_UNITS[metric.id].units.find((u) => u.id === unitId) : undefined;
  const displayed = unitId ? bcConvert(metric.id, value, metric.canonicalUnit, unitId) : value;
  const series = b32Series(records, metric.id);
  const trend = bcTrend(records, currentRecordId, metric.id);

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '36px 1fr auto auto',
        gap: 14,
        alignItems: 'center',
        width: '100%',
        padding: '14px 22px',
        borderTop: '1px solid var(--b32-divider)',
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 12,
          background: b32Tint(ev.level),
          border: `1.5px solid ${color}`,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 15,
          color,
          fontWeight: 700,
        }}
        aria-hidden="true"
      >
        {metric.icon ?? metric.labelZh.slice(0, 1)}
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--b32-ink)' }}>
          {metric.labelZh}
          <span style={{ marginLeft: 6, fontSize: 11, color: 'var(--b32-ink-3)', fontWeight: 500 }}>{metric.label}</span>
        </div>
        <div style={{ marginTop: 4 }}>
          <LevelChip level={ev.level} locale={locale} />
        </div>
      </div>
      <Sparkline points={series.slice(-6)} width={82} height={30} color={color} />
      <div style={{ textAlign: 'right', minWidth: 92 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, justifyContent: 'flex-end' }}>
          <span
            className="b32-tabnum"
            style={{
              fontFamily: 'var(--b32-font-num)',
              fontSize: 22,
              fontWeight: 800,
              color,
              letterSpacing: '-0.01em',
              lineHeight: 1,
            }}
          >
            {displayed != null ? bcFormat(displayed, unit?.decimals ?? 1) : '—'}
          </span>
          <span style={{ fontSize: 10, color: 'var(--b32-ink-3)', fontWeight: 600 }}>{unit?.label}</span>
        </div>
        {trend && (
          <div className="b32-tabnum" style={{ fontSize: 10, color: 'var(--b32-ink-3)', fontWeight: 600, marginTop: 2 }}>
            {trend.arrow} {Math.abs(trend.pct).toFixed(0)}%
          </div>
        )}
      </div>
    </div>
  );
}
