/**
 * runSelfChecks —— 真机自检的执行层（**dev-only**，浏览器内跑，零网络）
 *
 * SPEC: docs/specs/ai-chat-image-input.md §7 表格 V1/V2/V3/V11、§7.2、§7.2a、R7、R7a、T6
 *
 * 为什么需要真机：§7.2a ② 实测确认 Playwright 的 WebKit 是桌面 Linux 构建，**不等于**
 * 真机 iOS Safari（CI 里完全没有真机 Safari 的 canvas 反指纹噪声），更不等于微信内置
 * 浏览器。CI 绿不代表用户手上那台 iPhone 上遮盖真的烧进了像素。所以 V1/V2/V3 必须能
 * 在真机上按同一套判据重跑一遍。
 *
 * 三条纪律：
 *  1. **判据与 fixture 造法都来自 `selfCheckKit`**（与 tests/helpers/redact-fixtures.ts
 *     同一份），不在这里复制第二套。
 *  2. **每条「零命中」型断言都必须先有正向对照**（§7.2a ①：没有正向对照的零命中等于
 *     没有断言）。所以 V1 先证明 fixture 里真有洋红，V2 先证明 fixture 里真有 EXIF。
 *  3. **不发任何网络请求**。本文件只 import 生产管线与纯函数；挂载页额外装了
 *     fetch/XHR/sendBeacon 计数器，最后一条自检就是「计数为 0」。
 */

import {
  analyzeSentinel,
  buildExifApp1,
  buildSentinelRaw,
  EXIF_CANARIES,
  findCanaries,
  GREEN_TOL,
  INSIDE_INSET_PX,
  insertApp1,
  MAGENTA_SCORE_THRESHOLD,
  scanJpegMarkers,
  type Rect,
} from '../selfCheckKit';
import { createRedactedPreview, exportRedacted, isRedactedBlob, REDACT_EXPORT_CONSTANTS } from '../exportRedacted';
import { assertRedactedBlob, buildRedactedUploadBody, canUploadRedactedBlob } from '../uploadGuard';

export type CheckStatus = 'pass' | 'fail' | 'info';

export interface CheckRow {
  id: string;
  title: string;
  status: CheckStatus;
  detail: string;
}

export interface SelfTestReport {
  /** 只看 status==='fail' 有没有；info 行不影响总判定（它们是「记录环境」而非断言） */
  pass: boolean;
  rows: CheckRow[];
}

/** 挂载页在**任何模块加载之前**装好的网络计数器（见 dev 页 inline script） */
export interface NetLog {
  calls: string[];
}

const NET_GLOBAL = '__ykSelfTestNet';

/** 哨兵图尺寸与遮盖框：与 tests/redact-privacy.spec.ts 一致，便于两边数字直接对照 */
const IMG_W = 900;
const IMG_H = 1200;
const MAGENTA: Rect = { x: 0.06, y: 0.06, w: 0.88, h: 0.16 };
const REDACT: Rect = { x: 0.04, y: 0.04, w: 0.92, h: 0.2 };

// ───────────────────────────── 浏览器侧小工具 ─────────────────────────────

function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function release(c: HTMLCanvasElement): void {
  c.width = 0;
  c.height = 0;
}

async function canvasToBlob(c: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  const blob = await new Promise<Blob | null>((resolve) => c.toBlob((b) => resolve(b), type, quality));
  if (!blob) throw new Error(`toBlob 返回 null（${type}）`);
  return blob;
}

