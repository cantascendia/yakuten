/**
 * selfCheckKit —— 遮盖管线自检的**共享**纯函数层（浏览器与 Node 都能跑）
 *
 * SPEC: docs/specs/ai-chat-image-input.md §7.2（V1/V2/V3 断言）、§7.2a（实施后修正三条）
 *
 * 为什么它在 src/ 而不是 tests/：
 *   §7.2a ② 记了一条实测结论 —— Playwright 的 WebKit 是桌面 Linux 构建，**不等于**真机
 *   iOS Safari（CI 里完全没有真机 Safari 的 canvas 反指纹噪声），更不等于微信内置浏览器。
 *   所以 V1/V2 必须能在**真机上**再跑一遍（/dev/selftest/redact）。真机自检页与 CI 断言
 *   必须共用同一套 fixture 造法与扫描器 —— 复制一份就是第二个真值源，两边会各自漂移。
 *   → 本文件是那个唯一真值源：`tests/helpers/redact-fixtures.ts` 与自检页都 import 它。
 *
 * 三条纪律：
 *  1. **纯函数**：不碰 DOM、不碰 canvas、不碰网络、不 import sharp。凡是需要浏览器 API
 *     的（canvas 编码、createImageBitmap）都留给调用方。
 *  2. **不放宽断言**：判据（洋红分数阈值、绿色容差）与 tests/redact-privacy.spec.ts 同源
 *     同值。放宽会掩盖真的半透明 bug。
 *  3. 生产代码**不引用**本文件 → 它不会进 dist（tests/redact-privacy.spec.ts 末节的
 *     产物扫描顺带覆盖这一点）。
 */

// ─────────────────────────── 哨兵图（V1） ───────────────────────────

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** 框外：纯绿。任何坐标系/DPR 错位都会让它变黑（偏差 255），所以它是「零改动」的判据。 */
export const SENTINEL_GREEN = [0, 255, 0] as const;
/** 待遮盖区：纯洋红。它是「敏感内容」的替身 —— 断言 C 问的是它还在不在。 */
export const SENTINEL_MAGENTA = [255, 0, 255] as const;

/**
 * 哨兵图的**像素**（RGB，无 alpha，每像素 3 字节）。
 * Node 侧交给 sharp 编 PNG，浏览器侧交给 canvas putImageData 再 toBlob('image/png')。
 * 两边都是无损 PNG → 进管线前的像素是精确值，断言的锐利度全靠这一点。
 */
export function buildSentinelRaw(width: number, height: number, magenta: Rect): Uint8Array {
  const raw = new Uint8Array(width * height * 3);
  const mx0 = Math.round(magenta.x * width);
  const my0 = Math.round(magenta.y * height);
  const mx1 = Math.round((magenta.x + magenta.w) * width);
  const my1 = Math.round((magenta.y + magenta.h) * height);
  for (let y = 0; y < height; y++) {
    const inRowBand = y >= my0 && y < my1;
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 3;
      const isMagenta = inRowBand && x >= mx0 && x < mx1;
      const c = isMagenta ? SENTINEL_MAGENTA : SENTINEL_GREEN;
      raw[i] = c[0];
      raw[i + 1] = c[1];
      raw[i + 2] = c[2];
    }
  }
  return raw;
}

// ─────────────────────── V1 断言 A/B/C 的判据与计算 ───────────────────────

/** 断言 A 取样内缩（§7.2：JPEG 情形额外断言内缩 4px 后严格纯黑） */
export const INSIDE_INSET_PX = 4;
/** 断言 B 取样外扩：跳过 padPx 外扩带 + JPEG 边缘振铃带 */
export const OUTSIDE_MARGIN_PX = 16;
/** 断言 B 容差：JPEG 4:2:0 对饱和绿的允许偏差（实测两引擎最大 1，留余量但不留后门） */
export const GREEN_TOL = 8;
/**
 * 断言 C 的洋红判据：score = min(R,B) − G。
 *   纯洋红(255,0,255) → +255 ／ 哨兵绿(0,255,0) → −255 ／ 纯黑 → 0
 * 阈值 12 是标定值：绿↔黑硬边的 JPEG 振铃实测峰值 5；globalAlpha=0.9 的半透明黑
 * 会让洋红残留 10% → score 25。12 落在两者之间。**不要用调大阈值的方式让它变绿。**
 */
