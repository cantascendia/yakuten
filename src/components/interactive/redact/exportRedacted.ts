/**
 * exportRedacted —— 客户端遮盖导出管线（纯 TS，无 UI，无网络）
 *
 * SPEC: docs/specs/ai-chat-image-input.md
 *   R1  遮盖烧进像素（含六个陷阱）／R1a 原图无第二条出路
 *   R2  导出源只走 createImageBitmap，EXIF 靠重编码剥离
 *   R7  长边 2400 / JPEG / 自适应质量 / 校验 blob.type
 *   R7a iOS canvas 面积上限（静默全黑）
 *   R7b 不传 colorSpace
 *   §7.2 运行时不变量：违反即 throw，不返回 blob
 *
 * 本模块是隐私红线所在，且是唯一能被自动化守住的部分。UI 可以迭代，管线不能出错。
 * 对应的硬门控：tests/redact-privacy.spec.ts（V1/V2/V3）+ scripts/verify-redact-invariants.sh
 *
 * ⚠️ 坐标约定（刻意选择，见下）
 * 所有矩形（crop / redactions）的 x/y/w/h 都是 **已摆正图像的归一化比例 [0,1]**，
 * 不是 CSS 像素、不是 bitmap 像素。理由是 R1 陷阱 4（「黑框坐标在 CSS 显示像素空间
 * 算出，却画到原分辨率 canvas 上」）的根因是**存在两个像素空间可供混用**；
 * 归一化坐标把这个混用机会从 API 上删除。落到像素时一律乘 `bitmap.width/height`
 * （R2 要求的基准），绝不碰 naturalWidth / devicePixelRatio。
 */

/** 归一化矩形：x/y/w/h ∈ [0,1]，相对**已摆正**的源图。绝不是 CSS px。 */
export interface RedactRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ExportOptions {
  /** 裁剪区（归一化）。省略 = 全图。R7：裁剪是正确性前提，不是 UX 优化 */
  crop?: RedactRect;
  /** 遮盖区（归一化）。可为空数组，但 UI 侧必须默认预置一个（§3.1 / R6a） */
  redactions: RedactRect[];
  /** 输出长边上限，默认 2400（§4.4a 修正：Gemini 图像 token 与面积无关，2000 偏保守） */
  maxLongEdge?: number;
  /** 字节预算，默认 3 MB（§4.3）。超预算只降质量不降分辨率；降到底仍超 → throw */
  maxBytes?: number;
  /** 黑框四周外扩像素，默认 6（R1 陷阱 5 要求 4–8） */
  padPx?: number;
}

/**
 * canvas 面积上限：按**旧 iOS 值**保守设计（R7a）。
 * WebKit CanvasBase.cpp 2024-03 前为 16777216（4096×4096），未升级系统的老 iPhone
 * 仍是旧值。源码注释：「The maximum canvas size is in device pixels.」
 * → 绝不乘 devicePixelRatio；乘了会静默导出全黑图。
 */
const MAX_CANVAS_AREA_PX = 16777216;

/** R7：q=0.92 起，超预算按此阶梯降质量，绝不降分辨率 */
const QUALITY_LADDER = [0.92, 0.9, 0.86, 0.82] as const;

/** §4.4a：Gemini 侧降采样零收益，上限改由请求体与 canvas 面积决定 → 2400（不是 2000） */
const DEFAULT_MAX_LONG_EDGE = 2400;

/** §4.3：二进制大小上限 3 MB（超过端点即 400，不进降级链） */
const DEFAULT_MAX_BYTES = 3 * 1024 * 1024;

/** R1 陷阱 5：贴边太紧 + JPEG 有损压缩会有边缘振铃 → 四周外扩 4–8 px */
const DEFAULT_PAD_PX = 6;

/** 唯一允许的输出 MIME。R7：Safari 的 canvas 不能编码 WebP，且 toBlob 静默返回 PNG */
const OUT_MIME = 'image/jpeg';

/** 读文件头用的探针大小（找 SOF / APP1 足够；不做全量读盘） */
const HEADER_PROBE_BYTES = 256 * 1024;

/** 空白自检的重试次数上限（R7a-5）。耗尽即 throw，绝不回落原图 */
const BLANK_RETRY_LIMIT = 2;

