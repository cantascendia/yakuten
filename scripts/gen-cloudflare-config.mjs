#!/usr/bin/env node
/* 从 vercel.json 生成 Cloudflare Pages 的 public/_redirects 与 public/_headers。
   Per docs/specs/cloudflare-migration.md §2.3 / §2.4。

   为什么生成而不是手写：迁移期两个平台并存，vercel.json 仍是唯一真值源；
   手抄 75 条规则必然漂移。`--check` 模式供 CI 断言产物与真值源一致。

   _redirects 的能力差异（Cloudflare 不支持的 Vercel 语法）：
   · `has: [{type:'host'}]` 按域名匹配 → 跳过，改用 zone 级 Redirect Rule（见 spec）
   · 正则约束占位符 `:locale(en|ko|…)` → 按候选值展开成多行
   · `:rest(.*)` → splat `*`，目标里的 `:rest` → `:splat`
   · 非 ASCII 路径 → vercel.json 里已同时有 UTF-8 原文与百分号编码两份（#143），
     原样输出两份 */
import { readFileSync, writeFileSync } from 'node:fs';

const check = process.argv.includes('--check');
const vercel = JSON.parse(readFileSync('vercel.json', 'utf8'));

/* ---------- _redirects ---------- */

/** 把一条 Vercel source/destination 展开成 Cloudflare 的 [source, dest] 列表。 */
function expand(source, destination) {
  // 1) 正则约束的命名占位符 :name(a|b|c) → 逐值展开（只支持纯字面量的 | 列表）
  const m = /:([A-Za-z]+)\(([A-Za-z0-9_|-]+)\)/.exec(source);
  if (m) {
    const [whole, name, alts] = m;
    return alts.split('|').flatMap((v) =>
      expand(source.replace(whole, v), destination.replaceAll(`:${name}`, v)),
    );
  }
  // 2) :rest(.*) / :path(.*) → splat
  const splat = /:([A-Za-z]+)\(\.\*\)/.exec(source);
  if (splat) {
    const [whole, name] = splat;
    return expand(source.replace(whole, '*'), destination.replaceAll(`:${name}`, ':splat'));
  }
  if (/\(/.test(source)) throw new Error(`unsupported pattern: ${source}`);
  return [[source, destination]];
}

const redirectLines = [
  '# 由 scripts/gen-cloudflare-config.mjs 从 vercel.json 生成 —— 勿手改',
  '# www → apex 的按域名重定向不在此文件（_redirects 不支持 host 匹配），见 zone Redirect Rule',
];
let skippedHost = 0;
for (const r of vercel.redirects) {
  if (r.has?.some((h) => h.type === 'host')) { skippedHost++; continue; }
  const code = r.permanent ? 301 : 302;
  for (const [s, d] of expand(r.source, r.destination)) redirectLines.push(`${s} ${d} ${code}`);
}
const redirects = redirectLines.join('\n') + '\n';

/* ---------- _headers ---------- */

/** Vercel header source（path-to-regexp 风格）→ Cloudflare 路径模式（只支持 * 通配）。 */
function headerPaths(source) {
  if (source === '/(.*)') return ['/*'];
  const one = /^\/([a-z_]+)\/\(\.\*\)$/.exec(source); // /_astro/(.*)
  if (one) return [`/${one[1]}/*`];
  const many = /^\/\(([a-z|]+)\)\/\(\.\*\)$/.exec(source); // /(images|brands)/(.*)
  if (many) return many[1].split('|').map((d) => `/${d}/*`);
  const files = /^\/\((.+)\)$/.exec(source); // /(favicon\.svg|...|sitemap.*\.xml|...)
  if (files) {
    return files[1].split('|').map((f) => '/' + f.replace(/\\\./g, '.').replace('.*', '*'));
  }
  throw new Error(`unsupported header source: ${source}`);
}

/* CSP：去掉 Vercel 统计域名，加 Cloudflare Web Analytics 信标域名（spec §2.5）。 */
function cfCsp(v) {
  return v
    .replace(/ https:\/\/va\.vercel-scripts\.com/g, '')
    .replace(/ https:\/\/vitals\.vercel-insights\.com/g, '')
    .replace("script-src 'self' 'unsafe-inline'", "script-src 'self' 'unsafe-inline' https://static.cloudflareinsights.com")
    .replace("connect-src 'self'", "connect-src 'self' https://cloudflareinsights.com");
}

const headerLines = ['# 由 scripts/gen-cloudflare-config.mjs 从 vercel.json 生成 —— 勿手改'];
for (const h of vercel.headers) {
  for (const p of headerPaths(h.source)) {
    headerLines.push(p);
    for (const { key, value } of h.headers) {
      headerLines.push(`  ${key}: ${key === 'Content-Security-Policy' ? cfCsp(value) : value}`);
    }
  }
}
const headers = headerLines.join('\n') + '\n';

/* ---------- 写出 / 校验 ---------- */

const outputs = { 'public/_redirects': redirects, 'public/_headers': headers };
let drift = false;
for (const [file, content] of Object.entries(outputs)) {
  if (check) {
    let cur = '';
    try { cur = readFileSync(file, 'utf8').replace(/\r\n/g, '\n'); } catch { /* missing */ }
    if (cur !== content) { console.error(`✗ ${file} is out of date — run: node scripts/gen-cloudflare-config.mjs`); drift = true; }
  } else {
    writeFileSync(file, content);
  }
}
if (drift) process.exit(1);
console.log(
  `${check ? '✓ up to date' : 'wrote'}: _redirects ${redirectLines.length - 2} rules `
  + `(host rule skipped: ${skippedHost}), _headers ${vercel.headers.length} groups`,
);
