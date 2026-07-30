/**
 * 遮盖隐私门控用的 fixture 与字节扫描器（Node 侧）。
 *
 * 为什么用 sharp 造 fixture 而不是 exiftool：exiftool 不在本机 PATH，CI 上也不保证有。
 * sharp 已是本仓库 dependency，`.withExif()` + `.withMetadata({orientation})` 能程序化
 * 注入 EXIF（含 GPS IFD 与 Orientation=6），无外部二进制依赖、可复现。
 *
 * 注意（实测结论，写在这里免得下一个人踩）：
 *  - `.withExif({ IFD0: { Orientation: '6' } })` **不足以**让 orientation 生效
 *    （sharp 0.34 读回来仍是 1）；必须同时 `.withMetadata({ orientation: 6 })`。
 *  - EXIF 里存的是数值 tag id，**不存 "GPS" 这三个字母**。所以 latin1 兜底搜索里的
 *    'GPS' 在本 fixture 上是恒不命中的（它防的是 XMP 这类文本型元数据）。
 *    真正起作用的 canary 是 'Apple' / 'iPhone' / '2026:' —— 见 V2 的正向对照断言。
 */
import sharp from 'sharp';

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const SENTINEL_GREEN = [0, 255, 0] as const;
export const SENTINEL_MAGENTA = [255, 0, 255] as const;

/**
 * 哨兵图（§7.2）：框外绿 #00FF00、待遮盖区洋红 #FF00FF。
 * 用 PNG 无损，保证进管线前的像素是精确值 —— 断言的锐利度全靠这一点。
 */
export async function buildSentinelPng(
  width: number,
  height: number,
  magenta: Rect,
): Promise<Buffer> {
  const raw = Buffer.alloc(width * height * 3);
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
  return await sharp(raw, { raw: { width, height, channels: 3 } }).png({ compressionLevel: 6 }).toBuffer();
}

/**
 * V2 fixture：一张图同时验方向与剥离。
 * 存储像素 800×600（横），`Orientation=6` → 正确显示应为 600×800（竖）。
 * 同时注入 Make/Model/DateTime/GPS，作为剥离断言的 canary。
 */
export async function buildExifJpeg(): Promise<Buffer> {
  const width = 800;
  const height = 600;
  const raw = Buffer.alloc(width * height * 3);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 3;
      // 非均匀内容：避免撞上导出管线的「全黑 → 疑似绘制失败」自检
      raw[i] = 40 + Math.floor((x / width) * 200);
      raw[i + 1] = 60 + Math.floor((y / height) * 180);
      raw[i + 2] = 200;
    }
  }
  return await sharp(raw, { raw: { width, height, channels: 3 } })
    .jpeg({ quality: 92 })
    .withExif({
      IFD0: {
        Make: 'Apple',
        Model: 'iPhone 15 Pro',
        DateTime: '2026:07:30 12:00:00',
        Software: 'HUAWEI-nothing-here',
      },
      IFD2: { DateTimeOriginal: '2026:07:30 12:00:00' },
      IFD3: {
        GPSLatitudeRef: 'N',
        GPSLatitude: '35/1 41/1 0/1',
        GPSLongitudeRef: 'E',
        GPSLongitude: '139/1 41/1 0/1',
      },
    })
    // sharp 0.34：withExif 里的 Orientation 不生效，必须走这里
    .withMetadata({ orientation: 6 })
    .toBuffer();
}

// ───────────────────────── JPEG marker 扫描（纯 JS，无外部依赖） ─────────────────────────

export interface JpegScan {
  isJpeg: boolean;
  /** APP1 且段体以 "Exif\0\0" 开头 */
  hasExifApp1: boolean;
  /** APP1 且段体以 "http://ns.adobe.com/xap/1.0/\0" 开头（XMP） */
  hasXmpApp1: boolean;
  /** APP2 且段体以 "ICC_PROFILE\0" 开头 */
  hasIcc: boolean;
  /** ICC profile 的 description 文本（若能读到） */
  iccText: string;
  /** 出现过的 marker 十六进制列表（到 SOS 为止） */
  markers: string[];
}

/**
 * SPEC §7 给的扫描思路：`FFD8` 起，逐段读 `FF <marker> <len:2 big-endian>`，
 * `APP1 = 0xFFE1` 且段体以 `"Exif\0\0"` 开头；遇 `SOS = 0xFFDA` 停。
 */
export function scanJpegMarkers(buf: Buffer): JpegScan {
  const out: JpegScan = {
    isJpeg: buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8,
    hasExifApp1: false,
    hasXmpApp1: false,
    hasIcc: false,
    iccText: '',
    markers: [],
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
    const segLen = buf.readUInt16BE(i + 2);
    const body = i + 4;
    const bodyLen = Math.max(0, segLen - 2);
    out.markers.push(hex(marker));
    const head = buf.subarray(body, Math.min(buf.length, body + 32)).toString('latin1');
    if (marker === 0xe1) {
      if (head.startsWith('Exif\0\0')) out.hasExifApp1 = true;
      if (head.startsWith('http://ns.adobe.com/xap/1.0/\0')) out.hasXmpApp1 = true;
    }
    if (marker === 0xe2 && head.startsWith('ICC_PROFILE\0')) {
      out.hasIcc = true;
      const icc = buf.subarray(body + 14, Math.min(buf.length, body + bodyLen));
      out.iccText = readableAscii(icc);
    }
    i = body + bodyLen;
  }
  return out;
}

function hex(n: number): string {
  return `FF${n.toString(16).toUpperCase().padStart(2, '0')}`;
}

function readableAscii(b: Buffer): string {
  let s = '';
  for (const byte of b) s += byte >= 0x20 && byte < 0x7f ? String.fromCharCode(byte) : ' ';
  return s.replace(/\s+/g, ' ').trim();
}

/** latin1 全字节兜底搜索：命中的 canary 列表 */
export function findCanaries(buf: Buffer, canaries: readonly string[]): string[] {
  const s = buf.toString('latin1');
  const hits: string[] = [];
  for (const c of canaries) if (s.includes(c)) hits.push(c);
  return hits;
}

export const EXIF_CANARIES = ['GPS', 'iPhone', 'Apple', 'HUAWEI', '2026:'] as const;