export class RedactExportError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(`[redact:${code}] ${message}`);
    this.name = 'RedactExportError';
    this.code = code;
  }
}

/**
 * 导出成功的 blob 的 brand 集合。
 * WeakSet 而不是「在 blob 上挂个属性」—— 属性可伪造、可复制，WeakSet 的成员资格
 * 只能由本模块授予。uploadGuard 用 assertRedactedBlob 消费它（R1a-1）。
 */
const REDACTED_BLOBS = new WeakSet<Blob>();

/** 只有本管线能调用。uploadGuard 只读不写。 */
function brandRedacted(blob: Blob): Blob {
  REDACTED_BLOBS.add(blob);
  return blob;
}

/** 供 uploadGuard 查询；不导出写入能力 */
export function isRedactedBlob(blob: Blob): boolean {
  return REDACTED_BLOBS.has(blob);
}

// ───────────────────────────────── 几何 ─────────────────────────────────

const FULL_RECT: RedactRect = { x: 0, y: 0, w: 1, h: 1 };

function assertNormalizedRect(r: RedactRect, label: string): void {
  const nums = [r.x, r.y, r.w, r.h];
  for (const n of nums) {
    if (typeof n !== 'number' || !Number.isFinite(n)) {
      throw new RedactExportError('rect-nan', `${label} 含非有限数`);
    }
  }
  // 归一化契约的运行时门。调用方误传像素值（如 x=120）会在这里被抓住，
  // 而不是静默画错位置 —— R1 陷阱 4 的最后一道防线。
  if (r.w <= 0 || r.h <= 0) {
    throw new RedactExportError('rect-empty', `${label} 宽高必须 > 0`);
  }
  if (r.x < 0 || r.y < 0 || r.x + r.w > 1.0000001 || r.y + r.h > 1.0000001) {
    throw new RedactExportError(
      'rect-range',
      `${label} 必须是 [0,1] 归一化比例（收到 x=${r.x} y=${r.y} w=${r.w} h=${r.h}）；` +
        '本 API 不接受 CSS 像素或 bitmap 像素',
    );
  }
}

// ─────────────────────── 文件头探测（避免全尺寸解码） ───────────────────────

interface IntrinsicSize {
  /** 已摆正（应用 EXIF orientation 后）的宽高 */
  width: number;
  height: number;
}

/** JPEG SOF / PNG IHDR 纯字节解析。目的是在**不解码**的前提下拿到摆正后的尺寸。 */
function probeIntrinsicSize(bytes: Uint8Array): IntrinsicSize | null {
  if (bytes.length > 24 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    // PNG 无 EXIF orientation 语义（eXIf chunk 存在但浏览器不据此旋转 canvas 源）
    return { width: view.getUint32(16), height: view.getUint32(20) };
  }
  if (!(bytes.length > 4 && bytes[0] === 0xff && bytes[1] === 0xd8)) return null;

  let i = 2;
  let raw: IntrinsicSize | null = null;
  let orientation = 1;
  while (i + 3 < bytes.length) {
    if (bytes[i] !== 0xff) {
      i += 1; // fill byte / 不对齐，向前找下一个 marker
      continue;
    }
    const marker = bytes[i + 1]!;
    if (marker === 0xff) {
      i += 1;
      continue;
    }
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      i += 2;
      continue;
    }
    if (marker === 0xd9 || marker === 0xda) break; // EOI / SOS：扫描数据开始，停
    const segLen = (bytes[i + 2]! << 8) | bytes[i + 3]!;
    if (segLen < 2) break;
    const body = i + 4;
    const isSOF =
      (marker >= 0xc0 && marker <= 0xc3) ||
      (marker >= 0xc5 && marker <= 0xc7) ||
      (marker >= 0xc9 && marker <= 0xcb) ||
      (marker >= 0xcd && marker <= 0xcf);
    if (isSOF && body + 5 < bytes.length) {
      raw = {
        height: (bytes[body + 1]! << 8) | bytes[body + 2]!,
        width: (bytes[body + 3]! << 8) | bytes[body + 4]!,
      };
    } else if (marker === 0xe1) {
      const o = readExifOrientation(bytes, body, segLen - 2);
      if (o) orientation = o;
    }
    i = body + (segLen - 2);
  }
  if (!raw || raw.width <= 0 || raw.height <= 0) return null;
  // 5/6/7/8 为带 90° 旋转的方向值 → 摆正后宽高互换。
  // createImageBitmap 默认 from-image，返回的就是摆正尺寸；此处必须同步换，
  // 否则我们算出的 expectedAspect 会和 bitmap 对不上（R2：坐标基准要一致）
  if (orientation >= 5 && orientation <= 8) return { width: raw.height, height: raw.width };
  return raw;
}

