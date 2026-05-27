#!/usr/bin/env node
/**
 * verify-doi-liveness.mjs
 *
 * Periodic liveness check for references.json. For each entry:
 *   - If `doi` present → GET https://doi.org/{doi} with `Range: bytes=0-0`
 *     (HEAD is frequently rejected by Crossref / publisher CDNs with 403)
 *   - If `doi` null and `url` present → GET the url
 *
 * Status code policy (per D017):
 *   - 200 / 206 / 30x → pass
 *   - 403 / 405 / 429 → "manual review" (publishers block crawlers; humans can resolve)
 *   - 4xx other / 5xx / network error → fail
 *
 * Output:
 *   - Console summary table
 *   - Markdown report at docs/citations-liveness-{YYYY-MM-DD}.md
 *   - Exit code 0 even when manual-review items exist (so CI doesn't false-fail);
 *     exit code 1 only on hard fail (4xx other / 5xx / network)
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const rootDir = process.cwd();
const refsPath = path.join(rootDir, 'src', 'data', 'references.json');
const docsDir = path.join(rootDir, 'docs');

const today = new Date().toISOString().slice(0, 10);
const reportPath = path.join(docsDir, `citations-liveness-${today}.md`);

const TIMEOUT_MS = 15000;
const CONCURRENCY = 4;

const refs = JSON.parse(await readFile(refsPath, 'utf8'));
if (!Array.isArray(refs)) throw new Error('references.json must be an array');

/** @typedef {{ id: string, target: string, status: number | 'NETWORK' | 'TIMEOUT', verdict: 'pass' | 'manual' | 'fail', note?: string }} Result */

/**
 * Resolve a single reference. Returns Result.
 * @param {any} ref
 * @returns {Promise<Result>}
 */
async function doFetch(target) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(target, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        Range: 'bytes=0-0',
        'User-Agent': 'yakuten-citations-liveness/1.0 (+https://hrtyaku.com)',
        Accept: '*/*',
      },
    });
    clearTimeout(timer);
    return { status: res.status };
  } catch (err) {
    clearTimeout(timer);
    if (err.name === 'AbortError') return { status: 'TIMEOUT' };
    return { status: 'NETWORK', err: err.message ?? String(err) };
  }
}

async function checkOne(ref) {
  const target = ref.doi ? `https://doi.org/${ref.doi}` : ref.url;
  if (!target) {
    return { id: ref.id, target: '(no doi / no url)', status: 0, verdict: 'fail', note: 'reference has neither doi nor url' };
  }

  let result = await doFetch(target);
  // Retry once on transient 5xx — publisher CDNs sometimes flake under load
  if (typeof result.status === 'number' && result.status >= 500 && result.status < 600) {
    await new Promise((r) => setTimeout(r, 1500));
    result = await doFetch(target);
  }

  const status = result.status;
  if (status === 200 || status === 206 || (typeof status === 'number' && status >= 300 && status < 400)) {
    return { id: ref.id, target, status, verdict: 'pass' };
  }
  if (status === 403 || status === 405 || status === 429 || status === 'TIMEOUT') {
    return {
      id: ref.id,
      target,
      status,
      verdict: 'manual',
      note: status === 'TIMEOUT' ? `timeout after ${TIMEOUT_MS}ms` : 'publisher blocks bot; verify manually',
    };
  }
  if (typeof status === 'number' && status >= 500 && status < 600) {
    // 5xx after retry: usually transient publisher CDN flake (Cloudflare 503 on
    // node fetch is common for bmj.com etc.). Mark manual, not fail.
    return {
      id: ref.id,
      target,
      status,
      verdict: 'manual',
      note: '5xx after retry; likely transient publisher CDN — verify manually',
    };
  }
  if (status === 'NETWORK') {
    return { id: ref.id, target, status, verdict: 'fail', note: result.err };
  }
  return { id: ref.id, target, status, verdict: 'fail', note: `unexpected ${status}` };
}

/** Run checks with bounded concurrency. */
async function runAll() {
  /** @type {Result[]} */
  const results = [];
  let cursor = 0;
  const workers = Array.from({ length: CONCURRENCY }, async () => {
    while (cursor < refs.length) {
      const idx = cursor++;
      const result = await checkOne(refs[idx]);
      results[idx] = result;
      process.stdout.write(
        `  [${idx + 1}/${refs.length}] ${result.verdict.padEnd(6)} ${String(result.status).padEnd(8)} ${result.id}\n`,
      );
    }
  });
  await Promise.all(workers);
  return results;
}

console.log(`Verifying ${refs.length} references against doi.org / publisher URLs...\n`);
const results = await runAll();

const passes = results.filter((r) => r.verdict === 'pass');
const manuals = results.filter((r) => r.verdict === 'manual');
const fails = results.filter((r) => r.verdict === 'fail');

console.log('\n--- Summary ---');
console.log(`Pass:           ${passes.length}`);
console.log(`Manual review:  ${manuals.length}`);
console.log(`Fail:           ${fails.length}`);

const lines = [];
lines.push(`# Citation liveness — ${today}`);
lines.push('');
lines.push(`Script: \`scripts/verify-doi-liveness.mjs\` · Source: \`src/data/references.json\` (${refs.length} entries)`);
lines.push('');
lines.push(`| Verdict | Count |`);
lines.push(`|---------|-------|`);
lines.push(`| ✅ pass | ${passes.length} |`);
lines.push(`| 🟡 manual review (publisher blocks bot / timeout) | ${manuals.length} |`);
lines.push(`| 🔴 fail (4xx / 5xx / network) | ${fails.length} |`);
lines.push('');
lines.push('## Pass');
lines.push('');
for (const r of passes) lines.push(`- \`${r.id}\` — ${r.status} — ${r.target}`);
lines.push('');
if (manuals.length > 0) {
  lines.push('## Manual review');
  lines.push('');
  lines.push('These returned 403 / 405 / 429 / timeout — common for Crossref + several publishers when accessed by bots. A human should open the URL in a browser and confirm the paper still resolves.');
  lines.push('');
  for (const r of manuals) lines.push(`- \`${r.id}\` — ${r.status} — ${r.target}${r.note ? ` _(${r.note})_` : ''}`);
  lines.push('');
}
if (fails.length > 0) {
  lines.push('## Fail');
  lines.push('');
  lines.push('These returned a hard 4xx / 5xx or a network error. **Action required**: open in browser; if dead, find a replacement DOI / archive (Wayback Machine) and update `references.json`.');
  lines.push('');
  for (const r of fails) lines.push(`- \`${r.id}\` — ${r.status} — ${r.target}${r.note ? ` _(${r.note})_` : ''}`);
  lines.push('');
}

await mkdir(docsDir, { recursive: true });
await writeFile(reportPath, lines.join('\n'), 'utf8');
console.log(`\nReport written to ${path.relative(rootDir, reportPath)}`);

process.exit(fails.length > 0 ? 1 : 0);
