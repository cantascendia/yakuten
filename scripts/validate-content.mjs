import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const rootDir = process.cwd();
const docsDir = path.join(rootDir, 'src', 'content', 'docs');
const blogDir = path.join(rootDir, 'src', 'content', 'blog');
const referencesPath = path.join(rootDir, 'src', 'data', 'references.json');
const hotlinesPath = path.join(rootDir, 'src', 'data', 'hotlines.json');

const errors = [];
const warnings = [];
const VALID_EVIDENCE_LEVELS = new Set(['A', 'B', 'C', 'X']);

const references = JSON.parse(await readFile(referencesPath, 'utf8'));
if (!Array.isArray(references)) {
  throw new Error('src/data/references.json must be an array.');
}

const hotlines = JSON.parse(await readFile(hotlinesPath, 'utf8'));
if (!Array.isArray(hotlines)) {
  throw new Error('src/data/hotlines.json must be an array.');
}

const referenceIds = new Set();
for (const reference of references) {
  if (!reference || typeof reference !== 'object') {
    errors.push('Each reference entry must be an object.');
    continue;
  }

  const { id, authors, year, title } = reference;

  if (typeof id !== 'string' || id.length === 0) {
    errors.push('Each reference entry must include a non-empty string id.');
    continue;
  }

  if (referenceIds.has(id)) {
    errors.push(`Duplicate reference id found in references.json: ${id}`);
  }
  referenceIds.add(id);

  if (typeof authors !== 'string' || authors.length === 0) {
    errors.push(`Reference "${id}" is missing a non-empty authors field.`);
  }
  if (!Number.isInteger(year)) {
    errors.push(`Reference "${id}" is missing an integer year.`);
  }
  if (typeof title !== 'string' || title.length === 0) {
    errors.push(`Reference "${id}" is missing a non-empty title field.`);
  }
  if (!VALID_EVIDENCE_LEVELS.has(reference.evidenceLevel)) {
    errors.push(`Reference "${id}" must declare evidenceLevel as one of A | B | C | X (got: ${JSON.stringify(reference.evidenceLevel)}). See docs/ai-cto/DECISIONS.md D015.`);
  }
}

const hotlineIds = new Set();
for (const hotline of hotlines) {
  if (!hotline || typeof hotline !== 'object') {
    errors.push('Each hotline entry must be an object.');
    continue;
  }

  const { id, label, name, number, href, scope, hours, verificationLevel, lastVerified, sourceTitle, sourceUrl } = hotline;

  if (typeof id !== 'string' || id.length === 0) {
    errors.push('Each hotline entry must include a non-empty string id.');
    continue;
  }

  if (hotlineIds.has(id)) {
    errors.push(`Duplicate hotline id found in hotlines.json: ${id}`);
  }
  hotlineIds.add(id);

  for (const [fieldName, value] of Object.entries({ label, name, number, href, scope, hours, verificationLevel, lastVerified, sourceTitle, sourceUrl })) {
    if (typeof value !== 'string' || value.length === 0) {
      errors.push(`Hotline "${id}" is missing a non-empty ${fieldName} field.`);
    }
  }

  if (typeof href === 'string' && !href.startsWith('tel:')) {
    errors.push(`Hotline "${id}" href must start with tel:.`);
  }

  if (typeof sourceUrl === 'string' && !/^https?:\/\//.test(sourceUrl)) {
    errors.push(`Hotline "${id}" sourceUrl must be an absolute http(s) URL.`);
  }

  if (typeof lastVerified === 'string') {
    const verifiedDate = new Date(lastVerified);
    if (Number.isNaN(verifiedDate.getTime())) {
      errors.push(`Hotline "${id}" lastVerified must be a valid date string.`);
    } else {
      const ageDays = (Date.now() - verifiedDate.getTime()) / (1000 * 60 * 60 * 24);
      if (ageDays > 365) {
        errors.push(`Hotline "${id}" lastVerified is older than 365 days and must be re-checked.`);
      }
    }
  }
}

async function collectFiles(dir, matcher) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectFiles(fullPath, matcher)));
    } else if (matcher(fullPath)) {
      files.push(fullPath);
    }
  }

  return files;
}

function parseFrontmatterMetadata(filePath, content, opts = {}) {
  const { requireFrontmatter = true, requireReferences = true, requireEvidenceLevel = true } = opts;
  const sinkFor = (required) => (required ? errors : warnings);

  const frontmatterMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!frontmatterMatch) {
    sinkFor(requireFrontmatter).push(`${path.relative(rootDir, filePath)} is missing frontmatter.`);
    return { evidenceLevel: null, references: [] };
  }

  const evidenceLevelMatch = frontmatterMatch[1].match(/(?:^|\r?\n)evidenceLevel:\s*([A-Z])\s*(?:\r?\n|$)/);
  if (!evidenceLevelMatch) {
    sinkFor(requireEvidenceLevel).push(`${path.relative(rootDir, filePath)} is missing evidenceLevel in frontmatter.`);
  }

  const referencesMatch = frontmatterMatch[1].match(/(?:^|\r?\n)references:\s*\[(.*?)\]\s*(?:\r?\n|$)/);
  if (!referencesMatch) {
    sinkFor(requireReferences).push(`${path.relative(rootDir, filePath)} is missing a references array in frontmatter.`);
    return {
      evidenceLevel: evidenceLevelMatch?.[1] ?? null,
      references: [],
    };
  }

  const ids = referencesMatch[1]
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);

  for (const id of ids) {
    if (!referenceIds.has(id)) {
      errors.push(`${path.relative(rootDir, filePath)} frontmatter references unknown id "${id}".`);
    }
  }

  return {
    evidenceLevel: evidenceLevelMatch?.[1] ?? null,
    references: ids,
  };
}

