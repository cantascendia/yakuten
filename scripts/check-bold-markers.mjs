#!/usr/bin/env node
/**
 * Fails when an MDX `**bold**` pair cannot render under CommonMark flanking
 * rules — it then shows literal asterisks on the page. Classic trigger in CJK
 * text: the closing `**` sits between full-width punctuation and a letter, e.g.
 * `发生**暴发性肝衰竭（ALF）**并…` or `約**6%**に`. Use <strong>…</strong> there.
 *
 * Mirrors CommonMark 0.31 left/right-flanking (Unicode P* and S* count as
 * punctuation). Inline code is masked; fenced code blocks are skipped.
 */
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const contentDir = path.join(root, 'src', 'content');

const isPunct = (c) => c === '' || /[\p{P}\p{S}]/u.test(c);
const isSpace = (c) => c === '' || /\s/u.test(c);
const leftFlanking = (prev, next) => !isSpace(next) && (!isPunct(next) || isSpace(prev) || isPunct(prev));
const rightFlanking = (prev, next) => !isSpace(prev) && (!isPunct(prev) || isSpace(next) || isPunct(next));

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (entry.name.endsWith('.mdx') || entry.name.endsWith('.md')) yield full;
  }
}

const problems = [];
for await (const file of walk(contentDir)) {
  const lines = (await readFile(file, 'utf8')).split('\n');
  let fenced = false;
  lines.forEach((line, i) => {
    if (line.trimStart().startsWith('```')) {
      fenced = !fenced;
      return;
    }
    if (fenced || !line.includes('**')) return;
    const masked = line.replace(/`[^`]*`/g, (m) => 'x'.repeat(m.length));
    const chars = Array.from(masked);
    const at = (j) => (j >= 0 && j < chars.length ? chars[j] : '');
    const pos = [];
    for (let j = 0; j < chars.length - 1; j++) {
      if (chars[j] === '*' && chars[j + 1] === '*' && at(j - 1) !== '*' && at(j + 2) !== '*') pos.push(j);
    }
    for (let k = 0; k + 1 < pos.length; k += 2) {
      const o = pos[k];
      const c = pos[k + 1];
      if (!leftFlanking(at(o - 1), at(o + 2)) || !rightFlanking(at(c - 1), at(c + 2))) {
        problems.push(`${path.relative(root, file)}:${i + 1}: ${chars.slice(Math.max(0, o - 6), c + 8).join('')}`);
      }
    }
  });
}

if (problems.length) {
  console.error(`✗ ${problems.length} **bold** pair(s) will render as literal asterisks — use <strong>…</strong>:`);
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}
console.log('✓ bold markers: all **…** pairs render');