/** RGB 像素 → 无损 PNG File（哨兵图必须无损，否则断言的锐利度就没了） */
async function rawToPngFile(raw: Uint8Array, w: number, h: number, name: string): Promise<File> {
  const c = makeCanvas(w, h);
  const ctx = c.getContext('2d', { alpha: false });
  if (!ctx) throw new Error('拿不到 2d context');
  const img = ctx.createImageData(w, h);
  for (let i = 0, j = 0; i < raw.length; i += 3, j += 4) {
    img.data[j] = raw[i]!;
    img.data[j + 1] = raw[i + 1]!;
    img.data[j + 2] = raw[i + 2]!;
    img.data[j + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const blob = await canvasToBlob(c, 'image/png');
  release(c);
  return new File([blob], name, { type: 'image/png' });
}

async function bytesOf(blob: Blob): Promise<Uint8Array> {
  return new Uint8Array(await blob.arrayBuffer());
}

/**
 * Uint8Array → 独立 ArrayBuffer。
 * `new File([u8], …)` 在 TS 5.9 的 lib 里不接受 `Uint8Array<ArrayBufferLike>`
 * （SharedArrayBuffer 也满足 ArrayBufferLike，而 BlobPart 不收它）。拷一份最直白，
 * 也顺手避免「fixture 与调用方共享同一段内存」这种将来会咬人的耦合。
 */
function toBufferPart(u: Uint8Array): ArrayBuffer {
  const ab = new ArrayBuffer(u.byteLength);
  new Uint8Array(ab).set(u);
  return ab;
}

async function sha256(blob: Blob): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer());
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** 解码 blob 并取回 RGBA 像素（导出物的真实字节 → 像素） */
async function decodeToPixels(
  blob: Blob,
): Promise<{ width: number; height: number; data: Uint8ClampedArray }> {
  const bmp = await createImageBitmap(blob);
  const c = makeCanvas(bmp.width, bmp.height);
  const ctx = c.getContext('2d', { alpha: false });
  if (!ctx) throw new Error('拿不到 2d context');
  ctx.drawImage(bmp, 0, 0);
  const out = { width: bmp.width, height: bmp.height, data: ctx.getImageData(0, 0, bmp.width, bmp.height).data };
  bmp.close();
  release(c);
  return out;
}

/**
 * 探测本机 canvas 的实际面积上限（R7a）。
 * 老 iPhone 是 16777216（4096×4096）；超限时 WebKit **静默跳过绘制**，导出一张全黑图。
 * 判据：画一块非黑再读回来 —— 读到黑就说明这个面积上不去。
 */
function probeMaxCanvasArea(): { area: number; label: string } {
  const candidates = [16777216, 33554432, 67108864, 134217728, 268435456];
  let best = 0;
  for (const area of candidates) {
    const side = Math.floor(Math.sqrt(area));
    let c: HTMLCanvasElement | null = null;
    try {
      c = makeCanvas(side, side);
      const ctx = c.getContext('2d', { alpha: false });
      if (!ctx) break;
      ctx.fillStyle = '#00FF00';
      ctx.fillRect(0, 0, side, side);
      const d = ctx.getImageData(Math.floor(side / 2), Math.floor(side / 2), 1, 1).data;
      if (d[1] !== 255) break;
      best = area;
    } catch {
      break;
    } finally {
      if (c) release(c);
    }
  }
  return { area: best, label: best === 0 ? '探测失败' : `${best}（${Math.floor(Math.sqrt(best))}²）` };
}

// ───────────────────────────── 各条自检 ─────────────────────────────

async function checkV1(rows: CheckRow[]): Promise<void> {
  const raw = buildSentinelRaw(IMG_W, IMG_H, MAGENTA);
  const file = await rawToPngFile(raw, IMG_W, IMG_H, 'lab-sheet.png');

  // 正向对照：先证明**进管线前**这张图真的有洋红可遮（§7.2a ①）
  const before = await decodeToPixels(file);
  const beforeStats = analyzeSentinel(before.data, before.width, before.height, REDACT, 0);
  rows.push({
    id: 'v1-control',
    title: 'V1 正向对照：fixture 里确实有洋红可遮',
    status: beforeStats.magentaSurvivors > 10000 ? 'pass' : 'fail',
    detail: `遮盖前洋红像素 ${beforeStats.magentaSurvivors} 个（洋红度峰值 ${beforeStats.maxMagentaScore}）。` +
      '这一行不通过就说明 fixture 坏了，后面的「零洋红」是空断言。',
  });

  const blob = await exportRedacted(file, { redactions: [REDACT] });
  const px = await decodeToPixels(blob);
  const pad = REDACT_EXPORT_CONSTANTS.DEFAULT_PAD_PX;
  const s = analyzeSentinel(px.data, px.width, px.height, REDACT, pad);

  rows.push({
    id: 'v1-a',
    title: `V1 断言 A：遮盖矩形内严格纯黑（内缩 ${INSIDE_INSET_PX}px）`,
    status: s.insideNonBlackStrict === 0 && s.insideMaxChannel === 0 && s.insideMinAlpha === 255 ? 'pass' : 'fail',
    detail: `取样 ${s.insideSamples} 个像素，非纯黑 ${s.insideNonBlackStrict} 个，最大通道值 ${s.insideMaxChannel}，最小 alpha ${s.insideMinAlpha}`,
  });
  rows.push({
    id: 'v1-b',
    title: `V1 断言 B：矩形外零改动（容差 ${GREEN_TOL}）`,
    status: s.outsideBeyondTol === 0 ? 'pass' : 'fail',
    detail: `取样 ${s.outsideSamples} 个像素，超容差 ${s.outsideBeyondTol} 个，最大偏差 ${s.outsideMaxDeviation}`,
  });
  rows.push({
    id: 'v1-c',
    title: 'V1 断言 C：全图零洋红存活 ← 真正的隐私断言',
    status: s.magentaSurvivors === 0 && s.maxMagentaScore < MAGENTA_SCORE_THRESHOLD ? 'pass' : 'fail',
    detail: `存活 ${s.magentaSurvivors} 个，洋红度峰值 ${s.maxMagentaScore}（阈值 ${MAGENTA_SCORE_THRESHOLD}，纯洋红为 +255）` +
      (s.worstPixel ? `，最坏像素 (${s.worstPixel.x},${s.worstPixel.y}) rgb(${s.worstPixel.r},${s.worstPixel.g},${s.worstPixel.b})` : ''),
  });
  rows.push({
    id: 'v1-geom',
    title: 'R7a-2：几何未被 devicePixelRatio 污染',
    status: px.width === IMG_W && px.height === IMG_H ? 'pass' : 'fail',
    detail: `导出 ${px.width}×${px.height}，期望 ${IMG_W}×${IMG_H}（乘了 DPR 会变成 ${IMG_W * devicePixelRatio}×${IMG_H * devicePixelRatio}）`,
  });

  // R7：blob.type 必须是 JPEG。Safari 的 canvas 不能编码 WebP 且 toBlob 静默返回 PNG
  const scan = scanJpegMarkers(await bytesOf(blob));
  rows.push({
    id: 'r7-type',
    title: 'R7：导出 MIME 是 image/jpeg 且容器真是 JPEG',
    status: blob.type === 'image/jpeg' && scan.isJpeg ? 'pass' : 'fail',
    detail: `blob.type=${blob.type || '(空)'}，SOI ${scan.isJpeg ? '正确' : '不是 FFD8'}，${Math.round(blob.size / 1024)} KB，markers=${scan.markers.slice(0, 8).join(',')}`,
  });
}

async function checkWebpProbe(rows: CheckRow[]): Promise<void> {
  // R7 的平台探针：请求 WebP 时本机 canvas 实际给了什么。Safari 会静默返回 PNG。
  const c = makeCanvas(8, 8);
  const ctx = c.getContext('2d', { alpha: false });
  if (ctx) {
    ctx.fillStyle = '#123456';
    ctx.fillRect(0, 0, 8, 8);
  }
  let got = '(toBlob 返回 null)';
  try {
    got = (await canvasToBlob(c, 'image/webp')).type;
  } catch (e) {
    got = `异常：${(e as Error).message}`;
  }
  release(c);
  rows.push({
    id: 'r7-webp-probe',
    title: 'R7 平台探针：请求 WebP 时 canvas 实际编出什么',
    status: 'info',
    detail: `toBlob('image/webp') → ${got}。若不是 image/webp，说明本机不能编 WebP —— 这正是「只有 iPhone 报 413」的成因，导出管线因此写死 JPEG 并校验 blob.type。`,
  });
}

async function checkV2(rows: CheckRow[]): Promise<void> {
  // 造一张 800×600（横）+ Orientation=6 的 JPEG：正确摆正后应是 600×800（竖）
  const w = 800;
  const h = 600;
  const c = makeCanvas(w, h);
  const ctx = c.getContext('2d', { alpha: false });
  if (!ctx) throw new Error('拿不到 2d context');
  // 非均匀内容：避免撞上导出管线的「全黑 → 疑似绘制失败」自检
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, '#283CC8');
  g.addColorStop(1, '#E0B4C8');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  const plain = await canvasToBlob(c, 'image/jpeg', 0.92);
  release(c);

  const withExif = insertApp1(
    await bytesOf(plain),
    buildExifApp1({
      make: 'Apple',
      model: 'iPhone 15 Pro',
      software: 'HUAWEI-nothing-here',
      dateTime: '2026:07:30 12:00:00',
      orientation: 6,
    }),
  );
  const file = new File([toBufferPart(withExif)], 'IMG_20260730_lab.jpg', { type: 'image/jpeg' });

  // ── 正向对照：fixture 里必须真的有 EXIF / 方向 / GPS / canary ──
  const fixScan = scanJpegMarkers(withExif);
  const fixHits = findCanaries(withExif, EXIF_CANARIES);
  const controlOk =
    fixScan.hasExifApp1 &&
    fixScan.exifOrientation === 6 &&
    fixScan.hasGpsIfd &&
    ['iPhone', 'Apple', 'HUAWEI', '2026:'].every((k) => fixHits.includes(k));
  rows.push({
    id: 'v2-control',
    title: 'V2 正向对照：fixture 里确实有 EXIF 可剥',
    status: controlOk ? 'pass' : 'fail',
    detail: `APP1/Exif=${fixScan.hasExifApp1}，Orientation=${fixScan.exifOrientation}，GPS IFD=${fixScan.hasGpsIfd}，canary 命中 [${fixHits.join(', ')}]。` +
      '注意 EXIF 存的是数值 tag，不存 "GPS" 三个字母 —— 所以 GPS 这个 canary 恒不命中，真正起作用的是机型/日期。',
  });

  const blob = await exportRedacted(file, { redactions: [{ x: 0, y: 0, w: 1, h: 0.28 }] });
  const bytes = await bytesOf(blob);
  const scan = scanJpegMarkers(bytes);
  const px = await decodeToPixels(blob);
  const hits = findCanaries(bytes, EXIF_CANARIES);

  rows.push({
    id: 'v2-orientation',
    title: 'V2 方向：Orientation=6 的横向存储像素被摆正为竖向',
    status: px.width === 600 && px.height === 800 ? 'pass' : 'fail',
    detail: `导出 ${px.width}×${px.height}，期望 600×800（存储像素是 800×600 横向）`,
  });
  rows.push({
    id: 'v2-strip',
    title: 'V2 剥离：导出物无 APP1/Exif、无 XMP，canary 零命中',
    status: !scan.hasExifApp1 && !scan.hasXmpApp1 && hits.length === 0 ? 'pass' : 'fail',
    detail: `APP1/Exif=${scan.hasExifApp1}，XMP=${scan.hasXmpApp1}，canary 命中 [${hits.join(', ') || '无'}]，markers=${scan.markers.slice(0, 10).join(',')}`,
  });
  rows.push({
    id: 'v2-icc',
    title: 'R7b：ICC 是 canvas 默认 sRGB（不是 display-p3 广色域指纹）',
    status: scan.hasIcc && !scan.iccText.toLowerCase().includes('p3') ? 'pass' : 'fail',
    detail: `ICC=${scan.hasIcc}，描述「${scan.iccText.slice(0, 60) || '(读不到)'}」`,
  });
}

