#!/usr/bin/env node
/**
 * Postbuild: generate a per-page OG image (1200×630 PNG) for every MDX doc
 * and write to dist/og/<locale>/<path>.png. Overwrites the <meta og:image>
 * injected by Head.astro at render time (which points here).
 *
 * Uses sharp with an in-memory SVG template. 米哈游「二相乐园」palette:
 *   bg #0D0B14, panel #1A1625 at 60%, primary #C84B7C (绯), accent #D4A853 (幻月金)
 *
 * Fonts: SVG uses "Noto Serif SC" for title, "Noto Sans SC" for meta; sharp
 * renders via fontconfig on the host. Chinese fallback stack ensures pages
 * render even without Noto SC locally — sharp substitutes a default CJK font.
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const CONTENT_DIR = path.resolve('src/content/docs');
const BLOG_DIR = path.resolve('src/content/blog');
const OUT_DIR = path.resolve('dist/og');

const COLORS = {
  bg: '#0D0B14',
  panel: '#1A1625',
  primary: '#C84B7C',
  accent: '#D4A853',
  text: '#F5EEDC',
  muted: '#8B7E92',
};

const EVIDENCE_FILL = {
  A: '#3FA66A',
  B: '#4A8CC1',
  C: '#D4A853',
  X: '#C84B7C',
};

// Blog category → (zh label, accent color). Keep in sync with src/utils/blogHelpers.ts.
const BLOG_CATEGORY = {
  'estrogen-guide':     { zh: '雌激素指南',  color: '#C84B7C' },
  'antiandrogen-guide': { zh: '抗雄指南',    color: '#9B7DD4' },
  'blood-test':         { zh: '血检相关',    color: '#4A8CC1' },
  safety:               { zh: '安全与风险',  color: '#D4564B' },
  practical:            { zh: '实操经验',    color: '#3FA66A' },
  comparison:           { zh: '药物对比',    color: '#D4A853' },
  general:              { zh: '综合',        color: '#8B7E92' },
};

function escapeXml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** Wrap long CJK titles by character count (CJK chars ~ 1.3× width of Latin). */
function wrapTitle(title, maxCharsPerLine = 18, maxLines = 3) {
  const chars = [...title];
  const lines = [];
  let cur = '';
  for (const c of chars) {
    if ([...cur].length >= maxCharsPerLine) {
      lines.push(cur);
      cur = '';
      if (lines.length === maxLines - 1) break;
    }
    cur += c;
  }
  if (cur && lines.length < maxLines) lines.push(cur);
  // If we truncated, add ellipsis.
  if ([...title].length > lines.join('').length) {
    lines[lines.length - 1] = lines[lines.length - 1].slice(0, -1) + '…';
  }
  return lines;
}

/**
 * Blog-specific wrap: fills lines greedily up to maxCharsPerLine × maxLines and
 * appends "…" only when truncating. Unlike `wrapTitle`, this version actually
 * fills the LAST line (the original breaks one iteration too early when
 * `lines.length === maxLines - 1`, leaving the final line empty).
 */
function wrapTitleBlog(title, maxCharsPerLine, maxLines) {
  const chars = [...title];
  const cap = maxCharsPerLine * maxLines;
  const used = chars.slice(0, cap);
  const truncated = chars.length > cap;
  const lines = [];
  for (let i = 0; i < used.length; i += maxCharsPerLine) {
    lines.push(used.slice(i, i + maxCharsPerLine).join(''));
  }
  if (truncated && lines.length > 0) {
    const last = [...lines[lines.length - 1]];
    last[last.length - 1] = '…';
    lines[lines.length - 1] = last.join('');
  }
  return lines;
}

