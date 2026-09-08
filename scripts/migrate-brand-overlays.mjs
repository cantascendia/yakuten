#!/usr/bin/env node
/**
 * migrate-brand-overlays.mjs — 一次性迁移工具（不进 build / check 链）
 *
 * 把旧的 src/data/drug-brands.json + 各语 overlay（drug-brands.<lang>.json）
 * 里的译文，迁到新的 src/data/brand-library.json 条目上。
 * SPEC: docs/specs/brand-library-v2.md §4
 *
 * 旧结构：drug-brands.json = { [drugId]: BrandEntry[] }，
 *         overlay 按 (drugId, 数组下标) 与 base 对齐。
 *
 * 匹配规则（与 base 条目对齐后，再去新数据里找对应 brand）：
 *   同 drugId
 *   且 旧 name 去掉中日文字符后 **包含** 新 name.intl（不区分大小写）
 *   且 旧 country === 新 market.country
 *   命中唯一 → matched；命中多个 → ambiguous（不写入）；命中 0 个 → unmatched
 *
 * 写入（仅 --apply 且仅 ja，只填空字段，绝不覆盖已有值）：
 *   name.ja                      ← overlay.name
 *   manufacturer.name.ja         ← overlay.manufacturer
 *   market.countryName.ja        ← overlay.countryName
 *   appearance.description.ja    ← overlay.appearance
 *   notes.ja                     ← overlay.notes
 *
 * de / es / fr / pt / ru 只出匹配报告，不写入
 * （types.ts 的 L10n 只有 zh/en/ja/ko，没有这些语言）。
 *
 * 用法：
 *   node scripts/migrate-brand-overlays.mjs             # dry-run，报告到 stdout
 *   node scripts/migrate-brand-overlays.mjs --verbose   # 额外列出每条匹配
 *   node scripts/migrate-brand-overlays.mjs --apply     # 把 ja 译文写回 brand-library.json
 *   node scripts/migrate-brand-overlays.mjs --apply --out tmp.json   # 写到别处（不动 SSOT）
 *
 * ⚠ --apply 会用 JSON.stringify(data, null, 2) 重写整个文件，
 *   现有的手写紧凑排版会被规范化。跑完请 review diff。
 */

import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const rootDir = process.cwd();
const dataDir = path.join(rootDir, 'src', 'data');

const argv = process.argv.slice(2);
const APPLY = argv.includes('--apply');
const VERBOSE = argv.includes('--verbose');
const outIdx = argv.indexOf('--out');
const OUT_PATH = outIdx >= 0 && argv[outIdx + 1]
  ? path.resolve(rootDir, argv[outIdx + 1])
  : path.join(dataDir, 'brand-library.json');

/** 可写入的语言（types.ts L10n 只有 zh/en/ja/ko；旧 overlay 里只有 ja 命中） */
const WRITABLE_LANGS = new Set(['ja']);
/** 只出报告、不写入的语言 */
const REPORT_ONLY_LANGS = ['de', 'es', 'fr', 'pt', 'ru'];
const ALL_LANGS = ['ja', ...REPORT_ONLY_LANGS];

// ── helpers ───────────────────────────────────────────────────────────