async function checkV3(rows: CheckRow[]): Promise<void> {
  const raw = buildSentinelRaw(600, 800, MAGENTA);
  const mk = () => rawToPngFile(raw, 600, 800, 'lab.png');
  const opts = { redactions: [REDACT] };

  const sendBlob = await exportRedacted(await mk(), opts);
  const preview = createRedactedPreview(sendBlob);
  const sameInstance = preview.blob === sendBlob;
  const previewHash = await sha256(preview.blob);
  const sendHash = await sha256(sendBlob);
  const isObjectUrl = preview.url.startsWith('blob:');
  preview.revoke();

  const again = await exportRedacted(await mk(), opts);
  const againHash = await sha256(again);

  rows.push({
    id: 'v3-identity',
    title: 'V3：预览字节 === 上传字节（同一个 Blob 实例）',
    status: sameInstance && previewHash === sendHash && isObjectUrl ? 'pass' : 'fail',
    detail: `同实例=${sameInstance}，sha256 ${previewHash.slice(0, 16)}… vs ${sendHash.slice(0, 16)}…，预览 URL 是 blob: 协议=${isObjectUrl}`,
  });
  rows.push({
    id: 'v3-deterministic',
    title: 'V3：同一编辑状态两次导出字节相同（预览可代表实发）',
    status: againHash === sendHash ? 'pass' : 'fail',
    detail: `第二次 sha256 ${againHash.slice(0, 16)}…（${again.size} 字节 vs ${sendBlob.size} 字节）`,
  });

  // R1a：上传准入。原图（File）与无 brand 的 blob 必须一律被拒。
  const original = await mk();
  const forged = new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xd9])], { type: 'image/jpeg' });
  const err = (fn: () => unknown): string => {
    try {
      fn();
      return '(没有抛错)';
    } catch (e) {
      return (e as Error).message;
    }
  };
  const fileErr = err(() => assertRedactedBlob(original));
  const forgedErr = err(() => assertRedactedBlob(forged));
  const name = (buildRedactedUploadBody(sendBlob, { endpoint: '/dev/never-sent' }).get('image') as File).name;
  rows.push({
    id: 'r1a-guard',
    title: 'R1a：原图没有第二条出路（拒 File / 拒无 brand / 文件名固定）',
    status:
      isRedactedBlob(sendBlob) &&
      canUploadRedactedBlob(sendBlob) &&
      fileErr.includes('不接受 File') &&
      forgedErr.includes('无 brand') &&
      name === 'redacted.jpg'
        ? 'pass'
        : 'fail',
    detail: `brand=${isRedactedBlob(sendBlob)}，拒 File：「${fileErr}」，拒伪造：「${forgedErr}」，multipart 文件名=${name}`,
  });
}

