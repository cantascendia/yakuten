#!/usr/bin/env node
/**
 * Append a "相关对比 / Related comparisons" section to the end of each medication
 * MDX page, linking into the new /zh/compare/* hub.
 *
 * Idempotent: skips files that already contain "相关对比" heading.
 */
import fs from 'node:fs';
import path from 'node:path';

const LINKS = {
  // antiandrogens
  'src/content/docs/zh/medications/antiandrogens/cpa.mdx': [
    ['CPA vs 螺内酯:临床对比', '/zh/compare/cpa-vs-spironolactone/'],
    ['色普龙安全剂量 5-12.5 mg', '/zh/blog/cpa-dose-safe-range/'],
    ['CPA 脑膜瘤风险循证评估', '/zh/blog/cpa-meningioma-risk-evidence/'],
  ],
  'src/content/docs/zh/medications/antiandrogens/spironolactone.mdx': [
    ['CPA vs 螺内酯:临床对比', '/zh/compare/cpa-vs-spironolactone/'],
    ['抗雄切换指南', '/zh/guides/switch-antiandrogen/'],
  ],
  'src/content/docs/zh/medications/antiandrogens/bicalutamide.mdx': [
    ['CPA vs 螺内酯:临床对比', '/zh/compare/cpa-vs-spironolactone/'],
    ['抗雄切换指南', '/zh/guides/switch-antiandrogen/'],
  ],
  'src/content/docs/zh/medications/antiandrogens/gnrh-agonists.mdx': [
    ['CPA vs 螺内酯:临床对比', '/zh/compare/cpa-vs-spironolactone/'],
    ['抗雄切换指南', '/zh/guides/switch-antiandrogen/'],
  ],
  // estrogens
  'src/content/docs/zh/medications/estrogens/oral.mdx': [
    ['口服 vs 注射:临床对比', '/zh/compare/oral-vs-injection/'],
    ['凝胶 vs 贴片:临床对比', '/zh/compare/gel-vs-patch/'],
    ['切换 E2 途径指南', '/zh/guides/switch-e2-route/'],
  ],
  'src/content/docs/zh/medications/estrogens/sublingual.mdx': [
    ['口服 vs 注射:临床对比', '/zh/compare/oral-vs-injection/'],
    ['切换 E2 途径指南', '/zh/guides/switch-e2-route/'],
  ],
  'src/content/docs/zh/medications/estrogens/gel.mdx': [
    ['凝胶 vs 贴片:临床对比', '/zh/compare/gel-vs-patch/'],
    ['口服 vs 注射:临床对比', '/zh/compare/oral-vs-injection/'],
  ],
  'src/content/docs/zh/medications/estrogens/transdermal-patch.mdx': [
    ['凝胶 vs 贴片:临床对比', '/zh/compare/gel-vs-patch/'],
    ['切换 E2 途径指南', '/zh/guides/switch-e2-route/'],
  ],
  'src/content/docs/zh/medications/estrogens/injection.mdx': [
    ['口服 vs 注射:临床对比', '/zh/compare/oral-vs-injection/'],
    ['打针后多久查血', '/zh/blog/blood-test-timing-after-injection/'],
    ['首次注射指南', '/zh/guides/first-injection/'],
  ],
  'src/content/docs/zh/medications/estrogens/cypionate.mdx': [
    ['口服 vs 注射:临床对比', '/zh/compare/oral-vs-injection/'],
    ['打针后多久查血', '/zh/blog/blood-test-timing-after-injection/'],
  ],
  'src/content/docs/zh/medications/estrogens/enanthate.mdx': [
    ['口服 vs 注射:临床对比', '/zh/compare/oral-vs-injection/'],
    ['打针后多久查血', '/zh/blog/blood-test-timing-after-injection/'],
  ],
  'src/content/docs/zh/medications/estrogens/undecylate.mdx': [
    ['口服 vs 注射:临床对比', '/zh/compare/oral-vs-injection/'],
    ['打针后多久查血', '/zh/blog/blood-test-timing-after-injection/'],
  ],
  // progestogens
  'src/content/docs/zh/medications/progestogens/progesterone.mdx': [
    ['雌激素总览与选择', '/zh/medications/estrogens/overview/'],
  ],
  'src/content/docs/zh/medications/progestogens/dydrogesterone.mdx': [
    ['雌激素总览与选择', '/zh/medications/estrogens/overview/'],
  ],
  'src/content/docs/zh/medications/progestogens/drospirenone.mdx': [
    ['雌激素总览与选择', '/zh/medications/estrogens/overview/'],
  ],
};

const MARKER = '## 相关对比与内链';

let injected = 0;
let skipped = 0;

for (const [relPath, links] of Object.entries(LINKS)) {
  const abs = path.resolve(relPath);
  if (!fs.existsSync(abs)) {
    console.warn(`SKIP (missing): ${relPath}`);
    continue;
  }
  const src = fs.readFileSync(abs, 'utf8');
  if (src.includes(MARKER)) {
    skipped++;
    continue;
  }
  const eol = src.includes('\r\n') ? '\r\n' : '\n';
  const block =
    `${eol}${eol}${MARKER}${eol}${eol}` +
    links.map(([label, url]) => `- [${label}](${url})`).join(eol) +
    eol;
  // Ensure final newline.
  const next = src.replace(/\r?\n*$/, '') + block;
  fs.writeFileSync(abs, next);
  injected++;
  console.log(`✓ ${relPath} (+${links.length} link)`);
}

console.log(`\nInjected: ${injected} · Skipped (already had section): ${skipped}`);