export const MAGENTA_SCORE_THRESHOLD = 12;

export interface SentinelStats {
  /** 断言 A：名义框内缩后仍非纯黑的像素数（必须 0） */
  insideNonBlackStrict: number;
  insideSamples: number;
  insideMaxChannel: number;
  insideMinAlpha: number;
  /** 断言 B：框外偏离哨兵绿超过容差的像素数（必须 0） */
  outsideBeyondTol: number;
  outsideSamples: number;
  outsideMaxDeviation: number;
  /** 断言 C：全图洋红存活数（必须 0）—— 真正的隐私断言 */
  magentaSurvivors: number;
  maxMagentaScore: number;
  worstPixel: { x: number; y: number; r: number; g: number; b: number } | null;
}

/**
 * 对**导出后**的 RGBA 像素做 V1 三段统计。
 * `rect` 是遮盖框在这张图上的归一化位置（若导出经过裁剪，调用方需先转到裁剪空间）。
 */
export function analyzeSentinel(
  data: Uint8Array | Uint8ClampedArray,
  width: number,
  height: number,
  rect: Rect,
  padPx: number,
): SentinelStats {
  const nx0 = Math.round(rect.x * width);
  const ny0 = Math.round(rect.y * height);
  const nx1 = Math.round((rect.x + rect.w) * width);
  const ny1 = Math.round((rect.y + rect.h) * height);
  const ax0 = nx0 + INSIDE_INSET_PX;
  const ay0 = ny0 + INSIDE_INSET_PX;
  const ax1 = nx1 - INSIDE_INSET_PX;
  const ay1 = ny1 - INSIDE_INSET_PX;
  const bx0 = nx0 - padPx - OUTSIDE_MARGIN_PX;
  const by0 = ny0 - padPx - OUTSIDE_MARGIN_PX;
  const bx1 = nx1 + padPx + OUTSIDE_MARGIN_PX;
  const by1 = ny1 + padPx + OUTSIDE_MARGIN_PX;

  const out: SentinelStats = {
    insideNonBlackStrict: 0,
    insideSamples: 0,
    insideMaxChannel: 0,
    insideMinAlpha: 255,
    outsideBeyondTol: 0,
    outsideSamples: 0,
    outsideMaxDeviation: 0,
    magentaSurvivors: 0,
    maxMagentaScore: -255,
    worstPixel: null,
  };

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const r = data[i]!;
      const g = data[i + 1]!;
      const b = data[i + 2]!;
      const a = data[i + 3]!;

      const score = Math.min(r, b) - g;
      if (score > out.maxMagentaScore) {
        out.maxMagentaScore = score;
        out.worstPixel = { x, y, r, g, b };
      }
      if (score >= MAGENTA_SCORE_THRESHOLD) out.magentaSurvivors++;

      if (x >= ax0 && x < ax1 && y >= ay0 && y < ay1) {
        out.insideSamples++;
        if (r !== 0 || g !== 0 || b !== 0) out.insideNonBlackStrict++;
        out.insideMaxChannel = Math.max(out.insideMaxChannel, r, g, b);
        out.insideMinAlpha = Math.min(out.insideMinAlpha, a);
      } else if (x < bx0 || x >= bx1 || y < by0 || y >= by1) {
        out.outsideSamples++;
        const dev = Math.max(Math.abs(r - 0), Math.abs(g - 255), Math.abs(b - 0));
        out.outsideMaxDeviation = Math.max(out.outsideMaxDeviation, dev);
        if (dev > GREEN_TOL) out.outsideBeyondTol++;
      }
    }
  }
  return out;
}

// ─────────────────────── JPEG marker 扫描（V2） ───────────────────────

