#!/usr/bin/env node
/**
 * Fetch Google Trends "Interest over Time" (0-100 relative index) for the
 * core keyword set, written to docs/data/trends-YYYY-MM-DD.json.
 *
 * No auth required — uses the public google-trends-api wrapper.
 *
 * Keyword list: docs/data/trends-keywords.json (edit freely).
 * Geo/region:   CN by default (override with TRENDS_GEO env).
 * Time range:   past 12 months.
 *
 * Output per keyword:
 *   avg:    mean 0-100 score
 *   peak:   max single-week score
 *   recent: mean of last 4 weeks
 *   tier:   H / M / L  — derived from avg (config-tunable thresholds below)
 *   slope:  +/-/flat — recent-4wk vs prior-4wk
 *
 * Usage:
 *   npm run seo:trends
 */
import fs from 'node:fs';
import path from 'node:path';
import googleTrends from 'google-trends-api';

const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, 'docs', 'data');
const KEYWORDS_FILE = path.join(DATA_DIR, 'trends-keywords.json');
const GEO = process.env.TRENDS_GEO || 'CN';
const HL = process.env.TRENDS_HL || 'zh-CN';

// Tier cutoffs on average 0-100 interest. Tune here as traffic changes.
const TIER_H = 40;
const TIER_M = 10;

// Seed keyword list if none exists yet.
const DEFAULT_KEYWORDS = [
  { term: '色普龙', category: 'drug-brand', target: '/zh/medications/antiandrogens/cpa/' },
  { term: '螺内酯', category: 'drug-generic', target: '/zh/medications/antiandrogens/spironolactone/' },
  { term: '补佳乐', category: 'drug-brand', target: '/zh/medications/estrogens/oral/' },
  { term: '戊酸雌二醇', category: 'drug-generic', target: '/zh/medications/estrogens/injection/' },
  { term: '跨性别激素', category: 'protocol', target: '/zh/before-you-start/' },
  { term: '醋酸环丙孕酮', category: 'drug-chemical', target: '/zh/medications/antiandrogens/cpa/' },
  { term: '爱斯妥', category: 'drug-brand', target: '/zh/medications/estrogens/gel/' },
  { term: '安体舒通', category: 'drug-brand', target: '/zh/medications/antiandrogens/spironolactone/' },
  { term: 'MTF HRT', category: 'protocol', target: '/zh/before-you-start/' },
  { term: 'DIY HRT', category: 'protocol', target: '/zh/china-reality/' },
];

fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(KEYWORDS_FILE)) {
  fs.writeFileSync(KEYWORDS_FILE, JSON.stringify(DEFAULT_KEYWORDS, null, 2));
  console.log(`✓ Seeded ${KEYWORDS_FILE} with ${DEFAULT_KEYWORDS.length} keywords`);
}

const keywords = JSON.parse(fs.readFileSync(KEYWORDS_FILE, 'utf8'));
if (!Array.isArray(keywords) || keywords.length === 0) {
  console.error(`Edit ${KEYWORDS_FILE} to add terms, then retry.`);
  process.exit(1);
}

const endTime = new Date();
const startTime = new Date(endTime.getTime() - 365 * 24 * 3600 * 1000);

function tierFromAvg(avg) {
  if (avg >= TIER_H) return 'H';
  if (avg >= TIER_M) return 'M';
  return 'L';
}

function avg(arr) {
  if (!arr.length) return 0;
  return arr.reduce((s, x) => s + x, 0) / arr.length;
}

const results = [];
for (const kw of keywords) {
  const term = kw.term;
  try {
    console.log(`  trends: ${term} …`);
    const raw = await googleTrends.interestOverTime({
      keyword: term,
      startTime,
      endTime,
      geo: GEO,
      hl: HL,
    });
    // The lib occasionally returns an HTML error page; guard.
    if (!raw || !raw.trim().startsWith('{')) {
      throw new Error('non-JSON response (possibly rate-limited; retry later)');
    }
    const parsed = JSON.parse(raw);
    const series = parsed?.default?.timelineData ?? [];
    const values = series.map((p) => Number(p.value?.[0] ?? 0));
    if (values.length === 0) {
      results.push({ ...kw, avg: 0, peak: 0, recent: 0, tier: 'L', slope: 'flat', points: 0, error: 'no data' });
      continue;
    }
    const a = avg(values);
    const peak = Math.max(...values);
    const recent = avg(values.slice(-4));
    const prev4 = avg(values.slice(-8, -4));
    const delta = recent - prev4;
    const slope = delta > 5 ? '+' : delta < -5 ? '-' : 'flat';
    results.push({
      ...kw,
      avg: Math.round(a * 10) / 10,
      peak,
      recent: Math.round(recent * 10) / 10,
      tier: tierFromAvg(a),
      slope,
      points: values.length,
    });
    // light rate-limit courtesy
    await new Promise((r) => setTimeout(r, 800));
  } catch (e) {
    console.warn(`  ! ${term}: ${e.message}`);
    results.push({ ...kw, avg: null, peak: null, recent: null, tier: null, slope: null, error: e.message });
  }
}

const stamp = endTime.toISOString().slice(0, 10);
const outPath = path.join(DATA_DIR, `trends-${stamp}.json`);
const latestPath = path.join(DATA_DIR, 'trends-latest.json');

const payload = {
  fetchedAt: endTime.toISOString(),
  geo: GEO,
  hl: HL,
  rangeStart: startTime.toISOString().slice(0, 10),
  rangeEnd: stamp,
  tierThresholds: { H: TIER_H, M: TIER_M },
  results,
};

fs.writeFileSync(outPath, JSON.stringify(payload, null, 2));
fs.writeFileSync(latestPath, JSON.stringify(payload, null, 2));

const ok = results.filter((r) => r.avg != null).length;
console.log(`\n✓ ${ok}/${results.length} keywords → ${outPath}`);
console.log(`✓ Alias: ${latestPath}`);
console.log(`\nSummary (avg 0-100, H≥${TIER_H}, M≥${TIER_M}):`);
for (const r of results.sort((a, b) => (b.avg ?? -1) - (a.avg ?? -1))) {
  const dot = r.slope === '+' ? '↑' : r.slope === '-' ? '↓' : '—';
  console.log(`  ${(r.tier ?? '?').padEnd(2)} ${String(r.avg ?? 'ERR').padStart(5)}  ${dot}  ${r.term}`);
}
