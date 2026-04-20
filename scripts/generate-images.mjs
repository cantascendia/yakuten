#!/usr/bin/env node

/**
 * Batch image generation using Google Nano Banana 2 (Gemini 3.1 Flash Image)
 * Supports text-only generation AND reference-image-based generation (multimodal).
 *
 * Usage:
 *   node scripts/generate-images.mjs                     # Generate all missing
 *   node scripts/generate-images.mjs --force              # Regenerate all
 *   node scripts/generate-images.mjs --id progynova       # Single image by id
 *   node scripts/generate-images.mjs --type drugs         # Only drug images
 *   node scripts/generate-images.mjs --type diagrams      # Only diagram images
 *   node scripts/generate-images.mjs --type og            # Only OG images
 *   node scripts/generate-images.mjs --dry-run            # Preview prompts only
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const MANIFEST_PATH = path.join(__dirname, 'image-manifest.json');
const REFS_DIR = path.join(__dirname, 'refs');

// ─── Config ───
const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
  console.error('错误：请先设置环境变量 GEMINI_API_KEY');
  process.exit(1);
}
const MODEL = 'gemini-3.1-flash-image-preview';
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;
const DELAY_MS = 6000;

// ─── Parse args ───
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const force = args.includes('--force');
const typeIdx = args.indexOf('--type');
const typeFilter = typeIdx !== -1 ? args[typeIdx + 1] : null;
const idIdx = args.indexOf('--id');
const idFilter = idIdx !== -1 ? args[idIdx + 1] : null;

// ─── Load manifest ───
const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'));

// ─── Filter ───
let targets = manifest.images;
if (typeFilter) {
  targets = targets.filter(img => img.type === typeFilter || (typeFilter === 'diagrams' && img.type === 'diagrams-i18n'));
}
if (idFilter) {
  targets = targets.filter(img => img.id.includes(idFilter));
}
if (targets.length === 0) {
  console.error('No images match filters.');
  console.log('Available:', manifest.images.map(i => `${i.id} (${i.type})`).join(', '));
  process.exit(1);
}

// ─── Helpers ───
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const map = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif' };
  return map[ext] || 'image/jpeg';
}

async function generateImage(promptText, refImagePath) {
  const parts = [];

  // If reference image provided, add it first (multimodal)
  if (refImagePath && fs.existsSync(refImagePath)) {
    const imgData = fs.readFileSync(refImagePath);
    parts.push({
      inlineData: {
        mimeType: getMimeType(refImagePath),
        data: imgData.toString('base64')
      }
    });
    console.log(`   📎 ref image: ${path.basename(refImagePath)} (${(imgData.length / 1024).toFixed(0)} KB)`);
  }

  parts.push({ text: `Generate an image: ${promptText}` });

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts }],
      generationConfig: {
        responseModalities: ['IMAGE', 'TEXT'],
        responseMimeType: 'text/plain'
      }
    })
  });

  const data = await res.json();

  if (data.error) {
    throw new Error(`API Error: ${data.error.message}`);
  }

  const responseParts = data.candidates?.[0]?.content?.parts || [];
  for (const part of responseParts) {
    if (part.inlineData) {
      return Buffer.from(part.inlineData.data, 'base64');
    }
  }

  throw new Error('No image data in response');
}

async function saveAsWebP(buffer, outputPath, width, height) {
  try {
    const sharp = (await import('sharp')).default;
    await sharp(buffer)
      .resize(width, height, { fit: 'cover' })
      .webp({ quality: 82 })
      .toFile(outputPath);
    return fs.statSync(outputPath).size;
  } catch (e) {
    const fallback = outputPath.replace('.webp', '.jpg');
    fs.writeFileSync(fallback, buffer);
    console.log(`  ⚠ sharp failed, saved as JPEG: ${fallback}`);
    return buffer.length;
  }
}

async function downloadRef(url, filename) {
  const outPath = path.join(REFS_DIR, filename);
  if (fs.existsSync(outPath)) {
    console.log(`   📁 ref exists: ${filename}`);
    return outPath;
  }

  console.log(`   ⬇ downloading ref: ${url.substring(0, 80)}...`);
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(outPath, buf);
    console.log(`   ✓ saved ref ${filename} (${(buf.length / 1024).toFixed(0)} KB)`);
    return outPath;
  } catch (e) {
    console.error(`   ✗ ref download failed: ${e.message}`);
    return null;
  }
}

// ─── Main ───
async function main() {
  console.log('🎨 Nano Banana 2 Image Generator v2');
  console.log(`   Model: ${MODEL}`);
  console.log(`   Targets: ${targets.length} images`);
  console.log(`   Mode: ${dryRun ? 'DRY RUN' : 'GENERATE'}`);
  console.log('');

  fs.mkdirSync(REFS_DIR, { recursive: true });

  let generated = 0, skipped = 0, failed = 0;

  for (let i = 0; i < targets.length; i++) {
    const img = targets[i];
    let outDir;
    if (img.type === 'diagrams-i18n' && img.subdir) {
      outDir = path.join(ROOT, 'public', 'images', 'diagrams', img.subdir);
    } else if (img.type === 'og') {
      outDir = path.join(ROOT, 'public', 'images', 'og');
    } else {
      outDir = path.join(ROOT, 'public', 'images', img.type);
    }
    fs.mkdirSync(outDir, { recursive: true });
    const outPath = path.join(outDir, img.filename);

    if (fs.existsSync(outPath) && !force) {
      console.log(`⏭  [${i + 1}/${targets.length}] ${img.id} — exists`);
      skipped++;
      continue;
    }

    console.log(`🖼  [${i + 1}/${targets.length}] ${img.id} (${img.type})`);

    // Build prompt
    const prefix = img.stylePrefix || manifest.styleDefaults?.[img.type] || '';
    const fullPrompt = prefix ? `${prefix}, ${img.prompt}` : img.prompt;
    console.log(`   prompt: ${fullPrompt.substring(0, 120)}...`);

    if (dryRun) {
      console.log(`   → DRY RUN`);
      continue;
    }

    // Download reference image if specified
    let refPath = null;
    if (img.refUrl) {
      refPath = await downloadRef(img.refUrl, `ref-${img.id}${path.extname(new URL(img.refUrl).pathname) || '.jpg'}`);
    } else if (img.refFile) {
      // For i18n diagrams, reference the English version in diagrams/en/
      if (img.type === 'diagrams-i18n') {
        refPath = path.join(ROOT, 'public', 'images', 'diagrams', 'en', img.refFile);
      } else {
        refPath = path.join(REFS_DIR, img.refFile);
      }
      if (!fs.existsSync(refPath)) {
        console.log(`   ⚠ ref file not found: ${refPath}, generating without reference`);
        refPath = null;
      }
    }

    try {
      const buf = await generateImage(fullPrompt, refPath);
      const size = await saveAsWebP(buf, outPath, img.width, img.height);
      console.log(`   ✓ ${outPath} (${(size / 1024).toFixed(0)} KB)`);
      generated++;
    } catch (e) {
      console.error(`   ✗ FAILED: ${e.message}`);
      failed++;
    }

    if (i < targets.length - 1) {
      await sleep(DELAY_MS);
    }
  }

  console.log('');
  console.log(`✅ Done! Generated: ${generated}, Skipped: ${skipped}, Failed: ${failed}`);

  // Update og-images.json
  if (!dryRun) {
    const ogImages = manifest.images.filter(i => i.type === 'og');
    const ogMap = {};
    for (const img of ogImages) {
      const ogPath = path.join(ROOT, 'public', 'images', 'og', img.filename);
      if (fs.existsSync(ogPath)) {
        ogMap[img.pageSlug] = `/images/og/${img.filename}`;
      }
    }
    if (Object.keys(ogMap).length > 0) {
      const mapPath = path.join(ROOT, 'src', 'data', 'og-images.json');
      fs.writeFileSync(mapPath, JSON.stringify(ogMap, null, 2));
      console.log(`📝 Updated ${mapPath}`);
    }
  }
}

main().catch(e => {
  console.error('Fatal:', e);
  process.exit(1);
});