async function checkCanvasArea(rows: CheckRow[]): Promise<void> {
  const probe = probeMaxCanvasArea();
  const cap = REDACT_EXPORT_CONSTANTS.MAX_CANVAS_AREA_PX;
  rows.push({
    id: 'r7a-probe',
    title: 'R7a：本机 canvas 面积上限 ≥ 管线写死的保守值',
    status: probe.area >= cap ? 'pass' : 'fail',
    detail: `实测上限 ${probe.label}；管线按旧 iOS 值 ${cap}（4096²）设计。实测值更小 = 本机会静默导出全黑图，必须调低管线上限。`,
  });

  // 12MP 大图（4000×3000，典型手机照片）：验降采样与「非全黑」
  const w = 4000;
  const h = 3000;
  let file: File;
  try {
    const c = makeCanvas(w, h);
    const ctx = c.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('拿不到 2d context');
    // 用条纹而不是逐像素 putImageData：12MP 的 ImageData 要 48 MB，老机器直接挂
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = i % 2 === 0 ? '#1E5AA8' : '#E6C34A';
      ctx.fillRect(0, (h / 40) * i, w, h / 40);
    }
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, w, 300);
    const blob = await canvasToBlob(c, 'image/jpeg', 0.9);
    release(c);
    file = new File([blob], 'big.jpg', { type: 'image/jpeg' });
  } catch (e) {
    rows.push({
      id: 'r7a-big',
      title: 'R7a：12MP 大图导出（降尺寸 / 非全黑）',
      status: 'info',
      detail: `本机造不出 4000×3000 的 fixture（${(e as Error).message}）—— 这本身就是一条真机情报：该机型连 12MP canvas 都开不出来。`,
    });
    return;
  }

  const out = await exportRedacted(file, { redactions: [{ x: 0, y: 0, w: 1, h: 0.1 }] });
  const px = await decodeToPixels(out);
  // 采 9 点判「是否全黑」——与管线的 looksBlank 同一思路
  let nonBlack = 0;
  for (const y of [1, Math.floor(px.height / 2), px.height - 2]) {
    for (const x of [1, Math.floor(px.width / 2), px.width - 2]) {
      const i = (y * px.width + x) * 4;
      if (px.data[i] !== 0 || px.data[i + 1] !== 0 || px.data[i + 2] !== 0) nonBlack++;
    }
  }
  const expectLong = Math.min(4000, REDACT_EXPORT_CONSTANTS.DEFAULT_MAX_LONG_EDGE);
  const actualLong = Math.max(px.width, px.height);
  rows.push({
    id: 'r7a-big',
    title: 'R7a：12MP 大图导出后既没全黑、也没超面积上限',
    status: nonBlack > 0 && px.width * px.height <= cap ? 'pass' : 'fail',
    detail:
      `源 4000×3000 → 导出 ${px.width}×${px.height}（${Math.round(out.size / 1024)} KB），面积 ${px.width * px.height} ≤ ${cap}；` +
      `9 点采样非黑 ${nonBlack}/9；长边期望 ${expectLong}，实得 ${actualLong} → ` +
      (actualLong < expectLong - 1 ? '**触发过降尺寸重试**（管线检测到全黑并减半）' : '未触发降尺寸重试'),
  });
}