/** 从 APP1 段读 EXIF Orientation（0x0112）。只读，不写，不做剥离 —— 剥离靠重编码（R2） */
function readExifOrientation(bytes: Uint8Array, start: number, len: number): number | null {
  if (len < 14) return null;
  const sig = [0x45, 0x78, 0x69, 0x66, 0x00, 0x00]; // "Exif\0\0"
  for (let k = 0; k < sig.length; k++) if (bytes[start + k] !== sig[k]) return null;
  const tiff = start + 6;
  if (tiff + 8 > bytes.length) return null;
  const le = bytes[tiff] === 0x49 && bytes[tiff + 1] === 0x49;
  const be = bytes[tiff] === 0x4d && bytes[tiff + 1] === 0x4d;
  if (!le && !be) return null;
  const u16 = (o: number) => (le ? bytes[o]! | (bytes[o + 1]! << 8) : (bytes[o]! << 8) | bytes[o + 1]!);
  const u32 = (o: number) =>
    le
      ? (bytes[o]! | (bytes[o + 1]! << 8) | (bytes[o + 2]! << 16) | (bytes[o + 3]! << 24)) >>> 0
      : ((bytes[o]! << 24) | (bytes[o + 1]! << 16) | (bytes[o + 2]! << 8) | bytes[o + 3]!) >>> 0;
  const ifd0 = tiff + u32(tiff + 4);
  if (ifd0 + 2 > bytes.length) return null;
  const count = u16(ifd0);
  for (let e = 0; e < count; e++) {
    const entry = ifd0 + 2 + e * 12;
    if (entry + 12 > bytes.length) return null;
    if (u16(entry) === 0x0112) {
      const v = u16(entry + 8);
      return v >= 1 && v <= 8 ? v : null;
    }
  }
  return null;
}

// ─────────────────────────── 运行时不变量（§7.2） ───────────────────────────

/**
 * fillRect 前后各调一次。任一条不成立即 throw —— **不返回 blob**。
 * 这五条分别对应：R1 陷阱 2（半透明）、陷阱 1/2（合成模式被改成 destination-* 或
 * lighter 会让黑框不覆盖）、颜色被改成带 alpha 的写法、以及陷阱 3（模糊/阴影）。
 */
function assertRedactionInvariants(ctx: CanvasRenderingContext2D, phase: string): void {
  const bad: string[] = [];
  // 诊断串刻意用 `:` 而不是 `=`：静态门禁按「赋值形态」grep，用 `=` 会自炸
  if (ctx.globalAlpha !== 1) bad.push(`globalAlpha:${ctx.globalAlpha}`);
  if (ctx.globalCompositeOperation !== 'source-over') bad.push(`gco:${ctx.globalCompositeOperation}`);
  if (ctx.fillStyle !== '#000000') bad.push(`fillStyle:${String(ctx.fillStyle)}`);
  // 老 WebKit 没有 ctx.filter（undefined）—— 没有该 API 即不可能被设置，视为通过
  const f = (ctx as { filter?: string }).filter;
  if (f !== undefined && f !== 'none') bad.push(`filter:${f}`);
  if (ctx.shadowBlur !== 0) bad.push(`shadowBlur:${ctx.shadowBlur}`);
  if (bad.length > 0) {
    throw new RedactExportError('invariant', `遮盖不变量在 ${phase} 被破坏：${bad.join(', ')}`);
  }
}

// ─────────────────────────────── 主流程 ───────────────────────────────

