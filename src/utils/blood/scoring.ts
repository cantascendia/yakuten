/**
 * Game layer: score, grade, highlights, streak, series.
 * Ported from design_handoff_blood_checker/b32-data.jsx.
 */

import {
  BC_ALL_METRICS,
  BC_METRIC_BY_ID,
  BC_UNITS,
  bcConvert,
  bcEvaluate,
  bcFormat,
  bcUnitForRegion,
  type Level,
  type Metric,
  type Region,
} from './metrics';
import { bcTrend, type BloodRecord } from './storage';

export function b32Color(level: Level): string {
  switch (level) {
    case 'target': return 'var(--b32-target)';
    case 'safe':   return 'var(--b32-safe)';
    case 'caution':return 'var(--b32-caution)';
    case 'danger': return 'var(--b32-danger)';
    default:       return 'var(--b32-ink-4)';
  }
}

export function b32Tint(level: Level): string {
  switch (level) {
    case 'target': return 'var(--b32-target-tint)';
    case 'safe':   return 'var(--b32-safe-tint)';
    case 'caution':return 'var(--b32-caution-tint)';
    case 'danger': return 'var(--b32-danger-tint)';
    default:       return 'var(--b32-bg-2)';
  }
}

export function b32LevelLabelZh(level: Level): string {
  return ({ target: '达标', safe: '可接受', caution: '留意', danger: '需复查', empty: '未填' } as const)[level] ?? '—';
}

export function b32Score(record: BloodRecord | null | undefined): number | null {
  if (!record) return null;
  let total = 0;
  let sum = 0;
  for (const m of BC_ALL_METRICS) {
    const v = record.values[m.id];
    if (v == null) continue;
    const ev = bcEvaluate(m, v);
    total++;
    const points: Record<Level, number> = { target: 100, safe: 82, caution: 55, danger: 20, empty: 50 };
    sum += points[ev.level];
  }
  return total === 0 ? null : Math.round(sum / total);
}

export type Tone = 'hype' | 'warm' | 'calm' | 'neutral';

export interface Grade {
  grade: string;
  titleKey: string;
  subtitleKey: string;
  tone: Tone;
}

export function b32Grade(score: number | null): Grade {
  if (score == null) return { grade: '—', titleKey: 'grade.neutral.title', subtitleKey: 'grade.neutral.subtitle', tone: 'neutral' };
  if (score >= 90) return { grade: 'S',  titleKey: 'grade.s.title',   subtitleKey: 'grade.s.subtitle',   tone: 'hype' };
  if (score >= 82) return { grade: 'A+', titleKey: 'grade.aplus.title', subtitleKey: 'grade.aplus.subtitle', tone: 'hype' };
  if (score >= 75) return { grade: 'A',  titleKey: 'grade.a.title',   subtitleKey: 'grade.a.subtitle',   tone: 'warm' };
  if (score >= 68) return { grade: 'B+', titleKey: 'grade.bplus.title', subtitleKey: 'grade.bplus.subtitle', tone: 'warm' };
  if (score >= 55) return { grade: 'B',  titleKey: 'grade.b.title',   subtitleKey: 'grade.b.subtitle',   tone: 'warm' };
  if (score >= 40) return { grade: 'C',  titleKey: 'grade.c.title',   subtitleKey: 'grade.c.subtitle',   tone: 'calm' };
  return               { grade: 'D',  titleKey: 'grade.d.title',   subtitleKey: 'grade.d.subtitle',   tone: 'calm' };
}

export interface Buckets {
  target: number;
  safe: number;
  caution: number;
  danger: number;
  empty: number;
}

export function b32Buckets(record: BloodRecord | null | undefined): Buckets {
  const buckets: Buckets = { target: 0, safe: 0, caution: 0, danger: 0, empty: 0 };
  if (!record) return buckets;
  for (const m of BC_ALL_METRICS) {
    const v = record.values[m.id];
    if (v == null) {
      buckets.empty++;
      continue;
    }
    const ev = bcEvaluate(m, v);
    buckets[ev.level] = (buckets[ev.level] ?? 0) + 1;
  }
  return buckets;
}

export interface Streak {
  count: number;
  days: number;
  first: string | null;
  last: string | null;
}

export function b32Streak(records: BloodRecord[]): Streak {
  if (!records || records.length === 0) return { count: 0, days: 0, first: null, last: null };
  const sorted = [...records].sort((a, b) => a.date.localeCompare(b.date));
  const first = sorted[0].date;
  const last = sorted[sorted.length - 1].date;
  const days = Math.round((new Date(last).getTime() - new Date(first).getTime()) / 86400000);
  return { count: records.length, days, first, last };
}

export interface ImprovementItem {
  metric: Metric;
  pct?: number;
  absPct?: number;
  from?: number;
  to: number;
  fromLevel?: Level;
  toLevel: Level;
  direction?: 'up' | 'down';
  isNew?: boolean;
}

export interface MilestoneItem {
  metric: Metric;
  value: number;
  kind: 'first-target';
}

export interface WorryItem {
  metric: Metric;
  level: Level;
  value: number;
  labelKey: string;
}

export interface Highlights {
  improvements: ImprovementItem[];
  milestones: MilestoneItem[];
  worries: WorryItem[];
}