function checkNetwork(rows: CheckRow[]): void {
  const log = (window as unknown as Record<string, NetLog | undefined>)[NET_GLOBAL];
  if (!log) {
    rows.push({
      id: 'net',
      title: 'R4：全程零网络请求',
      status: 'fail',
      detail: '挂载页没有装网络计数器 —— 这条自检本身失效了（不能当成通过）',
    });
    return;
  }
  // 只判「字节有没有离开设备」：blob: 是本机内存读取，不出设备
  const remote = log.calls.filter((u) => /^(https?|wss?):/.test(u) || u.startsWith('//') || u.startsWith('/'));
  rows.push({
    id: 'net',
    title: 'R4：fetch / XHR / sendBeacon 全程零远端调用',
    status: remote.length === 0 ? 'pass' : 'fail',
    detail:
      `远端调用 ${remote.length} 次${remote.length ? `：${remote.slice(0, 3).join(' / ')}` : ''}；` +
      `本机 blob: 读取 ${log.calls.length - remote.length} 次（不出设备）。` +
      '注意：dev 服务器自己的模块加载与热更新不经这三个 API，不计入。',
  });
}

// ───────────────────────────── 对外入口 ─────────────────────────────

/** 环境信息（存档用，不参与判定） */
export function collectEnv(): CheckRow[] {
  const probe = probeMaxCanvasArea();
  return [
    { id: 'env-ua', title: 'User-Agent', status: 'info', detail: navigator.userAgent },
    {
      id: 'env-dpr',
      title: 'devicePixelRatio / 视口',
      status: 'info',
      detail: `DPR=${devicePixelRatio}，视口 ${innerWidth}×${innerHeight}，屏幕 ${screen.width}×${screen.height}`,
    },
    { id: 'env-area', title: 'canvas 面积上限（实测）', status: 'info', detail: probe.label },
    {
      id: 'env-pipeline',
      title: '管线常量',
      status: 'info',
      detail: `长边上限 ${REDACT_EXPORT_CONSTANTS.DEFAULT_MAX_LONG_EDGE}，字节预算 ${Math.round(REDACT_EXPORT_CONSTANTS.DEFAULT_MAX_BYTES / 1024 / 1024)} MB，外扩 ${REDACT_EXPORT_CONSTANTS.DEFAULT_PAD_PX}px，质量阶梯 ${REDACT_EXPORT_CONSTANTS.QUALITY_LADDER.join('/')}`,
    },
  ];
}

