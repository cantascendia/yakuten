#!/usr/bin/env node
/**
 * AI-powered SEO / AEO strategic analysis.
 *
 * Reads the locally-pulled SEO signals (GSC performance CSV + Google Trends +
 * the hand-curated keyword-gap strategy + the live page inventory) and asks
 * Gemini to produce a prioritized, grounded action report — the "拥抱 AI 自动分析"
 * layer on top of the mechanical `seo:refresh` snapshot.
 *
 * Auth:  GOOGLE_GENERATIVE_AI_API_KEY  (same key as api/ai-chat.ts; read from
 *        the environment, or auto-loaded from .env.local for local runs).
 * Model: SEO_AI_MODEL env, default `gemini-3.5-flash`, with automatic fallback
 *        down MODEL_CANDIDATES when a model is overloaded (503) / retired (404) /
 *        quota-blocked (429) — so a single bad model never strands the pipeline.
 *
 * Inputs (uses whatever exists — at least one of GSC / Trends is required):
 *   docs/data/gsc-latest.csv       ← npm run seo:gsc   (real search queries)
 *   docs/data/trends-latest.json   ← npm run seo:trends
 *   docs/seo-keyword-gap.md        ← strategy context (truncated)
 *   public/llms.txt                ← page inventory context (truncated)
 *
 * Output:
 *   docs/data/ai-seo-report-YYYY-MM-DD.md  +  ai-seo-report-latest.md
 *   (gitignored — derived from GSC, may contain real search queries)
 *
 * Privacy: GSC query rows are AGGREGATE search terms for the site's own pages —
 *   not user health records, AI-chat content, or any PII. They are sent to
 *   Gemini purely for SEO analysis. This stays within the project's privacy line
 *   (no user health data leaves the device); it is developer tooling on the
 *   site's own Search Console metrics.
 *
 * Usage:
 *   npm run seo:ai
 *   npm run seo:ai -- --dry-run      # build the prompt + write a stub, no API call
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, 'docs', 'data');
const GSC_CSV = path.join(DATA_DIR, 'gsc-latest.csv');
const TRENDS_JSON = path.join(DATA_DIR, 'trends-latest.json');
const GAP_FILE = path.join(ROOT, 'docs', 'seo-keyword-gap.md');
const LLMS_FILE = path.join(ROOT, 'public', 'llms.txt');

const DRY_RUN = process.argv.includes('--dry-run');
// Explicit SEO_AI_MODEL pins a single model (no fallback). Otherwise walk the
// candidate list: newest stable first, then older still-alive fallbacks.
const MODEL_CANDIDATES = process.env.SEO_AI_MODEL
  ? [process.env.SEO_AI_MODEL]
  : ['gemini-3.5-flash', 'gemini-3-flash-preview'];
let MODEL = MODEL_CANDIDATES[0];

/* ── Minimal .env.local loader (no dependency) ──────────────────────────────
   The chat endpoint runs on Vercel where env vars are injected. A local node
   run needs the key from .env.local. Only fills vars that aren't already set. */
function loadDotEnvLocal() {
  const envPath = path.join(ROOT, '.env.local');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (!m) continue;
    const key = m[1];
    if (process.env[key]) continue;
    let val = m[2].trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  }
}
loadDotEnvLocal();

/* ── CSV parse (matches refresh-keyword-gap.mjs semantics) ─────────────────── */
function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  const header = lines[0].split(',');
  return lines.slice(1).map((ln) => {
    const cols = [];
    let cur = '';
    let inQ = false;
    for (const c of ln) {
      if (inQ) {
        if (c === '"') inQ = false;
        else cur += c;
      } else if (c === '"') inQ = true;
      else if (c === ',') { cols.push(cur); cur = ''; }
      else cur += c;
    }
    cols.push(cur);
    const row = {};
    header.forEach((h, i) => (row[h] = cols[i]));
    return row;
  });
}

function toISODate(d) {
  return d.toISOString().slice(0, 10);
}

/* ── Gather inputs ──────────────────────────────────────────────────────── */
let gsc = [];
if (fs.existsSync(GSC_CSV)) {
  gsc = parseCsv(fs.readFileSync(GSC_CSV, 'utf8'));
  console.log(`✓ GSC: ${gsc.length} queries`);
} else {
  console.log(`- GSC missing — run \`npm run seo:gsc\` first (needs .gsc-credentials.json; see docs/seo-setup.md)`);
}

let trends = null;
if (fs.existsSync(TRENDS_JSON)) {
  trends = JSON.parse(fs.readFileSync(TRENDS_JSON, 'utf8'));
  console.log(`✓ Trends: ${trends.results?.length ?? 0} keywords`);
} else {
  console.log(`- Trends missing — run \`npm run seo:trends\` first`);
}

