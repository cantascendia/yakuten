/**
 * V1 / V2 / V3 —— 遮盖导出管线的隐私硬门控
 * SPEC: docs/specs/ai-chat-image-input.md §7 表格 + §7.2
 *
 * 场景 ③「新增测试」（铁律 #14 Test-Lock）：本文件全新增，不改任何既有断言。
 *
 * 两条实现纪律（§7.2）：
 *  - 必须调用**生产导出函数本身**（经 /dev/redact-harness 转发），否则测的是测试自己
 *  - 断言 C 必须保持严格 —— 放宽成「接近黑」会掩盖真的半透明 bug
 *
 * 为什么打 4322 而不是 baseURL(4321)：挂载页是 dev-only dynamic route，生产构建刻意
 * 不产出（结构性保证「测试页不进 dist/」）。见 playwright.config.ts 注释。
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test, expect } from '@playwright/test';
import {
  buildSentinelPng,
  buildExifJpeg,
  scanJpegMarkers,
  findCanaries,
  EXIF_CANARIES,
} from './helpers/redact-fixtures';

// ─────────────────────────── 类型：挂载页暴露的生产 API ───────────────────────────

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface RedactHarness {
  exportRedacted(
    file: File,
    opts: { crop?: Rect; redactions: Rect[]; maxLongEdge?: number; maxBytes?: number; padPx?: number },
  ): Promise<Blob>;
  createRedactedPreview(blob: Blob): { blob: Blob; url: string; revoke(): void };
  isRedactedBlob(blob: Blob): boolean;
  assertRedactedBlob(blob: Blob): void;
  canUploadRedactedBlob(blob: Blob): boolean;
  buildRedactedUploadBody(
    blob: Blob,
    init: { endpoint: string; field?: string; fields?: Record<string, string> },
  ): FormData;
  constants: {
    MAX_CANVAS_AREA_PX: number;
    DEFAULT_MAX_LONG_EDGE: number;
    DEFAULT_MAX_BYTES: number;
    DEFAULT_PAD_PX: number;
    OUT_MIME: string;
    QUALITY_LADDER: readonly number[];
  };
  fileFromBase64(b64: string, name: string, type: string): File;
  blobToBase64(blob: Blob): Promise<string>;
}

declare global {
  interface Window {
    __ykRedact: RedactHarness;
  }
}

// ─────────────────────────────── 常量 ───────────────────────────────

const DEV_ORIGIN = process.env.YK_DEV_URL ?? 'http://localhost:4322';
const HARNESS_URL = `${DEV_ORIGIN}/dev/redact-harness/`;

/** 哨兵图尺寸：长边 1200 < 默认上限 2400 → 不降采样，像素坐标可精确推算 */
const IMG_W = 900;
const IMG_H = 1200;
/** 待遮盖的洋红区（模拟化验单表头的姓名/证件号带） */
const MAGENTA: Rect = { x: 0.06, y: 0.06, w: 0.88, h: 0.16 };
/** 用户/预置框：完整覆盖洋红区并留一点余量 */
const REDACT: Rect = { x: 0.04, y: 0.04, w: 0.92, h: 0.2 };

/** 断言 A 的取样内缩（§7.2：JPEG 情形下额外断言内缩 4px 后严格纯黑） */
const INSIDE_INSET_PX = 4;
/** 断言 B 的取样外扩：跳过 padPx 外扩带 + JPEG 边缘振铃带 */
const OUTSIDE_MARGIN_PX = 16;
/**
 * 断言 B 容差：JPEG 4:2:0 色度二次采样对饱和绿的允许偏差。
 * 实测 chromium / webkit 的最大偏差都只有 1 —— 留 8 是给别的编码器一点余量，
 * 不是给「轻微错位」留后门（真的 DPR/坐标系错位会直接把绿变成黑，偏差 255）。
 */
const GREEN_TOL = 8;