export async function exportRedacted(file: File, opts: ExportOptions): Promise<Blob> {
  if (!(file instanceof Blob)) throw new RedactExportError('input', 'file 必须是 File/Blob');
  if (!Array.isArray(opts?.redactions)) throw new RedactExportError('input', 'redactions 必须是数组');

  const crop = opts.crop ?? FULL_RECT;
  assertNormalizedRect(crop, 'crop');
  for (let i = 0; i < opts.redactions.length; i++) {
    assertNormalizedRect(opts.redactions[i]!, `redactions[${i}]`);
  }

  const maxLongEdge = opts.maxLongEdge ?? DEFAULT_MAX_LONG_EDGE;
  if (!Number.isFinite(maxLongEdge) || maxLongEdge < 64) {
    throw new RedactExportError('input', 'maxLongEdge 不合法');
  }
  const maxBytes = opts.maxBytes ?? DEFAULT_MAX_BYTES;
  const padPx = opts.padPx ?? DEFAULT_PAD_PX;
  if (!Number.isFinite(padPx) || padPx < 4 || padPx > 8) {
    // R1 陷阱 5 明确给了 4–8 px 区间；越界（尤其是 0）必须拒绝
    throw new RedactExportError('input', 'padPx 必须在 4–8 之间（R1 陷阱 5）');
  }

  const header = await readHeader(file);
  const intrinsic = probeIntrinsicSize(header);

  let attempt = 0;
  let shrink = 1;
  // 空白自检失败时按 R7a-5 降尺寸重试；耗尽 → throw（绝不回落原图，R1a-3）
  for (;;) {
    const rendered = await renderToCanvas(file, {
      crop,
      redactions: opts.redactions,
      maxLongEdge: maxLongEdge * shrink,
      padPx,
      intrinsic,
    });
    if (rendered.suspectBlank) {
      attempt += 1;
      if (attempt > BLANK_RETRY_LIMIT) {
        throw new RedactExportError(
          'blank',
          'drawImage 后画面为全黑（疑似 canvas 面积上限静默失败），降尺寸重试仍未恢复',
        );
      }
      shrink *= 0.5;
      continue;
    }
    return await encodeAndRelease(rendered.canvas, maxBytes);
  }
}

async function readHeader(file: File): Promise<Uint8Array> {
  const head = file.slice(0, Math.min(HEADER_PROBE_BYTES, file.size));
  return new Uint8Array(await head.arrayBuffer());
}

interface RenderArgs {
  crop: RedactRect;
  redactions: RedactRect[];
  maxLongEdge: number;
  padPx: number;
  intrinsic: IntrinsicSize | null;
}

interface RenderResult {
  canvas: HTMLCanvasElement;
  suspectBlank: boolean;
}

