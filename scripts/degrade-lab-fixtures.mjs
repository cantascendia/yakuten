#!/usr/bin/env node
/**
 * 把合成化验单降质成「手机拍纸」的样子 —— V4 分辨率精度实测的素材前提。
 *
 * ## 为什么不用网上找来的真实化验单
 *
 * 1. **论坛/图片搜索里的化验单是真人的病历**，多数是当事人没意识到会被抓取的情况下
 *    发出来的。为了验证「防止化验单泄漏」的功能而先去抓一批别人的化验单，
 *    并把它们发给 Google / OpenAI —— 正是这个功能存在的理由本身。不做。
 * 2. **`xuewenyuan/OCR-for-Medical-Laboratory-Reports`（238 张中文化验单，
 *    扫描仪+手机、多种光照）无许可证** —— 无许可证 = 默认保留全部权利，不能用。
 * 3. **MedRepBench 可以用**（CC BY-NC 4.0，OCR 检出 PII 后像素涂黑 + 1925 张人工
 *    逐张复检）。但它**不是本测试的最优解**，理由见下。
 *
 * ## 为什么降质合成图反而是更好的实验设计
 *
 * V4 问的是「2400px 长边够不够让模型读准数值」。要回答它，必须有**精确真值**
 * 逐项比对（读成 6.4 还是 6.1，差一位就是危险高钾变正常）。
 *
 * - 合成图的真值是**我生成的**，逐字符确定
 * - 真实数据集要依赖它自带的标注，且图片已经历过一轮采集+压缩，
 *   再进我们的管线就是**叠加降质**，测出来的是两条管线的合成效果，不是我们的
 *
 * 合成图原本的缺陷不是「不真实」，是**太干净** —— SVG 渲染的字比任何手机拍的都
 * 锐利，直接拿去测会得出**偏乐观**的结论。本脚本就是补这个缺口。
 *
 * ⚠️ 因此本测试的定位是**下界验证**：合成降质覆盖不到真实世界降质的完整分布
 * （尤其是国产廉价热敏打印的墨点扩散、以及各家医院版式差异）。
 * **V11 真机 + 真实照片仍是最终检查**，由 owner 执行。
 *
 * 用法：
 *   node scripts/degrade-lab-fixtures.mjs             # 全部用例 × 全部档位
 *   node scripts/degrade-lab-fixtures.mjs --case IMG-1
 *   node scripts/degrade-lab-fixtures.mjs --level hard
 */

import { mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC_DIR = join(ROOT, 'tests', 'fixtures', 'lab');
const OUT_DIR = join(SRC_DIR, 'degraded');

const argv = process.argv.slice(2);
const argOf = (n, d) => {
  const i = argv.indexOf(`--${n}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
};
const ONLY_CASE = argOf('case', '');
const ONLY_LEVEL = argOf('level', '');

const sharp = (
  await import(pathToFileURL(join(ROOT, 'node_modules', 'sharp', 'lib', 'index.js')).href)
).default;

/* ── 降质档位 ──────────────────────────────────────────────────────────────
   参数取值对应真实拍摄条件，不是随手填的：
   - captureLong：用户手持拍摄的实际有效分辨率。12MP 手机拍 A4 纸，纸只占画面
     一部分，且手抖 + 对焦不实，有效分辨率远低于标称。
   - blur：手持 1/30s 的轻微运动模糊 + 镜头 MTF 衰减。
   - rotate：手持拍纸几乎不可能正，±1.5° 是常见量。
   - jpegQ：手机相机出片质量（多数厂商 90–95），低端机或微信转发后更低。
   - noise：暗光下 ISO 提升带来的亮度噪声。 */
const LEVELS = [
  {
    id: 'clean',
    why: '扫描仪 / 光线充足 + 稳定手持 —— 上界参照',
    captureLong: 2400, blur: 0.3, rotate: 0.4, jpegQ: 95, noise: 2, vignette: 0.10,
  },
  {
    id: 'typical',
    why: '室内灯光手持拍摄 —— 最接近真实用户的档位',
    captureLong: 1800, blur: 0.8, rotate: 1.2, jpegQ: 88, noise: 5, vignette: 0.22,
  },
  {
    id: 'hard',
    why: '暗光 / 手抖 / 微信转发压过一次 —— 下界压力测试',
    captureLong: 1400, blur: 1.4, rotate: 2.2, jpegQ: 72, noise: 9, vignette: 0.34,
  },
];

/** 生成不均匀光照遮罩（模拟房间顶灯 + 纸面反光造成的亮度梯度 + 四角压暗）。 */
function vignetteSvg(w, h, strength) {
  const a = Math.round(strength * 255);
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
      <defs>
        <radialGradient id="v" cx="42%" cy="38%" r="78%">
          <stop offset="55%" stop-color="rgb(0,0,0)" stop-opacity="0"/>
          <stop offset="100%" stop-color="rgb(0,0,0)" stop-opacity="${(a / 255).toFixed(3)}"/>
        </radialGradient>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="0.35">
          <stop offset="0%" stop-color="rgb(255,255,255)" stop-opacity="${(strength * 0.45).toFixed(3)}"/>
          <stop offset="60%" stop-color="rgb(255,255,255)" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <rect width="${w}" height="${h}" fill="url(#v)"/>
      <rect width="${w}" height="${h}" fill="url(#g)"/>
    </svg>`,
  );
}

async function degrade(srcPath, level) {
  const base = sharp(srcPath);
  const meta = await base.metadata();
  const scale = level.captureLong / Math.max(meta.width, meta.height);

  // ① 降到「实际拍摄有效分辨率」—— 信息在这一步真正丢失，后面放大也回不来
  let img = base.resize({
    width: Math.round(meta.width * scale),
    height: Math.round(meta.height * scale),
    fit: 'fill',
    kernel: 'lanczos3',
  });

  // ② 手持倾斜（背景填纸白，避免黑边干扰后续裁剪）
  img = img.rotate(level.rotate, { background: { r: 250, g: 250, b: 247 } });

  // ③ 运动模糊 + 镜头 MTF 衰减
  img = img.blur(level.blur);

  const { width: w, height: h } = await img.toBuffer({ resolveWithObject: true }).then((r) => r.info);

  // ④ 不均匀光照
  img = sharp(await img.toBuffer()).composite([
    { input: vignetteSvg(w, h, level.vignette), blend: 'over' },
  ]);

  // ⑤ 传感器噪声（用 sharp 的 noise 生成层叠加，soft-light 保留文字结构）
  const noiseLayer = await sharp({
    create: {
      width: w, height: h, channels: 3,
      noise: { type: 'gaussian', mean: 128, sigma: level.noise * 3 },
    },
  }).png().toBuffer();
  img = sharp(await img.toBuffer()).composite([
    { input: noiseLayer, blend: 'soft-light' },
  ]);

  // ⑥ 相机出片 JPEG 压缩 —— 这一步引入块效应，是后续管线再压缩的输入
  return img.jpeg({ quality: level.jpegQ, chromaSubsampling: '4:2:0' }).toBuffer();
}

/* ── 主流程 ───────────────────────────────────────────────────────────────── */
let sources;
try {
  sources = readdirSync(SRC_DIR).filter((f) => /^IMG-\d+\.jpg$/.test(f));
} catch {
  console.error(`🔴 找不到 ${SRC_DIR} —— 先跑 node scripts/gen-lab-fixtures.mjs`);
  process.exit(1);
}
if (sources.length === 0) {
  console.error('🔴 没有 IMG-*.jpg 素材 —— 先跑 node scripts/gen-lab-fixtures.mjs');
  process.exit(1);
}

const cases = ONLY_CASE ? sources.filter((f) => f.startsWith(ONLY_CASE)) : sources;
const levels = ONLY_LEVEL ? LEVELS.filter((l) => l.id === ONLY_LEVEL) : LEVELS;
if (cases.length === 0 || levels.length === 0) {
  console.error('🔴 筛选后无可处理项');
  process.exit(2);
}

mkdirSync(OUT_DIR, { recursive: true });
console.log(`降质 ${cases.length} 个用例 × ${levels.length} 个档位\n`);

for (const level of levels) {
  console.log(`【${level.id}】${level.why}`);
  console.log(
    `   有效分辨率 ${level.captureLong}px · 模糊 ${level.blur} · 倾斜 ${level.rotate}° `
    + `· JPEG q${level.jpegQ} · 噪声 σ${level.noise}`,
  );
  for (const f of cases) {
    const id = f.replace('.jpg', '');
    const buf = await degrade(join(SRC_DIR, f), level);
    const out = join(OUT_DIR, `${id}.${level.id}.jpg`);
    writeFileSync(out, buf);
    const m = await sharp(buf).metadata();
    console.log(`     ${id}  ${m.width}×${m.height}  ${(buf.length / 1024).toFixed(0)} KB`);
  }
  console.log();
}

console.log('这些是 V4 的输入：再经我们的管线（裁剪 → 2400px → JPEG）后送模型读数，');
console.log('与合成时的已知真值逐项比对。真值精确，因此可量化「读错一位」这类致命错误。');
console.log('');
console.log('⚠️ 定位是**下界验证** —— 合成降质覆盖不到真实降质的完整分布');
console.log('   （热敏打印墨点扩散、各院版式差异）。V11 真机+真实照片仍是最终检查。');