/**
 * 断言 C 的洋红判据：score = min(R,B) − G。
 *   纯洋红(255,0,255) → +255 ／ 哨兵绿(0,255,0) → −255 ／ 纯黑 → 0
 * 用单标量而不是「r>x && b>y」是为了让**绿↔黑硬边的 JPEG 振铃**不误判：
 * 实测振铃处 min(R,B) 能到 64，但那些像素 G 很高（偏绿），score 深度为负。
 * 马赛克按块保留局部均值 → 洋红块 score 仍是 +255；50% 半透明黑 → +128。
 *
 * 阈值 12 是标定出来的，不是拍的：
 *   - 绿↔黑硬边的 JPEG 振铃在 chromium / webkit 上实测峰值 **5**（两引擎字节完全相同）
 *   - `globalAlpha = 0.9` 的半透明黑框会让洋红残留 10% → score **25**（负向验证已跑）
 *   - 12 落在两者之间：能抓到 α ≲ 0.95 的半透明，且离振铃底噪有 2.4 倍余量
 * 若日后编码器变更把底噪推到 ≥12，这条会亮红灯要求重新标定 —— 这是刻意的，
 * 不要用「调大阈值」的方式让它变绿。
 */
const MAGENTA_SCORE_THRESHOLD = 12;

async function openHarness(page: import('@playwright/test').Page): Promise<void> {
  await page.goto(HARNESS_URL);
  await page.waitForSelector('html[data-redact-harness="ready"]', { timeout: 20000 });
}

// ═══════════════════════════ V1：三段像素断言 ═══════════════════════════

interface PixelStats {
  width: number;
  height: number;
  type: string;
  size: number;
  base64: string;
  /** 断言 A */
  insideSamples: number;
  insideNonBlackStrict: number;
  insideMaxChannel: number;
  insideMinAlpha: number;
  /** 断言 B */
  outsideSamples: number;
  outsideBeyondTol: number;
  outsideMaxDeviation: number;
  /** 断言 C */
  magentaSurvivors: number;
  maxMagentaScore: number;
  worstPixel: { x: number; y: number; r: number; g: number; b: number } | null;
}