/** 跑完全部自检。任何一条 fail → 总判定 fail。抛错也算 fail（记成一行）。 */
export async function runSelfChecks(): Promise<SelfTestReport> {
  const rows: CheckRow[] = [];
  const steps: [string, (r: CheckRow[]) => Promise<void> | void][] = [
    ['V1', checkV1],
    ['R7 WebP 探针', checkWebpProbe],
    ['V2', checkV2],
    ['V3', checkV3],
    ['R7a', checkCanvasArea],
    ['R4', checkNetwork],
  ];
  for (const [name, fn] of steps) {
    try {
      await fn(rows);
    } catch (e) {
      rows.push({
        id: `crash-${name}`,
        title: `${name} 自检崩了`,
        status: 'fail',
        detail: `${(e as Error).name}: ${(e as Error).message}`,
      });
    }
  }
  return { pass: rows.every((r) => r.status !== 'fail'), rows };
}

/**
 * T6 / V11：用户从相册选一张**真实照片**（可能是 HEIC）。
 * 无公开数据能回答「iOS Safari 的 accept="image/*" 会不会自动转 JPEG」，只能真机取证。
 */
export async function runPhotoCheck(file: File): Promise<CheckRow[]> {
  const rows: CheckRow[] = [];
  const bytes = await bytesOf(file);
  const inScan = scanJpegMarkers(bytes);
  const inHits = findCanaries(bytes, EXIF_CANARIES);
  rows.push({
    id: 'photo-input',
    title: 'T6：相册给到网页的原始文件是什么',
    status: 'info',
    detail:
      `name=${file.name}，type=${file.type || '(空)'}，${Math.round(file.size / 1024)} KB；` +
      `JPEG 容器=${inScan.isJpeg}${inScan.isJpeg ? `，APP1/Exif=${inScan.hasExifApp1}，Orientation=${inScan.exifOrientation}，GPS IFD=${inScan.hasGpsIfd}，canary [${inHits.join(', ') || '无'}]` : '（非 JPEG，JPEG 扫描器读不了它 —— 若 type 是 image/heic 说明系统**没有**自动转码）'}`,
  });

  let bmp: ImageBitmap;
  try {
    bmp = await createImageBitmap(file);
  } catch (e) {
    rows.push({
      id: 'photo-decode',
      title: 'T6：createImageBitmap 能否解码这张照片',
      status: 'fail',
      detail: `解码失败：${(e as Error).message} —— 该格式在本机走不通导出管线，UI 必须报错而不是静默失败`,
    });
    return rows;
  }
  const dims = `${bmp.width}×${bmp.height}`;
  bmp.close();

  const out = await exportRedacted(file, { redactions: [{ x: 0, y: 0, w: 1, h: 0.3 }] });
  const outBytes = await bytesOf(out);
  const outScan = scanJpegMarkers(outBytes);
  const outHits = findCanaries(outBytes, EXIF_CANARIES);
  const px = await decodeToPixels(out);
  let blackRows = 0;
  for (let y = 0; y < Math.min(px.height, Math.floor(px.height * 0.25)); y++) {
    const i = (y * px.width + Math.floor(px.width / 2)) * 4;
    if (px.data[i] === 0 && px.data[i + 1] === 0 && px.data[i + 2] === 0) blackRows++;
  }

  rows.push({
    id: 'photo-export',
    title: 'T6：真实照片走完导出管线',
    status: out.type === 'image/jpeg' && !outScan.hasExifApp1 && outHits.length === 0 && blackRows > 10 ? 'pass' : 'fail',
    detail:
      `解码后 ${dims} → 导出 ${px.width}×${px.height}（${Math.round(out.size / 1024)} KB，${out.type}）；` +
      `EXIF 剥离=${!outScan.hasExifApp1}，canary [${outHits.join(', ') || '无'}]；顶部 25% 中线纯黑行 ${blackRows} 行（遮盖已烧进像素）`,
  });
  return rows;
}
