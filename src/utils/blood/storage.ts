/**
 * localStorage-based persistence for blood-checker records.
 * All data stays in the user's browser — never transmitted.
 * See CLAUDE.md: localStorage is allowed for the blood tracker specifically,
 * because the alternative (losing records on reload) defeats the tool's purpose
 * and no server-side storage is introduced.
 */

import type { Region } from './metrics';

export const BC_STORAGE_KEY = 'yakuten_blood_records_v2';
export const BC_PREFS_KEY = 'yakuten_blood_prefs_v2';
export const BC_SEED_FLAG_KEY = 'yakuten_blood_seeded_v1';

export interface BloodRecord {
  id: string;
  date: string; // 'YYYY-MM-DD'
  phase?: string;
  note?: string;
  values: Record<string, number>;
}

export interface BloodPrefs {
  unitRegion: Region;
}

const DEFAULT_PREFS: BloodPrefs = { unitRegion: 'CN' };

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function bcLoadRecords(): BloodRecord[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(BC_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as BloodRecord[]) : [];
  } catch {
    return [];
  }
}

export function bcSaveRecords(records: BloodRecord[]): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(BC_STORAGE_KEY, JSON.stringify(records));
  } catch {
    // quota exceeded or storage blocked — silently drop
  }
}

export function bcLoadPrefs(): BloodPrefs {
  if (!isBrowser()) return { ...DEFAULT_PREFS };
  try {
    const raw = window.localStorage.getItem(BC_PREFS_KEY);
    return raw ? { ...DEFAULT_PREFS, ...(JSON.parse(raw) as Partial<BloodPrefs>) } : { ...DEFAULT_PREFS };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export function bcSavePrefs(prefs: BloodPrefs): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(BC_PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // ignore
  }
}

export function bcClearAll(): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(BC_STORAGE_KEY);
    window.localStorage.removeItem(BC_PREFS_KEY);
    window.localStorage.removeItem(BC_SEED_FLAG_KEY);
  } catch {
    // ignore
  }
}

export function bcSeedIfEmpty(): BloodRecord[] {
  const existing = bcLoadRecords();
  if (existing.length > 0) return existing;
  if (isBrowser() && window.localStorage.getItem(BC_SEED_FLAG_KEY) === '1') return existing;
  const seed: BloodRecord[] = [
    {
      id: 'rec-seed-1',
      date: '2025-09-12',
      phase: '初始基线',
      note: '刚开始 HRT 前的基线',
      values: { e2: 110, t: 18.5, prl: 12, alt: 28, k: 4.2, hb: 152 },
    },
    {
      id: 'rec-seed-2',
      date: '2025-12-18',
      phase: '3 个月随访',
      note: '戊酸雌二醇注射 5mg/周 + 螺内酯 100mg',
      values: { e2: 520, t: 0.8, prl: 22, alt: 34, k: 4.8, hb: 142, ddimer: 0.28 },
    },
    {
      id: 'rec-seed-3',
      date: '2026-03-22',
      phase: '6 个月随访',
      note: '情绪稳定，皮肤变化明显',
      values: {
        e2: 680, t: 0.4, prl: 28, alt: 42, k: 5.1, hb: 134, ddimer: 0.35,
        shbg: 88, fsh: 4.2, lh: 3.1,
      },
    },
  ];
  bcSaveRecords(seed);
  if (isBrowser()) {
    try { window.localStorage.setItem(BC_SEED_FLAG_KEY, '1'); } catch {}
  }
  return seed;
}

export interface TrendInfo {
  delta: number;
  pct: number;
  arrow: '↑' | '↓' | '→';
}

export function bcTrend(
  records: BloodRecord[],
  currentId: string,
  metricId: string
): TrendInfo | null {
  const sorted = [...records].sort((a, b) => a.date.localeCompare(b.date));
  const idx = sorted.findIndex((r) => r.id === currentId);
  if (idx < 1) return null;
  const cur = sorted[idx].values[metricId];
  const prev = sorted[idx - 1].values[metricId];
  if (cur == null || prev == null) return null;
  const delta = cur - prev;
  const pct = prev !== 0 ? (delta / prev) * 100 : 0;
  return { delta, pct, arrow: delta > 0 ? '↑' : delta < 0 ? '↓' : '→' };
}

export async function bcImportJSON(file: File): Promise<BloodRecord[]> {
  const text = await file.text();
  const data = JSON.parse(text) as { records?: unknown };
  if (!data.records || !Array.isArray(data.records)) {
    throw new Error('Invalid import file: missing records array');
  }
  const records = data.records as BloodRecord[];
  bcSaveRecords(records);
  return records;
}

export function bcExportJSON(): void {
  if (!isBrowser()) return;
  const data = {
    app: 'HRT药典 · blood-checker',
    version: 2,
    exportedAt: new Date().toISOString(),
    records: bcLoadRecords(),
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `yakuten-blood-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