test.describe('V1 遮盖已烧进像素（硬门控）', () => {
  test.describe.configure({ mode: 'serial' });
  let stats: PixelStats;

  test.beforeAll(async ({ browser }) => {
    const png = await buildSentinelPng(IMG_W, IMG_H, MAGENTA);
    const page = await browser.newPage();
    await openHarness(page);
    stats = await page.evaluate(
      async ({ b64, redact, insideInset, outsideMargin, magentaThreshold, greenTol }) => {
        const api = window.__ykRedact;
        const file = api.fileFromBase64(b64, 'lab-sheet.png', 'image/png');
        // ★ 生产导出函数本身
        const blob = await api.exportRedacted(file, { redactions: [redact] });

        const bmp = await createImageBitmap(blob);
        const canvas = document.createElement('canvas');
        canvas.width = bmp.width;
        canvas.height = bmp.height;
        const ctx = canvas.getContext('2d', { alpha: false })!;
        ctx.drawImage(bmp, 0, 0);
        const { data } = ctx.getImageData(0, 0, bmp.width, bmp.height);

        const pad = api.constants.DEFAULT_PAD_PX;
        const nx0 = Math.round(redact.x * bmp.width);
        const ny0 = Math.round(redact.y * bmp.height);
        const nx1 = Math.round((redact.x + redact.w) * bmp.width);
        const ny1 = Math.round((redact.y + redact.h) * bmp.height);

        // A 区：名义框内缩 insideInset
        const ax0 = nx0 + insideInset;
        const ay0 = ny0 + insideInset;
        const ax1 = nx1 - insideInset;
        const ay1 = ny1 - insideInset;
        // B 区：名义框外扩 pad + outsideMargin 之外的一切
        const bx0 = nx0 - pad - outsideMargin;
        const by0 = ny0 - pad - outsideMargin;
        const bx1 = nx1 + pad + outsideMargin;
        const by1 = ny1 + pad + outsideMargin;

        let insideSamples = 0;
        let insideNonBlackStrict = 0;
        let insideMaxChannel = 0;
        let insideMinAlpha = 255;
        let outsideSamples = 0;
        let outsideBeyondTol = 0;
        let outsideMaxDeviation = 0;
        let magentaSurvivors = 0;
        let maxMagentaScore = -255;
        let worstPixel: { x: number; y: number; r: number; g: number; b: number } | null = null;

        for (let y = 0; y < bmp.height; y++) {
          for (let x = 0; x < bmp.width; x++) {
            const i = (y * bmp.width + x) * 4;
            const r = data[i]!;
            const g = data[i + 1]!;
            const b = data[i + 2]!;
            const a = data[i + 3]!;

            // 断言 C：全图扫描
            const score = Math.min(r, b) - g;
            if (score > maxMagentaScore) {
              maxMagentaScore = score;
              worstPixel = { x, y, r, g, b };
            }
            if (score >= magentaThreshold) magentaSurvivors++;

            if (x >= ax0 && x < ax1 && y >= ay0 && y < ay1) {
              insideSamples++;
              if (r !== 0 || g !== 0 || b !== 0) insideNonBlackStrict++;
              insideMaxChannel = Math.max(insideMaxChannel, r, g, b);
              insideMinAlpha = Math.min(insideMinAlpha, a);
            } else if (x < bx0 || x >= bx1 || y < by0 || y >= by1) {
              outsideSamples++;
              const dev = Math.max(Math.abs(r - 0), Math.abs(g - 255), Math.abs(b - 0));
              outsideMaxDeviation = Math.max(outsideMaxDeviation, dev);
              if (dev > greenTol) outsideBeyondTol++;
            }
          }
        }

        const outW = bmp.width;
        const outH = bmp.height;
        bmp.close();
        canvas.width = 0;
        canvas.height = 0;

        return {
          width: outW,
          height: outH,
          type: blob.type,
          size: blob.size,
          base64: await api.blobToBase64(blob),
          insideSamples,
          insideNonBlackStrict,
          insideMaxChannel,
          insideMinAlpha,
          outsideSamples,
          outsideBeyondTol,
          outsideMaxDeviation,
          magentaSurvivors,
          maxMagentaScore,
          worstPixel,
        };
      },
      {
        b64: png.toString('base64'),
        redact: REDACT,
        insideInset: INSIDE_INSET_PX,
        outsideMargin: OUTSIDE_MARGIN_PX,
        magentaThreshold: MAGENTA_SCORE_THRESHOLD,
        greenTol: GREEN_TOL,
      },
    );
    await page.close();
    // 诊断输出：门控失败时先看这一行，能直接区分「半透明」「错位」「洋红存活」三类
    console.log(
      `[V1/${test.info().project.name}] ${stats.width}x${stats.height} ${stats.size}B ` +
        `insideMaxChannel=${stats.insideMaxChannel} outsideMaxDev=${stats.outsideMaxDeviation} ` +
        `magentaScore=${stats.maxMagentaScore} survivors=${stats.magentaSurvivors}`,
    );
  });

  test('导出物是 JPEG 且几何未被 DPR 污染', () => {
    // R7：格式必须是 JPEG（Safari 的 canvas 不能编码 WebP，toBlob 会静默返回 PNG）
    expect(stats.type).toBe('image/jpeg');
    // R7a-2：绝不乘 devicePixelRatio。乘了这里就会变成 1800×2400
    expect(stats.width).toBe(IMG_W);
    expect(stats.height).toBe(IMG_H);
    expect(stats.size).toBeLessThanOrEqual(3 * 1024 * 1024);
  });

  test('断言 A：遮盖矩形内严格 [0,0,0,255]（抓半透明/漏遮/画错层）', () => {
    expect(stats.insideSamples).toBeGreaterThan(100000);
    expect(stats.insideMinAlpha).toBe(255);
    // 严格纯黑。globalAlpha<1 / rgba(0,0,0,.9) / 画在叠加层 都会让这里 > 0
    expect(
      stats.insideNonBlackStrict,
      `内缩 ${INSIDE_INSET_PX}px 后仍有 ${stats.insideNonBlackStrict} 个非纯黑像素（最大通道值 ${stats.insideMaxChannel}）`,
    ).toBe(0);
    expect(stats.insideMaxChannel).toBe(0);
  });

  test('断言 B：矩形外零改动（抓坐标系/DPR 错位）', () => {
    expect(stats.outsideSamples).toBeGreaterThan(100000);
    expect(
      stats.outsideBeyondTol,
      `框外有 ${stats.outsideBeyondTol} 个像素偏离哨兵绿超过 ${GREEN_TOL}（最大偏差 ${stats.outsideMaxDeviation}）`,
    ).toBe(0);
    expect(stats.outsideMaxDeviation).toBeLessThanOrEqual(GREEN_TOL);
  });

  test('断言 C：全图零洋红存活 ← 真正的隐私断言', () => {
    // 它不问「黑框画对了吗」，问「敏感内容还在不在」。
    // 有人把实现改成模糊/马赛克，这条立刻失败。严格，不放宽。
    expect(
      stats.magentaSurvivors,
      `仍有 ${stats.magentaSurvivors} 个洋红像素存活；最坏像素 ${JSON.stringify(stats.worstPixel)}`,
    ).toBe(0);
    expect(
      stats.maxMagentaScore,
      `全图洋红度峰值 ${stats.maxMagentaScore}（纯洋红为 +255），最坏像素 ${JSON.stringify(stats.worstPixel)}`,
    ).toBeLessThan(MAGENTA_SCORE_THRESHOLD);
  });

  test('导出物本身不含 PNG/WebP 容器且是合法 JPEG', () => {
    const buf = Buffer.from(stats.base64, 'base64');
    const scan = scanJpegMarkers(buf);
    expect(scan.isJpeg).toBe(true);
    expect(buf.subarray(0, 8).toString('latin1')).not.toContain('PNG');
    expect(buf.subarray(0, 16).toString('latin1')).not.toContain('WEBP');
  });
});