export interface JpegScan {
  isJpeg: boolean;
  /** APP1 且段体以 "Exif\0\0" 开头 */
  hasExifApp1: boolean;
  /** APP1 且段体以 "http://ns.adobe.com/xap/1.0/\0" 开头（XMP） */
  hasXmpApp1: boolean;
  /** APP2 且段体以 "ICC_PROFILE\0" 开头 */
  hasIcc: boolean;
  /** ICC profile 的可读文本（用来钉死没人把 canvas 改成 display-p3） */
  iccText: string;
  /** 出现过的 marker 十六进制列表（到 SOS 为止） */
  markers: string[];
  /** EXIF Orientation（1–8），读不到为 null。**正向对照**用：先证明 fixture 里真的有方向。 */
  exifOrientation: number | null;
  /** IFD0 里是否有 GPS IFD 指针（0x8825）。同样是正向对照：先证明真有 GPS 可剥。 */
  hasGpsIfd: boolean;
}

function latin1(bytes: Uint8Array, from: number, to: number): string {
  let s = '';
  const end = Math.min(to, bytes.length);
  for (let i = from; i < end; i++) s += String.fromCharCode(bytes[i]!);
  return s;
}

/**
 * SPEC §7 给的扫描思路：`FFD8` 起，逐段读 `FF <marker> <len:2 big-endian>`，
 * `APP1 = 0xFFE1` 且段体以 `"Exif\0\0"` 开头；遇 `SOS = 0xFFDA` 停。
 * 入参用 Uint8Array —— Node 的 Buffer 本身就是 Uint8Array，两侧同一份实现。
 */
export function scanJpegMarkers(buf: Uint8Array): JpegScan {
  const out: JpegScan = {
    isJpeg: buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8,
    hasExifApp1: false,
    hasXmpApp1: false,
    hasIcc: false,
    iccText: '',
    markers: [],
    exifOrientation: null,
    hasGpsIfd: false,
  };
  if (!out.isJpeg) return out;
  let i = 2;
  while (i + 3 < buf.length) {
    if (buf[i] !== 0xff) {
      i += 1;
      continue;
    }
    const marker = buf[i + 1]!;
    if (marker === 0xff) {
      i += 1;
      continue;
    }
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd8)) {
      out.markers.push(hex(marker));
      i += 2;
      continue;
    }
    if (marker === 0xd9 || marker === 0xda) {
      out.markers.push(hex(marker));
      break;
    }
    const segLen = (buf[i + 2]! << 8) | buf[i + 3]!;
    const body = i + 4;
    const bodyLen = Math.max(0, segLen - 2);
    out.markers.push(hex(marker));
    const head = latin1(buf, body, body + 32);
    if (marker === 0xe1) {
      if (head.startsWith('Exif\0\0')) {
        out.hasExifApp1 = true;
        const tiff = readTiff(buf, body + 6);
        if (tiff) {
          out.exifOrientation = tiff.orientation;
          out.hasGpsIfd = tiff.hasGpsIfd;
        }
      }
      if (head.startsWith('http://ns.adobe.com/xap/1.0/\0')) out.hasXmpApp1 = true;
    }
    if (marker === 0xe2 && head.startsWith('ICC_PROFILE\0')) {
      out.hasIcc = true;
      out.iccText = readableAscii(buf, body + 14, body + bodyLen);
    }
    i = body + bodyLen;
  }
  return out;
}

/** 读 TIFF 头 + IFD0：只取 Orientation 与「有没有 GPS IFD」两件事（正向对照够用）。 */
function readTiff(bytes: Uint8Array, tiff: number): { orientation: number | null; hasGpsIfd: boolean } | null {
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
  let orientation: number | null = null;
  let hasGpsIfd = false;
  for (let e = 0; e < count; e++) {
    const entry = ifd0 + 2 + e * 12;
    if (entry + 12 > bytes.length) break;
    const tag = u16(entry);
    if (tag === 0x0112) {
      const v = u16(entry + 8);
      orientation = v >= 1 && v <= 8 ? v : null;
    }
    if (tag === 0x8825) hasGpsIfd = true;
  }
  return { orientation, hasGpsIfd };
}

function hex(n: number): string {
  return `FF${n.toString(16).toUpperCase().padStart(2, '0')}`;
}

