#!/usr/bin/env node
/**
 * check-citation-refs.mjs — 机检 <CitationRef> 的 id/authors/year 是否与 references.json 一字一致。
 *
 * 由 cto-blog-pipeline 工作流在 writer 阶段（交评审前）强制运行，
 * 把"首篇出现 4 处 authors 与 json 不符"这类手动易漏变成硬门。
 *
 * 用法：node scripts/check-citation-refs.mjs <file.mdx> [更多文件...]
 * 退出码：0 = 全部一致；1 = 有 mismatch / 未知 id。
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const refsRaw = JSON.parse(
  readFileSync(resolve(__dirname, '../src/data/references.json'), 'utf8'),
);
const refsArr = Array.isArray(refsRaw)
  ? refsRaw
  : refsRaw.references || Object.values(refsRaw);
const byId = new Map();
for (const r of refsArr) if (r && r.id) byId.set(r.id, r);

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error('用法: node scripts/check-citation-refs.mjs <file.mdx> [...]');
  process.exit(2);
}

// 提取单个标签内的属性
const attr = (tag, name) => {
  const s = tag.match(new RegExp(`${name}="([^"]*)"`));
  if (s) return s[1];
  const n = tag.match(new RegExp(`${name}=\\{([^}]*)\\}`));
  return n ? n[1].trim() : undefined;
};

let problems = 0;
let checked = 0;
for (const file of files) {
  let text;
  try {
    text = readFileSync(file, 'utf8');
  } catch {
    console.error(`✖ 读不到文件: ${file}`);
    problems++;
    continue;
  }
  const tags = text.match(/<CitationRef\b[^>]*?\/>/g) || [];
  for (const tag of tags) {
    const id = attr(tag, 'id');
    if (!id) continue;
    checked++;
    const ref = byId.get(id);
    if (!ref) {
      console.error(`✖ [${file}] 未知引用 id="${id}"（不在 references.json）`);
      problems++;
      continue;
    }
    const a = attr(tag, 'authors');
    if (a !== undefined && ref.authors !== undefined && a !== String(ref.authors)) {
      console.error(
        `✖ [${file}] id="${id}" authors 不一致：mdx="${a}" vs json="${ref.authors}"`,
      );
      problems++;
    }
    const y = attr(tag, 'year');
    if (y !== undefined && ref.year !== undefined && String(y) !== String(ref.year)) {
      console.error(
        `✖ [${file}] id="${id}" year 不一致：mdx="${y}" vs json="${ref.year}"`,
      );
      problems++;
    }
  }
}

if (problems > 0) {
  console.error(`\n✖ check-citation-refs: ${problems} 处问题（检查了 ${checked} 个 CitationRef）`);
  process.exit(1);
}
console.log(`✓ check-citation-refs: ${checked} 个 CitationRef 全部与 references.json 一致`);