// ═══════════════════════════ V2：EXIF 剥离 + 方向正确 ═══════════════════════════

test.describe('V2 EXIF 剥离与方向（硬门控）', () => {
  test('Orientation=6 的竖拍原图：导出为竖向、EXIF 全剥、canary 零命中', async ({ browser }) => {
    const fixture = await buildExifJpeg();

    // ── 正向对照：先证明 fixture 里真的有东西可剥，否则「零命中」是空断言 ──
    const fixtureScan = scanJpegMarkers(fixture);
    expect(fixtureScan.hasExifApp1, 'fixture 必须带 APP1/Exif').toBe(true);
    const fixtureHits = findCanaries(fixture, EXIF_CANARIES);
    expect(fixtureHits, 'fixture 必须命中 canary（正向对照）').toEqual(
      expect.arrayContaining(['iPhone', 'Apple', 'HUAWEI', '2026:']),
    );

    const page = await browser.newPage();
    await openHarness(page);
    const out = await page.evaluate(async ({ b64 }) => {
      const api = window.__ykRedact;
      const file = api.fileFromBase64(b64, 'IMG_20260730_lab.jpg', 'image/jpeg');
      const blob = await api.exportRedacted(file, { redactions: [{ x: 0, y: 0, w: 1, h: 0.28 }] });
      const bmp = await createImageBitmap(blob);
      const dims = { w: bmp.width, h: bmp.height };
      bmp.close();
      return { dims, type: blob.type, base64: await api.blobToBase64(blob) };
    }, { b64: fixture.toString('base64') });
    await page.close();

    const buf = Buffer.from(out.base64, 'base64');
    const scan = scanJpegMarkers(buf);

    // 1) 方向：存储 800×600 + Orientation=6 → 正确显示是 600×800（竖）
    expect(out.dims.h, `导出尺寸 ${out.dims.w}×${out.dims.h}，应为竖向`).toBeGreaterThan(out.dims.w);
    expect(out.dims.w).toBe(600);
    expect(out.dims.h).toBe(800);

    // 2) marker 扫描：无 APP1/Exif、无 XMP
    expect(out.type).toBe('image/jpeg');
    expect(scan.isJpeg).toBe(true);
    expect(scan.hasExifApp1, `导出物仍含 APP1/Exif；markers=${scan.markers.join(',')}`).toBe(false);
    expect(scan.hasXmpApp1).toBe(false);

    // 3) latin1 全字节兜底搜索（对「国产浏览器例外」同样有效）
    expect(findCanaries(buf, EXIF_CANARIES), 'canary 在导出物里必须零命中').toEqual([]);

    // 4) ICC：预期存在，且必须是 canvas 的 sRGB 常量 —— 顺便钉死没人把 canvas 改成 display-p3（R7b）
    expect(scan.hasIcc, `导出物无 APP2/ICC_PROFILE；markers=${scan.markers.join(',')}`).toBe(true);
    expect(scan.iccText.toLowerCase()).not.toContain('p3');
    expect(scan.iccText.toLowerCase()).not.toContain('display p3');
  });
});

