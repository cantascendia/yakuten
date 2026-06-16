#!/usr/bin/env node
/**
 * Postbuild: inject <lastmod> into dist/sitemap-0.xml from MDX frontmatter.
 *
 * Astro / Starlight's bundled sitemap does not include lastmod. This script
 * walks src/content/docs/**, reads each page's `lastReviewed`, and rewrites
 * the dist sitemap so search engines see per-page freshness.
 *
 * Pages without lastReviewed fall back to the build time.
 * Pages not in content (e.g. /tools interactive pages) fall back to build time.
 */
import fs from 'node:fs';
import path from 'node:path';

const DIST_DIR = path.resolve('dist');
const CONTENT_DIR = path.resolve('src/content/docs');
const SITE = 'https://hrtyaku.com';
const BUILD_TIME = new Date().toISOString();

// Walk content dir once, returning:
//   lastmod: Map { "https://…/zh/medications/.../" : "2026-04-15T…Z" }
//   noindex: Set of URLs whose frontmatter has `noindex: true` (e.g. the paused
//            ko locale). These must be dropped from the sitemap so GSC doesn't
//            flag "Submitted URL marked 'noindex'".
function buildContentMaps() {
  const lastmod = new Map();
  const noindex = new Set();
  function walk(dir, relParts) {
    for (const name of fs.readdirSync(dir)) {
      const abs = path.join(dir, name);
      const stat = fs.statSync(abs);
      if (stat.isDirectory()) {
        walk(abs, [...relParts, name]);
      } else if (/\.(md|mdx)$/.test(name)) {
        const slug = name.replace(/\.(md|mdx)$/, '');
        const src = fs.readFileSync(abs, 'utf8');
        const fm = src.match(/^---\r?\n([\s\S]*?)\r?\n---/);
        if (!fm) continue;
        // Starlight URL convention: index.mdx -> folder/, else folder/slug/
        let urlPath;
        if (slug === 'index') {
          urlPath = '/' + [...relParts].join('/') + (relParts.length ? '/' : '');
        } else {
          urlPath = '/' + [...relParts, slug].join('/') + '/';
        }
        const url = SITE + urlPath;
        // Note: check noindex independently of lastReviewed (some noindex pages
        // may lack a review date).
        if (/^noindex:\s*true\b/m.test(fm[1])) noindex.add(url);
        const lr = fm[1].match(/^lastReviewed:\s*['"]?([0-9-]+)['"]?/m);
        if (lr) lastmod.set(url, new Date(lr[1]).toISOString());
      }
    }
  }
  walk(CONTENT_DIR, []);
  return { lastmod, noindex };
}

function injectIntoSitemap(sitemapPath, lastmodMap, noindexSet) {
  if (!fs.existsSync(sitemapPath)) return { replaced: 0, removed: 0 };
  let xml = fs.readFileSync(sitemapPath, 'utf8');
  let replaced = 0;
  let removed = 0;
  // Remove any pre-existing <lastmod> to be idempotent.
  xml = xml.replace(/<lastmod>[^<]+<\/lastmod>/g, '');
  // For each <url>...<loc>URL</loc>...</url>: drop the whole block if the URL is
  // noindexed, otherwise insert <lastmod> before </url>.
  // The Astro / @astrojs/sitemap output is single-line minified XML with no
  // whitespace between tags, so the regex must NOT require `\s*` between
  // `<url>` and `<loc>`. Match `<url>...<loc>` lazily instead, and capture
  // everything between </loc> and </url> as the inner block.
  xml = xml.replace(
    /<url>([\s\S]*?)<loc>([^<]+)<\/loc>([\s\S]*?)<\/url>/g,
    (_match, prefix, loc, inner) => {
      if (noindexSet.has(loc)) {
        removed++;
        return '';
      }
      const iso = lastmodMap.get(loc) ?? BUILD_TIME;
      replaced++;
      return `<url>${prefix}<loc>${loc}</loc>${inner}<lastmod>${iso}</lastmod></url>`;
    },
  );
  fs.writeFileSync(sitemapPath, xml);
  return { replaced, removed };
}

if (!fs.existsSync(DIST_DIR)) {
  console.error('dist/ not found — run astro build first.');
  process.exit(1);
}

const { lastmod: lastmodMap, noindex: noindexSet } = buildContentMaps();
console.log(`Loaded lastReviewed for ${lastmodMap.size} content pages; ${noindexSet.size} noindex pages to exclude from sitemap`);

// Walk dist/ for any sitemap-*.xml (Starlight/@astrojs/sitemap pattern).
let total = 0;
let totalRemoved = 0;
for (const name of fs.readdirSync(DIST_DIR)) {
  if (/^sitemap-\d+\.xml$/.test(name)) {
    const { replaced, removed } = injectIntoSitemap(path.join(DIST_DIR, name), lastmodMap, noindexSet);
    console.log(`✓ ${name}: ${replaced} <url> updated, ${removed} noindex removed`);
    total += replaced;
    totalRemoved += removed;
  }
}
console.log(`\nTotal URLs with lastmod: ${total} (excluded ${totalRemoved} noindex)`);