function buildSvg({ title, description, evidenceLevel, refCount, lastReviewed, locale }) {
  const W = 1200;
  const H = 630;
  const lines = wrapTitle(title, 16, 3);
  const lineHeight = 88;
  const titleStartY = 260 - ((lines.length - 1) * lineHeight) / 2;

  const evidenceFill = evidenceLevel && EVIDENCE_FILL[evidenceLevel] ? EVIDENCE_FILL[evidenceLevel] : null;

  const metaParts = [];
  if (evidenceLevel) metaParts.push(`证据 ${evidenceLevel}`);
  if (typeof refCount === 'number' && refCount > 0) metaParts.push(`参考文献 ${refCount}`);
  if (lastReviewed) metaParts.push(`复查 ${lastReviewed}`);
  const metaText = metaParts.join('  ·  ');

  const brand = 'HRT药典 · hrtyaku.com';
  const tagline = '循证 · 减害 · 引导就医';

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bgGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${COLORS.bg}"/>
      <stop offset="100%" stop-color="#1E1A2E"/>
    </linearGradient>
    <linearGradient id="accentBar" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${COLORS.primary}"/>
      <stop offset="100%" stop-color="${COLORS.accent}"/>
    </linearGradient>
    <style>
      .title { font-family: "Noto Serif SC", "Noto Serif CJK SC", "Source Han Serif SC", "Songti SC", "SimSun", serif; font-weight: 700; fill: ${COLORS.text}; }
      .desc  { font-family: "Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif; font-weight: 400; fill: ${COLORS.muted}; }
      .brand { font-family: "Noto Serif SC", serif; font-weight: 600; fill: ${COLORS.accent}; letter-spacing: 0.1em; }
      .meta  { font-family: "JetBrains Mono", "Menlo", monospace; font-weight: 500; fill: ${COLORS.muted}; letter-spacing: 0.08em; }
      .tag   { font-family: "Noto Sans SC", sans-serif; font-weight: 400; fill: ${COLORS.muted}; letter-spacing: 0.3em; }
      .badge { font-family: "JetBrains Mono", monospace; font-weight: 700; fill: #fff; }
    </style>
  </defs>

  <!-- background -->
  <rect width="${W}" height="${H}" fill="url(#bgGrad)"/>

  <!-- diagonal clip-path panel (米哈游 style) -->
  <path d="M 60 60 L ${W - 76} 60 L ${W - 60} 76 L ${W - 60} ${H - 60} L 76 ${H - 60} L 60 ${H - 76} Z"
        fill="${COLORS.panel}" fill-opacity="0.7" stroke="${COLORS.primary}" stroke-opacity="0.25" stroke-width="1.5"/>

  <!-- accent bar top -->
  <rect x="80" y="90" width="140" height="4" fill="url(#accentBar)"/>

  <!-- brand line -->
  <text x="80" y="130" class="brand" font-size="22">${escapeXml(brand)}</text>
  <text x="80" y="160" class="tag" font-size="14">${escapeXml(tagline)}</text>

  <!-- title -->
  ${lines
    .map(
      (ln, i) =>
        `<text x="80" y="${titleStartY + i * lineHeight}" class="title" font-size="68">${escapeXml(ln)}</text>`,
    )
    .join('\n  ')}

  <!-- description -->
  ${
    description
      ? `<text x="80" y="${titleStartY + lines.length * lineHeight + 24}" class="desc" font-size="22">${escapeXml(
          [...description].slice(0, 48).join('') + ([...description].length > 48 ? '…' : ''),
        )}</text>`
      : ''
  }

  <!-- meta strip bottom -->
  <rect x="60" y="${H - 100}" width="${W - 120}" height="1" fill="${COLORS.primary}" fill-opacity="0.3"/>
  ${evidenceFill
    ? `<rect x="80" y="${H - 78}" width="44" height="44" rx="6" fill="${evidenceFill}"/>
       <text x="102" y="${H - 48}" class="badge" font-size="28" text-anchor="middle">${escapeXml(evidenceLevel)}</text>`
    : ''}
  <text x="${evidenceFill ? 140 : 80}" y="${H - 50}" class="meta" font-size="20">${escapeXml(metaText)}</text>
  <text x="${W - 80}" y="${H - 50}" class="meta" font-size="18" text-anchor="end">${escapeXml((locale || 'zh').toUpperCase())}</text>
</svg>`;
}

/**
 * Blog OG SVG template.
 * Distinct visual signature from the docs template:
 *   - Larger title (≤ 2 lines, 76px)
 *   - Sticker-style category badge (top-left)
 *   - Publish date + reading marker bottom-left, locale code bottom-right
 *   - Diagonal accent bar with gradient + 3 floating accent dots (米哈游 vibe)
 */
function buildBlogSvg({ title, description, category, publishDate, locale }) {
  const W = 1200;
  const H = 630;
  // 76px CJK title in a 1040px content column (1200 - 80×2 padding) ≈ 13 CJK chars/line.
  // Two lines hold up to 26 chars; ellipsis appended only when exceeding.
  const lines = wrapTitleBlog(title, 13, 2);
  const lineHeight = 92;
  // Vertical layout (between badge bottom 232 and meta-rule 530, leaving room
  // for one description line at ~22-24px font):
  //   1 line:  title baseline 320, description baseline 384
  //   2 lines: title baselines 300 / 392, description baseline 460
  const titleStartY = lines.length >= 2 ? 300 : 320;
  const descBaseline = lines.length >= 2 ? 460 : 384;

  const cat = BLOG_CATEGORY[category] || BLOG_CATEGORY.general;
  const catLabel = cat.zh;
  const catColor = cat.color;

  // Publish date display: 2026-04-19 → 2026 年 4 月 19 日
  let dateLabel = '';
  if (publishDate) {
    const m = String(publishDate).match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (m) dateLabel = `${m[1]} 年 ${parseInt(m[2], 10)} 月 ${parseInt(m[3], 10)} 日`;
    else dateLabel = String(publishDate);
  }

  const brand = 'HRT药典 · hrtyaku.com';
  const tagline = '循证 · 减害 · 引导就医';

  // Truncate description for OG (Chinese chars ~ 1.3× width).
  const descText = description
    ? [...description].slice(0, 54).join('') + ([...description].length > 54 ? '…' : '')
    : '';

  // Approximate badge width in pixels (12px per CJK char + 60px padding).
  const badgeW = Math.max(140, [...catLabel].length * 26 + 56);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="blogBg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%"   stop-color="#0D0B14"/>
      <stop offset="55%"  stop-color="#1A1230"/>
      <stop offset="100%" stop-color="#2A1F3D"/>
    </linearGradient>
    <linearGradient id="blogAccent" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%"   stop-color="${COLORS.primary}"/>
      <stop offset="100%" stop-color="${COLORS.accent}"/>
    </linearGradient>
    <radialGradient id="blogGlow" cx="0.85" cy="0.15" r="0.55">
      <stop offset="0%"   stop-color="${COLORS.primary}" stop-opacity="0.22"/>
      <stop offset="100%" stop-color="${COLORS.primary}" stop-opacity="0"/>
    </radialGradient>
    <style>
      .b-title { font-family: "Noto Serif SC", "Noto Serif CJK SC", "Source Han Serif SC", "Songti SC", "SimSun", "Microsoft YaHei", serif; font-weight: 700; fill: ${COLORS.text}; }
      .b-desc  { font-family: "Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif; font-weight: 400; fill: ${COLORS.muted}; }
      .b-brand { font-family: "Noto Serif SC", serif; font-weight: 700; fill: ${COLORS.accent}; letter-spacing: 0.12em; }
      .b-tag   { font-family: "Noto Sans SC", sans-serif; font-weight: 400; fill: ${COLORS.muted}; letter-spacing: 0.32em; }
      .b-meta  { font-family: "JetBrains Mono", "Menlo", monospace; font-weight: 500; fill: ${COLORS.muted}; letter-spacing: 0.08em; }
      .b-cat   { font-family: "Noto Sans SC", sans-serif; font-weight: 600; fill: #fff; letter-spacing: 0.12em; }
      .b-date  { font-family: "Noto Sans SC", sans-serif; font-weight: 500; fill: ${COLORS.text}; letter-spacing: 0.06em; }
    </style>
  </defs>

  <!-- background gradient + soft glow in top-right -->
  <rect width="${W}" height="${H}" fill="url(#blogBg)"/>
  <rect width="${W}" height="${H}" fill="url(#blogGlow)"/>

  <!-- 米哈游 diagonal-clip outer panel -->
  <path d="M 60 60 L ${W - 76} 60 L ${W - 60} 76 L ${W - 60} ${H - 60} L 76 ${H - 60} L 60 ${H - 76} Z"
        fill="#1A1625" fill-opacity="0.55" stroke="${COLORS.primary}" stroke-opacity="0.28" stroke-width="1.5"/>

  <!-- 几何 accent: 右上斜角块 + 浮动圆点 -->
  <path d="M ${W - 200} 60 L ${W - 60} 60 L ${W - 60} 200 Z" fill="${COLORS.primary}" fill-opacity="0.10"/>
  <circle cx="${W - 140}" cy="180" r="6"  fill="${COLORS.accent}" fill-opacity="0.85"/>
  <circle cx="${W - 110}" cy="240" r="3"  fill="${COLORS.accent}" fill-opacity="0.65"/>
  <circle cx="${W - 170}" cy="120" r="4"  fill="${COLORS.primary}" fill-opacity="0.55"/>

  <!-- Brand block -->
  <rect x="80" y="92" width="120" height="3" fill="url(#blogAccent)"/>
  <text x="80" y="130" class="b-brand" font-size="22">${escapeXml(brand)}</text>
  <text x="80" y="158" class="b-tag"   font-size="13">${escapeXml(tagline)}</text>

  <!-- Category badge (top-left, sticker style) -->
  <g transform="translate(80, 188)">
    <rect width="${badgeW}" height="44" rx="22" fill="${catColor}" fill-opacity="0.92"/>
    <rect width="${badgeW}" height="44" rx="22" fill="none" stroke="#fff" stroke-opacity="0.22" stroke-width="1"/>
    <text x="${badgeW / 2}" y="29" class="b-cat" font-size="18" text-anchor="middle">${escapeXml(catLabel)}</text>
  </g>

  <!-- Title (≤ 2 lines, 76px) -->
  ${lines
    .map(
      (ln, i) =>
        `<text x="80" y="${titleStartY + i * lineHeight}" class="b-title" font-size="76">${escapeXml(ln)}</text>`,
    )
    .join('\n  ')}

  <!-- Description (single line, truncated) -->
  ${
    descText
      ? `<text x="80" y="${descBaseline}" class="b-desc" font-size="24">${escapeXml(descText)}</text>`
      : ''
  }

  <!-- Bottom rule + meta strip -->
  <rect x="60" y="${H - 100}" width="${W - 120}" height="1" fill="${COLORS.primary}" fill-opacity="0.32"/>
  ${dateLabel
    ? `<text x="80" y="${H - 50}" class="b-date" font-size="22">${escapeXml(dateLabel)}</text>
       <text x="80" y="${H - 22}" class="b-meta" font-size="14">BLOG · 跨性别 HRT 安全底线</text>`
    : `<text x="80" y="${H - 50}" class="b-date" font-size="22">BLOG · 跨性别 HRT 安全底线</text>`}
  <text x="${W - 80}" y="${H - 50}" class="b-meta" font-size="20" text-anchor="end">${escapeXml((locale || 'zh').toUpperCase())}</text>
</svg>`;
}

function parseFrontmatter(src) {
  const m = src.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return null;
  const body = m[1];
  const out = {};
  // minimal yaml-like: key: value on single line (quoted or bare)
  for (const line of body.split(/\r?\n/)) {
    const kv = line.match(/^([a-zA-Z_]+):\s*(.*)$/);
    if (!kv) continue;
    const key = kv[1];
    let val = kv[2].trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

function walk(dir, relParts, out) {
  for (const name of fs.readdirSync(dir)) {
    const abs = path.join(dir, name);
    const stat = fs.statSync(abs);
    if (stat.isDirectory()) {
      walk(abs, [...relParts, name], out);
    } else if (/\.(md|mdx)$/.test(name)) {
      const slug = name.replace(/\.(md|mdx)$/, '');
      const parts = slug === 'index' ? relParts : [...relParts, slug];
      out.push({ abs, parts });
    }
  }
}

async function generateDocsOg() {
  if (!fs.existsSync(CONTENT_DIR)) {
    console.warn('No docs content dir; skipping docs OG.');
    return { ok: 0, fail: 0 };
  }
  const entries = [];
  walk(CONTENT_DIR, [], entries);
  fs.mkdirSync(OUT_DIR, { recursive: true });

  let ok = 0;
  let fail = 0;
  for (const { abs, parts } of entries) {
    try {
      const src = fs.readFileSync(abs, 'utf8');
      const fm = parseFrontmatter(src);
      if (!fm || !fm.title) continue;

      const locale = parts[0];
      // Count references from the raw yaml line (array).
      const refLine = src.match(/^references:\s*\[([^\]]*)\]/m);
      const refCount = refLine
        ? refLine[1].split(',').filter((s) => s.trim().length > 0).length
        : 0;

      const svg = buildSvg({
        title: fm.title,
        description: fm.description,
        evidenceLevel: fm.evidenceLevel,
        refCount,
        lastReviewed: fm.lastReviewed,
        locale,
      });

      const outPath = path.join(OUT_DIR, ...parts) + '.png';
      fs.mkdirSync(path.dirname(outPath), { recursive: true });
      await sharp(Buffer.from(svg))
        .resize(1200, 630, { fit: 'cover' })
        .png({ compressionLevel: 9 })
        .toFile(outPath);
      ok++;
    } catch (err) {
      fail++;
      console.warn(`OG fail ${abs}: ${err.message}`);
    }
  }
  return { ok, fail };
}

async function generateBlogOg() {
  if (!fs.existsSync(BLOG_DIR)) {
    console.warn('No blog content dir; skipping blog OG.');
    return { ok: 0, fail: 0 };
  }
  // Layout: src/content/blog/<locale>/<slug>.mdx → dist/og/blog/<locale>/<slug>.png
  const entries = [];
  walk(BLOG_DIR, [], entries);

  let ok = 0;
  let fail = 0;
  for (const { abs, parts } of entries) {
    try {
      const src = fs.readFileSync(abs, 'utf8');
      const fm = parseFrontmatter(src);
      if (!fm || !fm.title) continue;
      // Skip drafts.
      if (fm.draft === 'true' || fm.draft === true) continue;

      // parts: [<locale>, <slug>] (single-level, no nesting in current blog).
      const locale = parts[0] || fm.locale || 'zh';

      const svg = buildBlogSvg({
        title: fm.title,
        description: fm.description,
        category: fm.category,
        publishDate: fm.publishDate,
        locale,
      });

      const outPath = path.join(OUT_DIR, 'blog', ...parts) + '.png';
      fs.mkdirSync(path.dirname(outPath), { recursive: true });
      await sharp(Buffer.from(svg))
        .resize(1200, 630, { fit: 'cover' })
        .png({ compressionLevel: 9 })
        .toFile(outPath);
      ok++;
    } catch (err) {
      fail++;
      console.warn(`Blog OG fail ${abs}: ${err.message}`);
    }
  }
  return { ok, fail };
}

async function main() {
  const docs = await generateDocsOg();
  const blog = await generateBlogOg();
  console.log(
    `OG images generated: docs ${docs.ok} ok · ${docs.fail} failed | blog ${blog.ok} ok · ${blog.fail} failed | out=${OUT_DIR}`,
  );
  const totalFail = docs.fail + blog.fail;
  if (totalFail > 0) {
    console.error(
      `✘ OG generation had ${totalFail} failure(s); failing build (E2 + Phase 12 §1.2).`,
    );
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