// ═══════════════════════════ V3：预览 = 实发 ═══════════════════════════

test.describe('V3 预览即最终（硬门控）', () => {
  test('同一编辑状态：预览渲染源与上传 blob 字节相同，且导出可复现', async ({ browser }) => {
    const png = await buildSentinelPng(600, 800, MAGENTA);
    const page = await browser.newPage();
    await openHarness(page);
    const r = await page.evaluate(async ({ b64, redact }) => {
      const api = window.__ykRedact;
      const mk = () => api.fileFromBase64(b64, 'lab.png', 'image/png');
      const opts = { redactions: [redact] };

      const sendBlob = await api.exportRedacted(mk(), opts);
      // R3：预览源只能是导出 blob 本身解码回来的图，不是编辑器画布的实时状态
      const preview = api.createRedactedPreview(sendBlob);
      const previewBytes = await api.blobToBase64(preview.blob);
      const sendBytes = await api.blobToBase64(sendBlob);
      preview.revoke();

      // 同一编辑状态再导一次：字节必须可复现（否则「所见即所发」无从验证）
      const again = await api.exportRedacted(mk(), opts);
      const againBytes = await api.blobToBase64(again);

      return {
        sameInstance: preview.blob === sendBlob,
        previewEqualsSend: previewBytes === sendBytes,
        deterministic: againBytes === sendBytes,
        previewIsObjectUrl: preview.url.startsWith('blob:'),
        len: sendBytes.length,
      };
    }, { b64: png.toString('base64'), redact: REDACT });
    await page.close();

    expect(r.len).toBeGreaterThan(100);
    expect(r.sameInstance, '预览必须用与上传同一个 Blob 实例').toBe(true);
    expect(r.previewEqualsSend, '预览字节 ≠ 上传字节').toBe(true);
    expect(r.deterministic, '同一编辑状态两次导出字节不同 —— 预览无法代表实发').toBe(true);
    expect(r.previewIsObjectUrl).toBe(true);
  });
});

// ═══════════════════════ R1a：原图没有第二条出路 ═══════════════════════