export function b32Highlights(records: BloodRecord[], currentId: string | null | undefined): Highlights {
  const empty: Highlights = { improvements: [], milestones: [], worries: [] };
  if (!records || records.length === 0 || !currentId) return empty;
  const sorted = [...records].sort((a, b) => a.date.localeCompare(b.date));
  const idx = sorted.findIndex((r) => r.id === currentId);
  if (idx < 0) return empty;
  const cur = sorted[idx];
  const prev = idx > 0 ? sorted[idx - 1] : null;

  const improvements: ImprovementItem[] = [];
  const milestones: MilestoneItem[] = [];
  const worries: WorryItem[] = [];

  const levelRank: Record<Level, number> = { danger: 0, caution: 1, safe: 2, target: 3, empty: -1 };

  for (const m of BC_ALL_METRICS) {
    const cv = cur?.values[m.id];
    if (cv == null) continue;
    const cEv = bcEvaluate(m, cv);

    if (cEv.level === 'danger') {
      worries.push({ metric: m, level: 'danger', value: cv, labelKey: 'worry.review' });
    } else if (cEv.level === 'caution') {
      worries.push({ metric: m, level: 'caution', value: cv, labelKey: 'worry.watch' });
    }

    if (prev) {
      const pv = prev.values[m.id];
      if (pv != null) {
        const pEv = bcEvaluate(m, pv);
        const levelUp = levelRank[cEv.level] > levelRank[pEv.level];
        const pct = pv !== 0 ? ((cv - pv) / Math.abs(pv)) * 100 : 0;
        const absPct = Math.abs(pct);

        const target = m.target ?? m.safe;
        let movedToward = false;
        if (target) {
          const [lo, hi] = target;
          const mid = (lo + hi) / 2;
          movedToward = Math.abs(cv - mid) < Math.abs(pv - mid);
        }
        if (levelUp || (movedToward && absPct > 8)) {
          improvements.push({
            metric: m,
            pct,
            absPct,
            from: pv,
            to: cv,
            fromLevel: pEv.level,
            toLevel: cEv.level,
            direction: pct > 0 ? 'up' : 'down',
          });
        }
      } else {
        improvements.push({ metric: m, isNew: true, to: cv, toLevel: cEv.level });
      }
    }

    const earlierHadTarget = sorted.slice(0, idx).some((r) => {
      const vv = r.values[m.id];
      return vv != null && bcEvaluate(m, vv).level === 'target';
    });
    if (cEv.level === 'target' && !earlierHadTarget) {
      milestones.push({ metric: m, value: cv, kind: 'first-target' });
    }
  }

  improvements.sort((a, b) => {
    const aLu = a.toLevel && a.fromLevel && a.toLevel !== a.fromLevel ? 1 : 0;
    const bLu = b.toLevel && b.fromLevel && b.toLevel !== b.fromLevel ? 1 : 0;
    if (aLu !== bLu) return bLu - aLu;
    return (b.absPct ?? 0) - (a.absPct ?? 0);
  });

  return { improvements, milestones, worries };
}

export interface SeriesPoint {
  date: string;
  value: number;
  recordId: string;
}

export function b32Series(records: BloodRecord[], metricId: string): SeriesPoint[] {
  return [...records]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((r) => ({ date: r.date, value: r.values[metricId], recordId: r.id }))
    .filter((p): p is SeriesPoint => p.value != null);
}

export interface FormattedValue {
  text: string;
  unit: string;
}

export function b32FormatValue(
  metricId: string,
  canonicalValue: number | null | undefined,
  region: Region
): FormattedValue {
  if (canonicalValue == null) return { text: '—', unit: '' };
  const m = BC_METRIC_BY_ID[metricId];
  if (!m) return { text: '—', unit: '' };
  const unitId = bcUnitForRegion(metricId, region);
  if (!unitId) return { text: '—', unit: '' };
  const unit = BC_UNITS[metricId].units.find((u) => u.id === unitId);
  const v = bcConvert(metricId, canonicalValue, m.canonicalUnit, unitId);
  const decimals = unit?.decimals ?? 1;
  return { text: bcFormat(v, decimals), unit: unit?.label ?? '' };
}

export interface TopMetricEntry {
  metric: Metric;
  value: number;
  level: Level;
  series: SeriesPoint[];
  trend: ReturnType<typeof bcTrend>;
  isCore: boolean;
}

export function b32TopMetrics(
  record: BloodRecord | null | undefined,
  records: BloodRecord[],
  n = 4
): TopMetricEntry[] {
  if (!record) return [];
  const filled = BC_ALL_METRICS.filter((m) => record.values[m.id] != null);
  const rank: Record<Level, number> = { danger: 0, caution: 1, safe: 2, target: 3, empty: 4 };
  const withEval = filled.map<TopMetricEntry>((m) => {
    const v = record.values[m.id];
    const ev = bcEvaluate(m, v);
    return {
      metric: m,
      value: v,
      level: ev.level,
      series: b32Series(records, m.id),
      trend: bcTrend(records, record.id, m.id),
      isCore: m.group === 'core',
    };
  });
  withEval.sort((a, b) => {
    if (a.isCore !== b.isCore) return a.isCore ? -1 : 1;
    return rank[a.level] - rank[b.level];
  });
  return withEval.slice(0, n);
}