async function renderToCanvas(file: File, args: RenderArgs): Promise<RenderResult> {
  const { crop, redactions, maxLongEdge, padPx, intrinsic } = args;

  // ── 目标输出尺寸：先用文件头尺寸算好，与 bitmap 实际尺寸解耦 ──
  // 这样即使某些 UA 忽略 resizeWidth/resizeHeight（Safari 历史上会忽略 options），
  // 也由 drawImage 完成降采样，canvas 面积恒在上限内。
  let bitmap = await decodeBitmap(file, intrinsic, crop, maxLongEdge);
  try {
    if (intrinsic) {
      const expected = intrinsic.width / intrinsic.height;
      const actual = bitmap.width / bitmap.height;
      if (Math.abs(actual - expected) / expected > 0.02) {
        // 说明该 UA 在**旋转前**做了 resize（或 orientation 处理与文件头不一致）→ 内容被拉伸，
        // 归一化坐标会落错位置。重新做一次无 resize 的解码取回可信几何。
        bitmap.close();
        bitmap = await createImageBitmap(file);
        const retryActual = bitmap.width / bitmap.height;
        if (Math.abs(retryActual - expected) / expected > 0.02) {
          // 几何不可信 = 黑框可能盖错位置 = 隐私事故。宁可失败。
          throw new RedactExportError(
            'geometry',
            `解码几何与文件头不一致（期望比例 ${expected.toFixed(4)}，实得 ${retryActual.toFixed(4)}）`,
          );
        }
      }
    }

    // R2：坐标基准统一用 bitmap.width/height（已摆正的值），绝不混用 naturalWidth
    const bw = bitmap.width;
    const bh = bitmap.height;
    if (!(bw > 0 && bh > 0)) throw new RedactExportError('decode', 'bitmap 尺寸非法');

    const sx = Math.round(crop.x * bw);
    const sy = Math.round(crop.y * bh);
    const sw = Math.max(1, Math.min(bw - sx, Math.round(crop.w * bw)));
    const sh = Math.max(1, Math.min(bh - sy, Math.round(crop.h * bh)));

    // 只缩不放（R7「小图不放大」）+ 面积上限（R7a-1，用旧 iOS 值）
    const scale = Math.min(1, maxLongEdge / Math.max(sw, sh), Math.sqrt(MAX_CANVAS_AREA_PX / (sw * sh)));
    const outW = Math.max(1, Math.round(sw * scale));
    const outH = Math.max(1, Math.round(sh * scale));
    if (outW * outH > MAX_CANVAS_AREA_PX) {
      throw new RedactExportError('area', '输出面积超过 canvas 上限');
    }

    const canvas = document.createElement('canvas');
    // R7a-2：绝不乘 devicePixelRatio。canvas 的像素就是设备像素。
    canvas.width = outW;
    canvas.height = outH;
    // alpha:false → 初始为不透明黑，既让空白自检有明确判据，也保证输出无 alpha 通道。
    // R7b：不传 colorSpace，保持默认 sRGB（display-p3 会把「本设备支持广色域」写进上传文件当指纹）
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new RedactExportError('context', '拿不到 2d context');

    // R2：导出源只走 createImageBitmap。这里的 source 是 ImageBitmap，
    // **绝不**是 <img>（csswg-drafts#4666 至今 open；全局 CSS 的 image-orientation:none
    // 会造成 Chrome 躺倒 / Safari 正常的隐蔽分叉）
    ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, outW, outH);

    // R7a-5 主动自检：面积超限时 WebKit 只打一条 console warning，绘制被跳过，
    // 导出一张全黑图。「上传了一张空白图」比报错更糟 → 读几个点确认画上去了。
    const suspectBlank = looksBlank(ctx, outW, outH);
    if (suspectBlank) {
      canvas.width = 0;
      canvas.height = 0;
      return { canvas, suspectBlank: true };
    }

    // ── R1：遮盖烧进像素。同一张将被导出的 canvas，fillRect 不透明纯黑。 ──
    // 禁止叠加层 / SVG overlay / 对象模型（陷阱 1）；禁止 globalAlpha<1 或带 alpha 的
    // 颜色（陷阱 2）；禁止模糊/马赛克（陷阱 3，Depix 对常见字体 70–90% 还原率）。
    ctx.fillStyle = '#000000';
    assertRedactionInvariants(ctx, 'fillRect 前');
    for (const r of redactions) {
      // 陷阱 5：四周外扩 padPx，抵消 JPEG 有损压缩的边缘振铃
      const x0 = Math.max(0, Math.floor(r.x * outW) - padPx);
      const y0 = Math.max(0, Math.floor(r.y * outH) - padPx);
      const x1 = Math.min(outW, Math.ceil((r.x + r.w) * outW) + padPx);
      const y1 = Math.min(outH, Math.ceil((r.y + r.h) * outH) + padPx);
      if (x1 <= x0 || y1 <= y0) continue;
      ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
    }
    assertRedactionInvariants(ctx, 'fillRect 后');

    return { canvas, suspectBlank: false };
  } finally {
    bitmap.close(); // R7a-4
  }
}

async function decodeBitmap(
  file: File,
  intrinsic: IntrinsicSize | null,
  crop: RedactRect,
  maxLongEdge: number,
): Promise<ImageBitmap> {
  if (!intrinsic) {
    // 未知容器（HEIC / WebP / …）：拿不到文件头尺寸就不能安全地算 resize 目标，
    // 退回整幅解码，由 drawImage 负责降采样（canvas 面积仍受上限约束）。
    // R7c：HEIC 行为未知，需真机（V11）。
    return await createImageBitmap(file);
  }
  const { width: w, height: h } = intrinsic;
  const cropLong = Math.max(w * crop.w, h * crop.h);
  const decodeScale = Math.min(
    1,
    maxLongEdge / Math.max(1, cropLong),
    Math.sqrt(MAX_CANVAS_AREA_PX / Math.max(1, w * h)),
  );
  const rw = Math.max(1, Math.round(w * decodeScale));
  const rh = Math.max(1, Math.round(h * decodeScale));
  // R7a-3：一步解码 + 降采样，全程不分配全尺寸 canvas。
  // R2：不传 imageOrientation —— 规范默认就是 'from-image'；传 'none' 在老 Chromium
  //     会被当旧语义处理并打 deprecation warning，跨版本行为不一致。
  // R7b：不传 colorSpace。
  return await createImageBitmap(file, { resizeWidth: rw, resizeHeight: rh, resizeQuality: 'high' });
}