if (!gsc.length && !trends) {
  console.error('\n❌ No SEO data found. Run `npm run seo:trends` and/or `npm run seo:gsc` first.\n');
  process.exit(1);
}

// Strategy + inventory context (truncated to keep tokens bounded)
const strategy = fs.existsSync(GAP_FILE)
  ? fs.readFileSync(GAP_FILE, 'utf8').split('<!-- AUTO-SNAPSHOT:BEGIN -->')[0].slice(0, 9000)
  : '(no keyword-gap strategy file)';
const inventory = fs.existsSync(LLMS_FILE)
  ? fs.readFileSync(LLMS_FILE, 'utf8').slice(0, 6000)
  : '(no llms.txt inventory)';

/* ── Shape the data blocks for the prompt ─────────────────────────────────── */
// GSC: full top-by-impressions list (cap 120), plus a pre-computed striking-distance slice.
const gscSorted = [...gsc].sort((a, b) => Number(b.impressions || 0) - Number(a.impressions || 0));
const gscTop = gscSorted.slice(0, 120);
const striking = gsc
  .filter((r) => {
    const p = Number(r.position || 0);
    const imp = Number(r.impressions || 0);
    return p >= 8 && p <= 30 && imp >= 15;
  })
  .sort((a, b) => Number(b.impressions || 0) - Number(a.impressions || 0))
  .slice(0, 40);

function gscBlock(rows) {
  if (!rows.length) return '(none)';
  return ['query | impressions | clicks | ctr% | avg_pos | top_page']
    .concat(rows.map((r) => `${r.query} | ${r.impressions} | ${r.clicks} | ${r.ctr} | ${r.position} | ${(r.top_page || '').replace(/^https?:\/\/[^/]+/, '') || '—'}`))
    .join('\n');
}

const trendsBlock = trends
  ? [`geo=${trends.geo} range ${trends.rangeStart}→${trends.rangeEnd} (0-100 relative)`, 'term | avg | peak | recent4w | slope | tier | target']
      .concat(
        [...(trends.results || [])]
          .sort((a, b) => (b.avg ?? -1) - (a.avg ?? -1))
          .map((r) => `${r.term} | ${r.avg ?? '—'} | ${r.peak ?? '—'} | ${r.recent ?? '—'} | ${r.slope ?? '—'} | ${r.tier ?? '?'} | ${r.target ?? ''}`),
      )
      .join('\n')
  : '(no trends data)';

/* ── Prompt ───────────────────────────────────────────────────────────────── */
const SYSTEM = `你是 HRT药典（hrtyaku.com）的 SEO/AEO 策略分析师。这是一个面向中文圈跨性别女性的循证 HRT 安全信息站，主力受众在中国大陆。

硬性约束（分析与建议都不得违反）：
- 每条医学声明必须有 DOI 引用 + 证据等级；不编造数字或文献。
- 绝不建议个人化剂量（"你应该吃 Xmg"）、不推荐购药渠道、不削弱急症警告。
- 隐私优先：不把任何用户健康数据/对话/血检记录用于分析。
- 大陆现实：Google 在大陆被墙，GSC 点击主要来自海外/翻墙/Google 答案引擎；大陆主力靠 Bing/百度/搜狗 + 站内。

你的产出必须：只基于下方提供的真实数据，不臆造不存在的查询词或排名；用简体中文；具体到页面 URL；区分"立即可做的机械改写"和"需要新写内容"。`;

const PROMPT = `# 任务
基于以下真实 SEO 数据，产出一份**可执行的 SEO/AEO 行动报告**。

## 数据 1 — Google Search Console（按 impressions 排序，top ${gscTop.length}）
${gscBlock(gscTop)}

## 数据 2 — Striking distance（排名 8-30 且 ≥15 次曝光的快赢词）
${gscBlock(striking)}

## 数据 3 — Google Trends（核心词热度）
${trendsBlock}

## 上下文 A — 现有关键词策略（人工维护，节选）
${strategy}

## 上下文 B — 站点页面清单（llms.txt 节选）
${inventory}

# 输出结构（用 Markdown，简体中文）
## 1. Striking-distance 快赢（最高优先）
对数据 2 里每个词：判断它落在哪个现有页面、为什么卡在第 8-30 名、给出**一句话可执行的改写动作**（标题/description/h2/内链）。只用真实出现的词。

## 2. 内容缺口
找出"有搜索需求但站内无对应页或覆盖弱"的查询 → 建议新博客/新 h2，给标题 + 目标路径 + 一句理由。

## 3. AEO（被 AI 答案引擎引用）改进
基于 llms.txt 与 GSC 数据，给出 3-6 条让 ChatGPT/Bing Copilot/Gemini/Perplexity 更易引用本站的具体改动。

## 4. 本轮 Top 5 优先级
跨以上所有维度，给出本月最该做的 5 件事，每条注明预期影响 + 工作量（机械/写作）。

报告开头写一行数据概览（覆盖天数、查询总数、总曝光/点击）。结尾不加免责声明（这是内部运营报告，不是面向用户的医疗内容）。`;

