#!/usr/bin/env node
/**
 * V4a：量化「经我们的管线后，数字还剩多少**真实**细节」。
 *
 * ## 这个脚本要证伪的一个具体推理
 *
 * R7 定 2400px 长边的依据是：整页 A4 达 205 ppi → 数字高 16.2px → 过 Textract
 * 公布的 15px 下限。**但那是按理想满幅算的。**
 *
 * 真实链条是：用户手持拍摄的**有效**分辨率可能只有 ~1400px（暗光+手抖+微信转发），
 * 我们的管线再把它 resize 到 2400px。像素高度确实变成 16px 了 ——
 * **但那 16px 是插值出来的，真实信息只有 ~9px。**
 *
 * 上采样不增加信息。用「resize 后的像素高度」去对 15px 门槛，是**拿放大后的
 * 数字去满足一个关于真实细节的阈值** —— 与本仓库反复出现的「空转的检查」同形。
 *
 * 因此本脚本同时测两个量：
 *   ① 数字**像素高度**（管线后）—— R7 原本对标的量
 *   ② 数字区**高频能量**（拉普拉斯方差）—— 真实细节的代理量，插值放大不会提升
 *
 * ② 相对 clean 档的衰减比，才是「信息还剩多少」的诚实指标。
 *
 * 用法：node scripts/measure-lab-legibility.mjs
 */

import { existsSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DEG_DIR = join(ROOT, 'tests', 'fixtures', 'lab', 'degraded');
const PIPELINE_LONG = 2400; // 对齐 §4.4a 修正后的 R7

const sharp = (
  await import(pathToFileURL(join(ROOT, 'node_modules', 'sharp', 'lib', 'index.js')).href)
).default;

if (!existsSync(DEG_DIR)) {
  console.error('🔴 先跑 node scripts/degrade-lab-fixtures.mjs');
  process.exit(1);
}

/** 拉普拉斯方差 —— 图像清晰度的标准代理量。插值放大**不会**提升它。 */
async function laplacianVar(buf, region) {
  const { data, info } = await sharp(buf)
    .extract(region)
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  let sum = 0, sumSq = 0, n = 0;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      // 4-邻域拉普拉斯核
      const v = -4 * data[i] + data[i - 1] + data[i + 1] + data[i - w] + data[i + w];
      sum += v; sumSq += v * v; n++;
    }
  }
  const mean = sum / n;
  return sumSq / n - mean * mean;
}

/**
 * 数字的像素高度。
 *
 * ⚠️ 这里**不做图像测量**，直接由生成参数解析算出 —— 因为素材是我们自己生成的，
 * 字号是已知量，算出来的是精确值而不是估计值。
 *
 * 初版试图从图像扫描「最长连续含墨行程」，那是**错的**：模糊会让相邻表格行的
 * 墨迹糊在一起连成更长的行程，于是**越模糊测出来越"高"** —— 指标方向反了，
 * 会得出「hard 档数字比 clean 档大 4 倍」这种荒谬结论。（2026-07-30 修）
 *
 * gen-lab-fixtures.mjs 里数值字号 = px(21)，px(v) = round(v * W / 827)。
 * 数字的**字面高度**（cap height）约为字号的 0.70。
 */
function digitHeightPx(imgWidth) {
  const fontPx = Math.round(21 * (imgWidth / 827));
  return Math.round(fontPx * 0.70);
}

const files = readdirSync(DEG_DIR).filter((f) => f.startsWith('IMG-1.'));
if (files.length === 0) {
  console.error('🔴 degraded/ 里没有 IMG-1.* —— 先跑降质脚本');
  process.exit(1);
}

console.log('V4a · 管线后真实细节量测（素材 IMG-1，数值列区域）\n');
console.log('管线 = resize 到长边 2400px + JPEG q92（对齐 exportRedacted 参数）\n');

const rows = [];
for (const f of files.sort()) {
  const level = f.replace('IMG-1.', '').replace('.jpg', '');
  const src = join(DEG_DIR, f);
  const m0 = await sharp(src).metadata();

  // 过我们的管线：长边 2400 + JPEG
  const scale = PIPELINE_LONG / Math.max(m0.width, m0.height);
  const piped = await sharp(src)
    .resize({
      width: Math.round(m0.width * scale),
      height: Math.round(m0.height * scale),
      fit: 'fill',
      kernel: 'lanczos3',
    })
    .jpeg({ quality: 92 })
    .toBuffer();
  const m1 = await sharp(piped).metadata();

  // 数值列区域（IMG-1 版式：结果列约在 x 25–45%，表格行约在 y 33–43%）
  const reg = (mm) => ({
    left: Math.round(mm.width * 0.25),
    top: Math.round(mm.height * 0.33),
    width: Math.round(mm.width * 0.20),
    height: Math.round(mm.height * 0.10),
  });

  rows.push({
    level,
    capture: `${m0.width}×${m0.height}`,
    piped: `${m1.width}×${m1.height}`,
    hPost: digitHeightPx(m1.width),
    lapPost: await laplacianVar(piped, reg(m1)),
  });
}

const order = ['clean', 'typical', 'hard'];
const base = rows.find((r) => r.level === 'clean');
console.log('档位      拍摄分辨率     管线后        数字高   过15px线   高频能量   信息保留');
console.log('─'.repeat(84));
for (const r of rows.sort((a, b) => order.indexOf(a.level) - order.indexOf(b.level))) {
  const keep = base ? ((r.lapPost / base.lapPost) * 100).toFixed(0) + '%' : '—';
  console.log(
    `${r.level.padEnd(9)} ${r.capture.padEnd(14)} ${r.piped.padEnd(13)} `
    + `${String(r.hPost).padStart(4)} px  ${(r.hPost >= 15 ? '✅ 过' : '🔴 不过').padEnd(9)} `
    + `${r.lapPost.toFixed(0).padStart(6)}    ${keep.padStart(5)}`,
  );
}

console.log(`
读法 —— 这两列指向完全相反的结论，这正是重点：

  · 「数字高」三档**全部过** 15px 线，因为管线统一输出 2400px 长边，
    数字的**像素**高度只由输出尺寸决定，与拍摄质量无关。
  · 「信息保留」三档从 100% 掉到 ${rows.find((r) => r.level === 'hard')
    ? ((rows.find((r) => r.level === 'hard').lapPost / base.lapPost) * 100).toFixed(0) + '%'
    : '—'}。上采样把数字拉大了，但没有把细节拉回来。

→ **R7 用「resize 后的像素高度」对标 15px 门槛，是在拿放大后的数字去满足一个
   关于真实细节的阈值。** 该门槛只有在「拍摄本身足够清晰」的前提下才有意义，
   而那个前提没被任何东西保证。

→ 真正的约束不在输出分辨率（2400px 绰绰有余），在**拍摄质量**。
   产品侧的应对是提示用户重拍，不是调大导出尺寸 —— 后者只会让文件更大而信息不变。`);
