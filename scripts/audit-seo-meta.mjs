// One-off Bing SEO audit: identify pages whose title/description are too short
// by CJK-aware visual length (CJK chars count as 2, matching SERP display width).
//
// Bing thresholds (from webmaster tools):
//   title       : 50–60 visual chars ideal → flag < 40
//   description : 150–160 visual chars ideal → flag < 110
//
// Run: node scripts/audit-seo-meta.mjs

import fs from 'node:fs';
import path from 'node:path';

const roots = ['src/content/docs', 'src/content/blog'];
const results = [];

function walk(dir) {
  for (const f of fs.readdirSync(dir)) {
    const fp = path.join(dir, f);
    const st = fs.statSync(fp);
    if (st.isDirectory()) walk(fp);
    else if (fp.endsWith('.mdx') || fp.endsWith('.md')) {
      const src = fs.readFileSync(fp, 'utf8');
      const fm = src.match(/^---\r?\n([\s\S]*?)\r?\n---/);
      if (!fm) continue;
      const title = extractField(fm[1], 'title');
      const desc = extractField(fm[1], 'description');
      results.push({
        fp: fp.replaceAll('\\', '/'),
        tLen: visLen(title),
        dLen: visLen(desc),
        title,
        desc,
      });
    }
  }
}

function extractField(yaml, key) {
  // Matches: `key: value` on its own line; strips surrounding quotes.
  const re = new RegExp(`^${key}:[ \\t]*(['"]?)(.*?)\\1[ \\t]*$`, 'm');
  const m = yaml.match(re);
  return m ? m[2] : '';
}

function visLen(s) {
  let n = 0;
  for (const c of s) {
    // CJK unified ideographs, CJK symbols, fullwidth forms
    if (/[\u3000-\u9fff\uff00-\uffef]/.test(c)) n += 2;
    else n += 1;
  }
  return n;
}

for (const r of roots) walk(r);

const shortT = results.filter((r) => r.tLen > 0 && r.tLen < 40).sort((a, b) => a.tLen - b.tLen);
const shortD = results.filter((r) => r.dLen > 0 && r.dLen < 110).sort((a, b) => a.dLen - b.dLen);
const noDesc = results.filter((r) => r.dLen === 0);

console.log(`\n=== Total pages scanned: ${results.length} ===`);
console.log(`\n=== Title < 40 visual chars: ${shortT.length} ===`);
for (const r of shortT) {
  console.log(`  [${r.tLen.toString().padStart(2)}] ${r.fp.replace('src/content/', '')}`);
  console.log(`         "${r.title}"`);
}
console.log(`\n=== Description < 110 visual chars: ${shortD.length} ===`);
for (const r of shortD) {
  console.log(`  [${r.dLen.toString().padStart(3)}] ${r.fp.replace('src/content/', '')}`);
  console.log(`         "${r.desc}"`);
}
console.log(`\n=== No description: ${noDesc.length} ===`);
for (const r of noDesc) console.log(`  ${r.fp}`);