function readableAscii(bytes: Uint8Array, from: number, to: number): string {
  let s = '';
  const end = Math.min(to, bytes.length);
  for (let i = from; i < end; i++) {
    const byte = bytes[i]!;
    s += byte >= 0x20 && byte < 0x7f ? String.fromCharCode(byte) : ' ';
  }
  return s.replace(/\s+/g, ' ').trim();
}

/** latin1 全字节兜底搜索：命中的 canary 列表。对「国产浏览器例外」同样有效。 */
export function findCanaries(buf: Uint8Array, canaries: readonly string[]): string[] {
  const s = latin1(buf, 0, buf.length);
  const hits: string[] = [];
  for (const c of canaries) if (s.includes(c)) hits.push(c);
  return hits;
}

/**
 * ⚠️ EXIF 里存的是数值 tag id，**不存 "GPS" 这三个字母**。所以 'GPS' 在这些 fixture 上
 * 恒不命中（它防的是 XMP 这类文本型元数据）—— §7.2a ① 记的正是这个坑：
 * 「没有正向对照的零命中等于没有断言」。真正起作用的是 Apple / iPhone / HUAWEI / 2026:。
 */
export const EXIF_CANARIES = ['GPS', 'iPhone', 'Apple', 'HUAWEI', '2026:'] as const;

// ─────────────────── 手写 EXIF APP1（浏览器侧造 V2 fixture 用） ───────────────────

export interface ExifFixtureFields {
  make: string;
  model: string;
  software: string;
  dateTime: string;
  /** 1–8。6 = 顺时针 90°，摆正后宽高互换 —— V2 的方向断言依赖它。 */
  orientation: number;
}

/**
 * 造一段 APP1/Exif（含 marker 与长度），IFD0 有 Make/Model/Orientation/Software/DateTime
 * 与 GPS IFD 指针，GPS IFD 有经纬度。
 *
 * 为什么浏览器侧要手写而不是复用 Node 的 sharp：真机自检页跑在浏览器里，没有 sharp。
 * 而「有没有东西可剥」这件事**必须**由同一个扫描器现场确认（正向对照），所以自检页
 * 先扫自己造的 fixture：`hasExifApp1 && exifOrientation===6 && hasGpsIfd && canary 命中`。
 * 任何一条不成立就直接报「fixture 无效」，绝不把「零命中」当成通过。
 */