function parseCitationIds(content) {
  const citationIds = [];
  const citationPattern = /CitationRef\s+[^>]*id="([^"]+)"/g;

  for (const match of content.matchAll(citationPattern)) {
    citationIds.push(match[1]);
  }

  return [...new Set(citationIds)];
}

// ── MDX inventory ──
// Docs ('src/content/docs/**/*.mdx') is governed by hard errors.
// Blog ('src/content/blog/**/*.mdx') is governed by hard errors for unknown
// CitationRef ids but warn-only for missing evidenceLevel / references /
// CitationRef presence — D016 staged rollout while back-fill is in progress.
const docsMdxFiles = await collectFiles(docsDir, (filePath) => filePath.endsWith('.mdx'));

let blogMdxFiles = [];
try {
  blogMdxFiles = await collectFiles(blogDir, (filePath) => filePath.endsWith('.mdx'));
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}

async function validateMdxFile(filePath, { strict }) {
  const content = await readFile(filePath, 'utf8');
  const { evidenceLevel, references: frontmatterReferences } = parseFrontmatterMetadata(filePath, content, {
    requireFrontmatter: strict,
    requireReferences: strict,
    requireEvidenceLevel: strict,
  });
  const frontmatterReferenceSet = new Set(frontmatterReferences);
  const citationIds = parseCitationIds(content);
  const sink = strict ? errors : warnings;

  if (evidenceLevel && evidenceLevel !== 'X' && frontmatterReferences.length === 0) {
    sink.push(
      `${path.relative(rootDir, filePath)} has evidenceLevel "${evidenceLevel}" but does not declare any frontmatter references.`
    );
  }

  if (evidenceLevel && evidenceLevel !== 'X' && citationIds.length === 0) {
    sink.push(
      `${path.relative(rootDir, filePath)} has evidenceLevel "${evidenceLevel}" but does not include any CitationRef usage.`
    );
  }

  for (const citationId of citationIds) {
    if (!referenceIds.has(citationId)) {
      errors.push(`${path.relative(rootDir, filePath)} uses unknown CitationRef id "${citationId}".`);
    }
    if (frontmatterReferences.length > 0 && !frontmatterReferenceSet.has(citationId)) {
      sink.push(
        `${path.relative(rootDir, filePath)} uses CitationRef id "${citationId}" but does not list it in frontmatter references.`
      );
    }
  }
}

for (const filePath of docsMdxFiles) {
  await validateMdxFile(filePath, { strict: true });
}
for (const filePath of blogMdxFiles) {
  await validateMdxFile(filePath, { strict: false });
}

const mdxFiles = [...docsMdxFiles, ...blogMdxFiles];

// ── Content freshness check (warn, not fail) ──
const FRESHNESS_DAYS = 90;
const now = new Date();
const stalePages = [];

for (const filePath of mdxFiles) {
  const content = await readFile(filePath, 'utf8');
  const lastReviewedMatch = content.match(/lastReviewed:\s*(\d{4}-\d{2}-\d{2})/);
  if (lastReviewedMatch) {
    const reviewDate = new Date(lastReviewedMatch[1]);
    const daysSince = Math.floor((now - reviewDate) / (1000 * 60 * 60 * 24));
    if (daysSince > FRESHNESS_DAYS) {
      stalePages.push({ file: path.relative(rootDir, filePath), lastReviewed: lastReviewedMatch[1], daysSince });
    }
  }
}

if (stalePages.length > 0) {
  console.warn(`\nContent freshness warning: ${stalePages.length} page(s) not reviewed in ${FRESHNESS_DAYS}+ days:\n`);
  for (const { file, lastReviewed, daysSince } of stalePages) {
    console.warn(`  ⚠ ${file} — last reviewed ${lastReviewed} (${daysSince} days ago)`);
  }
  console.warn('');
}

if (warnings.length > 0) {
  console.warn(`\nContent validation warnings (non-blocking): ${warnings.length}\n`);
  for (const warning of warnings) {
    console.warn(`- ${warning}`);
  }
  console.warn('');
}

if (errors.length > 0) {
  console.error('Content validation failed:\n');
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log(`Content validation passed${warnings.length > 0 ? ` (with ${warnings.length} warnings)` : ''}.`);
