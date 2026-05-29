#!/usr/bin/env node
/**
 * verify-blog-links.mjs — 机检博客的 relatedDocs 与正文 /zh/ 内链是否解析到真实页面。
 *
 * npm run build 不会校验正文 markdown 链接，slug 打错会静默上线。
 * 本脚本由 cto-blog-pipeline 在定稿前强制运行。
 *
 * 用法：node scripts/verify-blog-links.mjs <blog.mdx> [...]
 * 退出码：0 = 全部解析；1 = 有断链。
 */
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

// 把 /zh/<path>/ 形式的站内路由映射到内容文件，判断是否存在
function routeExists(route) {
  let p = route.replace(/[#?].*$/, '').replace(/\/+$/, ''); // 去 anchor / query / 末尾斜杠
  if (!p.startsWith('/zh/')) return true; // 非 zh 站内链接不在本脚本判定范围
  const rel = p.slice('/zh/'.length); // e.g. medications/estrogens/injection 或 blog/foo
  const candidates = [];
  if (rel.startsWith('blog/')) {
    const slug = rel.slice('blog/'.length);
    candidates.push(`src/content/blog/zh/${slug}.mdx`);
  } else {
    candidates.push(`src/content/docs/zh/${rel}.mdx`);
    candidates.push(`src/content/docs/zh/${rel}.md`);
    candidates.push(`src/content/docs/zh/${rel}/index.mdx`); // 目录页
  }
  // 工具/锚点页可能由 .astro 路由提供；放宽：若是已知顶层段也接受
  return candidates.some((c) => existsSync(resolve(root, c)));
}

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error('用法: node scripts/verify-blog-links.mjs <blog.mdx> [...]');
  process.exit(2);
}

let broken = 0;
let checked = 0;
for (const file of files) {
  const text = readFileSync(file, 'utf8');

  // 1) frontmatter relatedDocs: [a, b, c]
  const fm = text.match(/relatedDocs:\s*\[([^\]]*)\]/);
  if (fm) {
    for (const raw of fm[1].split(',')) {
      const docPath = raw.trim().replace(/^["']|["']$/g, '');
      if (!docPath) continue;
      checked++;
      const ok =
        existsSync(resolve(root, `src/content/docs/zh/${docPath}.mdx`)) ||
        existsSync(resolve(root, `src/content/docs/zh/${docPath}.md`)) ||
        existsSync(resolve(root, `src/content/docs/zh/${docPath}/index.mdx`));
      if (!ok) {
        console.error(`✖ [${file}] relatedDocs 指向不存在的 docs: "${docPath}"`);
        broken++;
      }
    }
  }

  // 2) 正文 markdown 内链 ](/zh/...)
  const linkRe = /\]\((\/zh\/[^)\s]+)\)/g;
  let m;
  while ((m = linkRe.exec(text))) {
    checked++;
    if (!routeExists(m[1])) {
      console.error(`✖ [${file}] 正文断链: "${m[1]}"`);
      broken++;
    }
  }
}

if (broken > 0) {
  console.error(`\n✖ verify-blog-links: ${broken} 处断链（检查了 ${checked} 条链接）`);
  process.exit(1);
}
console.log(`✓ verify-blog-links: ${checked} 条内链全部解析`);