const promptBytes = Buffer.byteLength(SYSTEM + PROMPT, 'utf8');
console.log(`→ model=${MODEL}  prompt≈${(promptBytes / 1024).toFixed(1)}KB  gsc=${gsc.length} striking=${striking.length} trends=${trends?.results?.length ?? 0}`);

/* ── Generate (or dry-run) ────────────────────────────────────────────────── */
let report;
if (DRY_RUN) {
  console.log('• --dry-run: skipping Gemini call');
  report = `# AI SEO 报告（DRY RUN — 未调用 Gemini）\n\n生成于 ${new Date().toISOString()}\n\n模型: ${MODEL}\nprompt 大小: ${(promptBytes / 1024).toFixed(1)}KB\nGSC 查询: ${gsc.length}（striking ${striking.length}）\nTrends: ${trends?.results?.length ?? 0}\n\n> 这是 dry-run 占位。去掉 --dry-run 即调用 Gemini 生成真实报告。\n`;
} else {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    console.error('\n❌ GOOGLE_GENERATIVE_AI_API_KEY 未设置（.env.local 或环境变量）。无法调用 Gemini。\n   仅想验证数据管道可用 `npm run seo:ai -- --dry-run`。\n');
    process.exit(1);
  }
  const { createGoogleGenerativeAI } = await import('@ai-sdk/google');
  const { generateText } = await import('ai');
  const google = createGoogleGenerativeAI();
  // Walk the candidate list, but ONLY fall through on model-availability errors:
  // retired (404), quota-blocked (429), overloaded/server (5xx). Auth/param
  // errors (400/401/403) are NOT the model's fault — re-throw immediately so CI
  // surfaces the real cause instead of masking it behind "all models failed".
  // (2026-07-10: gemini-3-flash-preview 503'd all day →降级链存在的理由。)
  const isDegradable = (err) => {
    const s = Number(err?.statusCode ?? err?.status ?? err?.response?.status);
    return s === 404 || s === 429 || (s >= 500 && s <= 599);
  };
  let lastErr;
  for (const candidate of MODEL_CANDIDATES) {
    try {
      console.log(`  calling Gemini (${candidate}) …`);
      const { text } = await generateText({
        model: google(candidate),
        system: SYSTEM,
        prompt: PROMPT,
        maxOutputTokens: 4096,
        temperature: 0.4,
      });
      report = text;
      MODEL = candidate; // record which one actually produced the report
      break;
    } catch (err) {
      if (!isDegradable(err)) {
        // 400/401/403/参数错误/SDK 变更 → 非模型可用性问题，直接抛出真实错误
        console.error(`\n❌ ${candidate} 报了非可降级错误（认证/参数/其他），不再试其他模型：\n`);
        throw err;
      }
      lastErr = err;
      console.warn(`  ✗ ${candidate} 不可用 (${err?.statusCode ?? err?.status ?? err?.name ?? 'error'}) — 试下一个模型`);
    }
  }
  if (!report) {
    console.error('\n❌ 所有候选模型都失败了。最后一个错误如下。\n   （日常分析建议直接让 Claude 跑 /seo-ops——此脚本只是 CI 备用。）\n');
    console.error(lastErr?.message ?? lastErr);
    process.exit(1);
  }
}

/* ── Write ────────────────────────────────────────────────────────────────── */
const stamp = toISODate(new Date());
const header = `<!-- Generated by scripts/seo/ai-analyze.mjs · ${new Date().toISOString()} · model=${MODEL} -->\n# AI SEO/AEO 行动报告 — ${stamp}\n\n`;
fs.mkdirSync(DATA_DIR, { recursive: true });
const outPath = path.join(DATA_DIR, `ai-seo-report-${stamp}.md`);
const latestPath = path.join(DATA_DIR, 'ai-seo-report-latest.md');
fs.writeFileSync(outPath, header + report);
fs.writeFileSync(latestPath, header + report);

console.log(`\n✓ ${outPath}`);
console.log(`✓ ${latestPath}`);