/** 采 9 个点；全部恰为不透明黑 → 疑似绘制被跳过（R7a 的静默全黑） */
function looksBlank(ctx: CanvasRenderingContext2D, w: number, h: number): boolean {
  const xs = [1, Math.floor(w / 2), Math.max(1, w - 2)];
  const ys = [1, Math.floor(h / 2), Math.max(1, h - 2)];
  for (const x of xs) {
    for (const y of ys) {
      const d = ctx.getImageData(x, y, 1, 1).data;
      if (d[0] !== 0 || d[1] !== 0 || d[2] !== 0) return false;
    }
  }
  return true;
}

async function encodeAndRelease(canvas: HTMLCanvasElement, maxBytes: number): Promise<Blob> {
  try {
    let last: Blob | null = null;
    for (const q of QUALITY_LADDER) {
      const blob = await toJpeg(canvas, q);
      last = blob;
      if (blob.size <= maxBytes) return brandRedacted(blob);
    }
    throw new RedactExportError(
      'oversize',
      `质量降到 ${QUALITY_LADDER[QUALITY_LADDER.length - 1]} 仍为 ${last?.size ?? 0} 字节，超出 ${maxBytes}`,
    );
  } finally {
    // R7a-4：释放 Safari backing store
    canvas.width = 0;
    canvas.height = 0;
  }
}

/**
 * R7：导出 JPEG 并**校验 blob.type**。
 * MDN 对 toBlob 的 type 参数原文：「that type is also used if the given type isn't
 * supported」—— 即请求不支持的类型时**不报错，静默返回 PNG**。Safari 的 canvas
 * 根本不能编码 WebP，症状是「只有 iPhone 用户报 413」，极难排查。
 * 这里的 fallback 是换一条**同样只产 JPEG**的编码路径（toDataURL），
 * **不是**回落原图 —— 回落原图是 R1a-3 明令禁止的。
 */
async function toJpeg(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  const viaToBlob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((b) => resolve(b), OUT_MIME, quality);
  });
  if (viaToBlob && viaToBlob.type === OUT_MIME) return viaToBlob;

  const url = canvas.toDataURL(OUT_MIME, quality);
  const prefix = `data:${OUT_MIME};base64,`;
  if (!url.startsWith(prefix)) {
    throw new RedactExportError('encode', `本环境无法编码 ${OUT_MIME}（toDataURL 返回 ${url.slice(0, 24)}…）`);
  }
  const bin = atob(url.slice(prefix.length));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const blob = new Blob([bytes], { type: OUT_MIME });
  if (blob.type !== OUT_MIME) throw new RedactExportError('encode', 'blob.type 校验失败');
  return blob;
}

// ─────────────────────────── R3：预览即最终 ───────────────────────────

export interface RedactedPreview {
  /** 与实际上传的**同一个** Blob 实例 —— 不是编辑器画布的实时状态 */
  blob: Blob;
  /** 预览用 object URL；用完必须 revoke（R1a） */
  url: string;
  revoke: () => void;
}

/**
 * R3：预览渲染的必须是 toBlob() 产物解码回来的图，不是编辑器画布的实时状态。
 * 因此预览的唯一合法入口就是把导出 blob 本身喂回 <img>/canvas。
 * 二者若有差异（如缩放插值），用户看到的就是假的。
 */
export function createRedactedPreview(blob: Blob): RedactedPreview {
  if (!isRedactedBlob(blob)) {
    throw new RedactExportError('preview', '只能预览导出管线产出的 blob');
  }
  const url = URL.createObjectURL(blob);
  return { blob, url, revoke: () => URL.revokeObjectURL(url) };
}

export const REDACT_EXPORT_CONSTANTS = {
  MAX_CANVAS_AREA_PX,
  QUALITY_LADDER,
  DEFAULT_MAX_LONG_EDGE,
  DEFAULT_MAX_BYTES,
  DEFAULT_PAD_PX,
  OUT_MIME,
} as const;