export function buildExifApp1(f: ExifFixtureFields): Uint8Array {
  const enc = (s: string): number[] => {
    const out: number[] = [];
    for (let i = 0; i < s.length; i++) out.push(s.charCodeAt(i) & 0xff);
    out.push(0);
    return out;
  };
  const makeB = enc(f.make);
  const modelB = enc(f.model);
  const softB = enc(f.software);
  const dateB = enc(f.dateTime);

  // IFD0 六个条目：Make, Model, Orientation, Software, DateTime, GPSIFDPointer
  const ifd0Count = 6;
  const ifd0Start = 8; // TIFF 头之后
  const ifd0Size = 2 + ifd0Count * 12 + 4;
  let dataOff = ifd0Start + ifd0Size;

  const makeOff = dataOff;
  dataOff += makeB.length;
  const modelOff = dataOff;
  dataOff += modelB.length;
  const softOff = dataOff;
  dataOff += softB.length;
  const dateOff = dataOff;
  dataOff += dateB.length;
  // 对齐到偶数，RATIONAL 要 4 字节对齐才安全
  while (dataOff % 4 !== 0) dataOff += 1;
  const gpsIfdOff = dataOff;

  // GPS IFD 四个条目：LatRef(ASCII2), Lat(3 RATIONAL), LonRef(ASCII2), Lon(3 RATIONAL)
  const gpsCount = 4;
  const gpsSize = 2 + gpsCount * 12 + 4;
  let gpsData = gpsIfdOff + gpsSize;
  const latOff = gpsData;
  gpsData += 24;
  const lonOff = gpsData;
  gpsData += 24;
  const total = gpsData;

  const tiff = new Uint8Array(total);
  const dv = new DataView(tiff.buffer);
  // 大端（"MM"）：与 sharp 造的 fixture 一致，也更容易人眼核对
  tiff[0] = 0x4d;
  tiff[1] = 0x4d;
  dv.setUint16(2, 42);
  dv.setUint32(4, ifd0Start);

  let p = ifd0Start;
  dv.setUint16(p, ifd0Count);
  p += 2;
  const entry = (tag: number, type: number, count: number, valueOrOffset: number, inline: boolean) => {
    dv.setUint16(p, tag);
    dv.setUint16(p + 2, type);
    dv.setUint32(p + 4, count);
    if (inline && type === 3) dv.setUint16(p + 8, valueOrOffset);
    else dv.setUint32(p + 8, valueOrOffset);
    p += 12;
  };
  entry(0x010f, 2, makeB.length, makeOff, false); // Make
  entry(0x0110, 2, modelB.length, modelOff, false); // Model
  entry(0x0112, 3, 1, f.orientation, true); // Orientation
  entry(0x0131, 2, softB.length, softOff, false); // Software
  entry(0x0132, 2, dateB.length, dateOff, false); // DateTime
  entry(0x8825, 4, 1, gpsIfdOff, false); // GPS IFD pointer
  dv.setUint32(p, 0); // next IFD = 0

  tiff.set(makeB, makeOff);
  tiff.set(modelB, modelOff);
  tiff.set(softB, softOff);
  tiff.set(dateB, dateOff);

  p = gpsIfdOff;
  dv.setUint16(p, gpsCount);
  p += 2;
  const gEntry = (tag: number, type: number, count: number, value: number, ascii?: string) => {
    dv.setUint16(p, tag);
    dv.setUint16(p + 2, type);
    dv.setUint32(p + 4, count);
    if (ascii !== undefined) {
      // ≤4 字节的 ASCII 直接内联
      for (let i = 0; i < 4; i++) tiff[p + 8 + i] = i < ascii.length ? ascii.charCodeAt(i) & 0xff : 0;
    } else {
      dv.setUint32(p + 8, value);
    }
    p += 12;
  };
  gEntry(0x0001, 2, 2, 0, 'N'); // GPSLatitudeRef
  gEntry(0x0002, 5, 3, latOff); // GPSLatitude
  gEntry(0x0003, 2, 2, 0, 'E'); // GPSLongitudeRef
  gEntry(0x0004, 5, 3, lonOff); // GPSLongitude
  dv.setUint32(p, 0);

  const rational = (off: number, nums: readonly [number, number][]) => {
    nums.forEach(([n, d], i) => {
      dv.setUint32(off + i * 8, n);
      dv.setUint32(off + i * 8 + 4, d);
    });
  };
  rational(latOff, [
    [35, 1],
    [41, 1],
    [0, 1],
  ]);
  rational(lonOff, [
    [139, 1],
    [41, 1],
    [0, 1],
  ]);

  const sig = [0x45, 0x78, 0x69, 0x66, 0x00, 0x00]; // "Exif\0\0"
  const segLen = 2 + sig.length + tiff.length;
  const app1 = new Uint8Array(2 + segLen);
  app1[0] = 0xff;
  app1[1] = 0xe1;
  app1[2] = (segLen >> 8) & 0xff;
  app1[3] = segLen & 0xff;
  app1.set(sig, 4);
  app1.set(tiff, 4 + sig.length);
  return app1;
}

/** 把 APP1 插到 SOI 之后（若原图已有 APP1，新的会排在前面，浏览器取第一个）。 */
export function insertApp1(jpeg: Uint8Array, app1: Uint8Array): Uint8Array {
  if (!(jpeg.length > 2 && jpeg[0] === 0xff && jpeg[1] === 0xd8)) {
    throw new Error('insertApp1: 不是 JPEG');
  }
  const out = new Uint8Array(jpeg.length + app1.length);
  out.set(jpeg.subarray(0, 2), 0);
  out.set(app1, 2);
  out.set(jpeg.subarray(2), 2 + app1.length);
  return out;
}