/** 去掉中日文字符（汉字 / 假名 / 全角标点），只留拉丁部分 */
function stripCjk(s) {
  return String(s ?? '')
    .replace(/[　-〿぀-ヿ㐀-䶿一-鿿豈-﫿＀-￯]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isNonEmptyString(v) {
  return typeof v === 'string' && v.trim().length > 0;
}

async function loadJson(p, { optional = false } = {}) {
  if (!existsSync(p)) {
    if (optional) return null;
    console.error(`找不到文件: ${path.relative(rootDir, p)}`);
    process.exit(1);
  }
  return JSON.parse(await readFile(p, 'utf8'));
}

// ── 载入 ──────────────────────────────────────────────────────────────

const base = await loadJson(path.join(dataDir, 'drug-brands.json'));
const library = await loadJson(path.join(dataDir, 'brand-library.json'));

const overlays = {};
for (const lang of ALL_LANGS) {
  overlays[lang] = await loadJson(path.join(dataDir, `drug-brands.${lang}.json`), { optional: true });
}

const newBrands = Array.isArray(library.brands) ? library.brands : [];
const baseTotal = Object.values(base).reduce((n, arr) => n + (Array.isArray(arr) ? arr.length : 0), 0);

// ── 匹配 ──────────────────────────────────────────────────────────────

/**
 * 给一条旧 base 条目找新数据里的 brand。
 * @returns {{ status: 'matched'|'ambiguous'|'unmatched', candidates: object[], via?: 'intl'|'display' }}
 */
function matchBrand(drugId, oldEntry) {
  const strippedOld = stripCjk(oldEntry?.name).toLowerCase();
  const oldCountry = String(oldEntry?.country ?? '').toUpperCase();
  if (!strippedOld || !oldCountry) return { status: 'unmatched', candidates: [] };

  const sameDrugAndCountry = newBrands.filter(
    (b) => b?.drugId === drugId && String(b?.market?.country ?? '').toUpperCase() === oldCountry
  );

  // 主规则：旧 name（去中日文）包含 新 name.intl
  const byIntl = sameDrugAndCountry.filter((b) => {
    const intl = b?.name?.intl;
    return isNonEmptyString(intl) && strippedOld.includes(intl.trim().toLowerCase());
  });
  if (byIntl.length === 1) return { status: 'matched', candidates: byIntl, via: 'intl' };
  if (byIntl.length > 1) return { status: 'ambiguous', candidates: byIntl, via: 'intl' };

  // 次规则（新条目没写 name.intl 时的兜底，报告里显式标出）：
  // 旧 name（去中日文）包含 新 name.display（去中日文）
  const byDisplay = sameDrugAndCountry.filter((b) => {
    if (isNonEmptyString(b?.name?.intl)) return false; // 有 intl 的走主规则，不重复兜底
    const disp = stripCjk(b?.name?.display).toLowerCase();
    return disp.length > 0 && strippedOld.includes(disp);
  });
  if (byDisplay.length === 1) return { status: 'matched', candidates: byDisplay, via: 'display' };
  if (byDisplay.length > 1) return { status: 'ambiguous', candidates: byDisplay, via: 'display' };

  return { status: 'unmatched', candidates: [] };
}

// ── 报告 ──────────────────────────────────────────────────────────────

const lines = [];
const out = (s = '') => lines.push(s);

out('药物图鉴 v2 — 旧 overlay 迁移报告' + (APPLY ? '（--apply）' : '（dry-run）'));
out('='.repeat(72));
out(`旧数据  src/data/drug-brands.json          ${baseTotal} 条 / ${Object.keys(base).length} 个 drugId`);
out(`新数据  src/data/brand-library.json        ${newBrands.length} 个品牌 / ${(library.ingredients ?? []).length} 个成分`);
out('');

/** lang -> { pairs: [...], stats } */
const perLang = {};

for (const lang of ALL_LANGS) {
  const overlay = overlays[lang];
  const writable = WRITABLE_LANGS.has(lang);
  out('─'.repeat(72));
  out(`【${lang}】drug-brands.${lang}.json` + (writable ? '  （可写入 L10n.ja）' : '  （只报告，types.ts L10n 无此语言）'));

  if (!overlay) {
    out('  文件不存在，跳过。');
    out('');
    continue;
  }

  // 索引对齐检查：overlay 与 base 必须同 drugId 同长度，否则 (drugId, index) 对齐不成立
  const alignedDrugIds = [];
  const unalignedDrugIds = [];
  for (const drugId of Object.keys(overlay)) {
    const baseArr = base[drugId];
    if (!Array.isArray(baseArr) || baseArr.length !== overlay[drugId].length) {
      unalignedDrugIds.push(
        `${drugId}(base=${Array.isArray(baseArr) ? baseArr.length : '缺'}, overlay=${overlay[drugId].length})`
      );
    } else {
      alignedDrugIds.push(drugId);
    }
  }
  out(`  索引对齐: ${alignedDrugIds.length}/${Object.keys(overlay).length} 个 drugId 与 base 长度一致`);
  if (unalignedDrugIds.length > 0) {
    out(`  ⚠ 无法按 (drugId, index) 对齐，跳过: ${unalignedDrugIds.join(' | ')}`);
  }

  const pairs = [];
  let matched = 0;
  let ambiguous = 0;
  let unmatched = 0;
  const unmatchedLines = [];
  const ambiguousLines = [];

  for (const drugId of alignedDrugIds) {
    overlay[drugId].forEach((tr, i) => {
      const oldEntry = base[drugId][i];
      const res = matchBrand(drugId, oldEntry);
      const label = `${drugId}#${i} "${oldEntry?.name ?? ''}" (${oldEntry?.country ?? '??'})`;
      if (res.status === 'matched') {
        matched += 1;
        pairs.push({ drugId, index: i, oldEntry, tr, brand: res.candidates[0], via: res.via });
        if (VERBOSE) out(`  [matched:${res.via}] ${label} -> ${res.candidates[0].id}`);
      } else if (res.status === 'ambiguous') {
        ambiguous += 1;
        ambiguousLines.push(`  [ambiguous] ${label} -> ${res.candidates.map((c) => c.id).join(', ')}`);
      } else {
        unmatched += 1;
        unmatchedLines.push(`  [unmatched] ${label}`);
      }
    });
  }

  out(`  匹配: ${matched}   歧义: ${ambiguous}   未匹配: ${unmatched}`);
  for (const l of ambiguousLines) out(l);
  if (unmatched > 0) {
    out(`  未匹配明细（新数据里还没有对应条目，或 name.intl / country 对不上）:`);
    for (const l of unmatchedLines) out(l);
  }

  perLang[lang] = { pairs, matched, ambiguous, unmatched };
  out('');
}

// ── 写入计划（ja） ────────────────────────────────────────────────────

/** 迁移字段映射：overlay 字段 -> 新数据路径 */
const FIELD_PLAN = [
  { from: 'name', label: 'name.ja', get: (b) => b.name, key: 'ja', needsZhBase: false },
  { from: 'manufacturer', label: 'manufacturer.name.ja', get: (b) => b.manufacturer?.name, key: 'ja', needsZhBase: true },
  { from: 'countryName', label: 'market.countryName.ja', get: (b) => b.market?.countryName, key: 'ja', needsZhBase: true },
  { from: 'appearance', label: 'appearance.description.ja', get: (b) => b.appearance?.description, key: 'ja', needsZhBase: true },
  { from: 'notes', label: 'notes.ja', get: (b) => b.notes, key: 'ja', needsZhBase: true },
];

const plan = [];   // { brandId, label, value }
const skipped = []; // { brandId, label, reason }

for (const { tr, brand } of perLang.ja?.pairs ?? []) {
  for (const f of FIELD_PLAN) {
    const value = tr?.[f.from];
    if (!isNonEmptyString(value)) continue;
    const target = f.get(brand);
    if (target === undefined || target === null) {
      // 目标 L10n 对象不存在：不能凭空造一个没有 zh 的 L10n（校验脚本要求 zh 必填）
      skipped.push({ brandId: brand.id, label: f.label, reason: '新条目缺少该字段（不新建无 zh 的 L10n）' });
      continue;
    }
    if (typeof target !== 'object') {
      skipped.push({ brandId: brand.id, label: f.label, reason: '目标字段不是对象' });
      continue;
    }
    if (isNonEmptyString(target[f.key])) {
      skipped.push({ brandId: brand.id, label: f.label, reason: '已有值（不覆盖）' });
      continue;
    }
    plan.push({ brandId: brand.id, label: f.label, value, target, key: f.key });
  }
}

out('─'.repeat(72));
out(`【写入计划】ja → brand-library.json  待填 ${plan.length} 个字段，跳过 ${skipped.length} 个`);
const byBrand = new Map();
for (const p of plan) {
  if (!byBrand.has(p.brandId)) byBrand.set(p.brandId, []);
  byBrand.get(p.brandId).push(`${p.label}="${p.value}"`);
}
for (const [brandId, fields] of byBrand) {
  out(`  ${brandId}:`);
  for (const f of fields) out(`    + ${f}`);
}
if (skipped.length > 0 && VERBOSE) {
  out('  跳过明细:');
  for (const s of skipped) out(`    - ${s.brandId} ${s.label} — ${s.reason}`);
} else if (skipped.length > 0) {
  const reasons = new Map();
  for (const s of skipped) reasons.set(s.reason, (reasons.get(s.reason) ?? 0) + 1);
  out(`  跳过原因: ${[...reasons].map(([r, n]) => `${r} ×${n}`).join(' · ')}（--verbose 看明细）`);
}
out('');

// ── 执行 ──────────────────────────────────────────────────────────────

if (APPLY) {
  for (const p of plan) p.target[p.key] = p.value;
  await writeFile(OUT_PATH, `${JSON.stringify(library, null, 2)}\n`, 'utf8');
  out(`已写入 ${plan.length} 个字段 → ${path.relative(rootDir, OUT_PATH)}`);
  out('⚠ 文件已按 JSON.stringify(…, 2) 重新排版，请 review diff；');
  out('  随后跑 `node scripts/validate-brand-library.mjs` 复核。');
} else {
  out('dry-run 结束，未修改任何文件。加 --apply 才会写入。');
}
out('');
out('后续可删（迁移完成且确认无消费者后）:');
out('  src/data/drug-brands.json · drug-brands.{ja,de,es,fr,pt,ru}.json');

console.log(lines.join('\n'));