test.describe('R1a 上传准入（硬门控）', () => {
  test('拒 File / 拒无 brand blob / 收未经导出的 canvas 产物一律拒', async ({ browser }) => {
    const png = await buildSentinelPng(120, 160, MAGENTA);
    const page = await browser.newPage();
    await openHarness(page);
    const r = await page.evaluate(async ({ b64, redact }) => {
      const api = window.__ykRedact;
      const original = api.fileFromBase64(b64, 'original.png', 'image/png');
      const err = (fn: () => unknown): string => {
        try {
          fn();
          return '(没有抛错)';
        } catch (e) {
          return (e as Error).message;
        }
      };
      const exported = await api.exportRedacted(original, { redactions: [redact] });

      // 一个「看起来像 JPEG 的」手工 blob：内容无所谓，关键是没有 brand
      const forged = new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xd9])], { type: 'image/jpeg' });
      // 伪造属性名的尝试（说明为什么用 WeakSet 而不是属性）
      Object.assign(forged, { __redacted: true, brand: 'redacted' });

      return {
        exportedAccepted: api.canUploadRedactedBlob(exported),
        fileError: err(() => api.assertRedactedBlob(original)),
        forgedError: err(() => api.assertRedactedBlob(forged)),
        forgedAccepted: api.canUploadRedactedBlob(forged),
        // 归一化坐标契约：误传 CSS/bitmap 像素必须当场炸，而不是静默画错位置
        pixelCoordError: await api
          .exportRedacted(original, { redactions: [{ x: 12, y: 20, w: 100, h: 40 }] })
          .then(() => '(没有抛错)')
          .catch((e: Error) => e.message),
        padError: await api
          .exportRedacted(original, { redactions: [redact], padPx: 0 })
          .then(() => '(没有抛错)')
          .catch((e: Error) => e.message),
        formDataOk: api.buildRedactedUploadBody(exported, { endpoint: '/x' }).has('image'),
        // 文件名不带机型/日期
        formDataName: (api.buildRedactedUploadBody(exported, { endpoint: '/x' }).get('image') as File)
          .name,
        constants: api.constants,
      };
    }, { b64: png.toString('base64'), redact: REDACT });
    await page.close();

    expect(r.exportedAccepted).toBe(true);
    // R1a-1：上传函数永远不接受 File（TS 帮不上忙，File extends Blob → 必须运行时挡）
    expect(r.fileError).toContain('不接受 File');
    // R1a-2：未注册的 blob 一律拒绝；属性伪造无效（brand 存在 WeakSet 里）
    expect(r.forgedError).toContain('无 brand');
    expect(r.forgedAccepted).toBe(false);
    expect(r.pixelCoordError).toContain('归一化');
    expect(r.padError).toContain('padPx');
    expect(r.formDataOk).toBe(true);
    expect(r.formDataName).toBe('redacted.jpg');

    // R7a-1：面积上限必须是**旧** iOS 值；R7 长边 2400（§4.4a 修正后）
    expect(r.constants.MAX_CANVAS_AREA_PX).toBe(16777216);
    expect(r.constants.DEFAULT_MAX_LONG_EDGE).toBe(2400);
    expect(r.constants.OUT_MIME).toBe('image/jpeg');
    expect(r.constants.QUALITY_LADDER).toEqual([0.92, 0.9, 0.86, 0.82]);
  });
});

// ═══════════════════════ 测试页不进生产产物 ═══════════════════════

test.describe('挂载页只存在于 dev', () => {
  test('dist/ 里没有 redact harness', () => {
    const dist = join(process.cwd(), 'dist');
    test.skip(!existsSync(dist), 'dist/ 不存在，跳过（本断言在 npm run build 后才有意义）');
    expect(existsSync(join(dist, 'dev')), 'dist/dev 存在 —— 挂载页泄漏进生产产物').toBe(false);
    const top = readdirSync(dist);
    expect(top.some((n) => n.includes('redact-harness'))).toBe(false);

    // 更阴的一种泄漏：HTML 没产出，但 Vite 仍把挂载页的 <script> 打成孤儿 chunk
    // 塞进 dist/_astro/（第一版实测就是这样）。所以必须扫资产目录，不能只看有没有 HTML。
    const astroDir = join(dist, '_astro');
    if (existsSync(astroDir)) {
      const assets = readdirSync(astroDir);
      expect(
        assets.filter((n) => n.toLowerCase().includes('harness')),
        '_astro 里有 harness 脚本资产 —— 挂载页脚本被打进生产产物',
      ).toEqual([]);
      // 只扫挂载页独有的全局名。不扫「管线代码本身」——阶段 2 上 UI 后管线**应该**进 dist，
      // 而 `__ykRedact` 是测试挂载页的东西，任何时候出现在生产产物里都是事故。
      const leaked: string[] = [];
      for (const name of assets) {
        if (!name.endsWith('.js')) continue;
        if (readFileSync(join(astroDir, name), 'utf8').includes('__ykRedact')) leaked.push(name);
      }
      expect(leaked, '生产资产里出现测试挂载页的 __ykRedact').toEqual([]);
    }
  });
});
