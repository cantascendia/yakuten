/**
 * 遮盖隐私门控用的 fixture（Node 侧）。
 *
 * ⚠️ 真值源在 `src/components/interactive/redact/selfCheckKit.ts`：
 * 哨兵图像素、JPEG marker 扫描器、canary 列表、V1 判据全部从那里 re-export。
 * 真机自检页（/dev/selftest/redact）import 的是**同一个**文件 —— §7.2a ② 要求 V1/V2
 * 能在真机上重跑（Playwright 的 WebKit ≠ 真机 iOS Safari），两处若各留一份扫描器，
 * 就会各自漂移，届时「CI 绿、真机红」谁也说不清哪边是对的。
 * 本文件只保留 **Node 独有**的部分：用 sharp 把像素编成 PNG/JPEG 并注入 EXIF。
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
import {
  buildSentinelRaw,
  type Rect,
  SENTINEL_GREEN,
  SENTINEL_MAGENTA,
  scanJpegMarkers,
  findCanaries,
  EXIF_CANARIES,
  type JpegScan,
} from '../../src/components/interactive/redact/selfCheckKit';

export {
  type Rect,
  SENTINEL_GREEN,
  SENTINEL_MAGENTA,
  scanJpegMarkers,
  findCanaries,
  EXIF_CANARIES,
  type JpegScan,
};

/**
 * 哨兵图（§7.2）：框外绿 #00FF00、待遮盖区洋红 #FF00FF。
 * 用 PNG 无损，保证进管线前的像素是精确值 —— 断言的锐利度全靠这一点。
 */
export async function buildSentinelPng(width: number, height: number, magenta: Rect): Promise<Buffer> {
  const raw = Buffer.from(buildSentinelRaw(width, height, magenta));
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
