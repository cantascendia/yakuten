/**
 * 裁剪舞台（react-easy-crop，T7）的门控
 * SPEC: docs/specs/ai-chat-image-input.md T1 / T7 / §4.4a / §3.2 R6（SC 2.5.7）/ §10.1
 *
 * 场景 ③「新增测试」（铁律 #14 Test-Lock）：本文件全新增，不改任何既有断言。
 * 与既有两个 spec 的分工：
 *   redact-privacy.spec.ts  —— 导出像素（隐私红线）
 *   redact-editor-a11y.spec.ts —— 遮盖态的键盘/点击-再点击/对比度
 *   本文件                  —— **裁剪态**：双指缩放真的可用、三路输入仍在、
 *                              以及「裁剪 + 遮盖」合成后洋红仍然零存活（坐标契约没被破）
 *
 * 为什么双指必须用 CDP：Playwright 的 `page.touchscreen` 只有单点。
 * `Input.dispatchTouchEvent` 支持多 touchPoint（chromium only），这是唯一能在自动化里
 * 证明 pinch 生效的手段。webkit 侧的 pinch 只能靠真机（V11 / §7.2a ②）。
 */
import { expect, test, type Page } from '@playwright/test';
import { buildSentinelPng } from './helpers/redact-fixtures';
import { AA_TEXT, measureContrast, type ContrastTarget } from './helpers/contrast';

const DEV_ORIGIN = process.env.YK_DEV_URL ?? 'http://localhost:4322';
const EDITOR_URL = `${DEV_ORIGIN}/dev/editor/redact/`;

/** dev 服务器冷启动要编译 tsx + 四份全站 CSS，和 a11y spec 同一理由抬到 60s */
test.describe.configure({ timeout: 60_000 });
/** 触控上下文：CDP 派发 touch 事件需要页面处于 hasTouch 环境 */
test.use({ hasTouch: true, viewport: { width: 480, height: 900 } });

const IMG_W = 900;
const IMG_H = 1200;
/** 洋红带 = 化验单表头（姓名/证件号）：顶部 6%–22% */
const MAGENTA = { x: 0.06, y: 0.06, w: 0.88, h: 0.16 };

interface SkinState {
  name: string;
  sakura: boolean;
  theme: 'dark' | 'light';
}

const SKINS: readonly SkinState[] = [
  { name: '二相乐园 · 夜', sakura: false, theme: 'dark' },
  { name: '二相乐园 · 昼', sakura: false, theme: 'light' },
  { name: '乐园手账 · 昼', sakura: true, theme: 'light' },
  { name: '乐园手账 · 幻月夜', sakura: true, theme: 'dark' },
];

async function openEditor(page: Page, skin?: SkinState): Promise<void> {
  await page.goto(EDITOR_URL);
  if (skin) {
    // 皮肤验证必须走 localStorage + reload —— 裸 classList.add 会让 sakura 的 :has()
    // 选择器失效并留下缓存幻影（本仓库有专门的 learned 教训）。
    await page.evaluate(
      ({ sakura, theme }) => {
        localStorage.setItem('sakura-theme', String(sakura));
        localStorage.setItem('yk-dev-theme', theme);
      },
      { sakura: skin.sakura, theme: skin.theme },
    );
    await page.reload();
  }
  await page.waitForSelector('html[data-redact-editor-harness="ready"]', { timeout: 60000 });
  await page.waitForSelector('.yk-redact', { timeout: 30000 });
  const png = await buildSentinelPng(IMG_W, IMG_H, MAGENTA);
  await page.setInputFiles('.yk-redact__filepick', {
    name: 'lab-sheet.png',
    mimeType: 'image/png',
    buffer: png,
  });
  await page.waitForSelector('.yk-redact__stage');
}

/** 进裁剪态：等 lazy chunk 落地 + 取景框就位（库渲染的 div 带 data-testid="cropper"） */
async function enterCrop(page: Page): Promise<void> {
  await page.getByRole('button', { name: '调整裁剪' }).click();
  await page.waitForSelector('[data-yk-cropstage="ready"]');
  await page.waitForSelector('[data-testid="cropper"]');
  await page.waitForSelector('#yk-redact-crop-zoom');
}

/** 裁剪区当前值（%）。读的是四个 range 的 value —— 与读屏听到的是同一个真值。 */
async function cropRect(page: Page): Promise<{ x: number; y: number; w: number; h: number }> {
  return await page.evaluate(() => {
    const v = (id: string) => Number((document.getElementById(id) as HTMLInputElement).value);
    return {
      x: v('yk-redact-crop-0-x'),
      y: v('yk-redact-crop-0-y'),
      w: v('yk-redact-crop-0-w'),
      h: v('yk-redact-crop-0-h'),
    };
  });
}

async function zoomValue(page: Page): Promise<number> {
  return Number(await page.locator('#yk-redact-crop-zoom').inputValue());
}

// ═════════════════════ 双指缩放（T7 的验收核心） ═════════════════════

test.describe('T7 双指缩放（硬门控）', () => {
  test('两指张开 → 裁剪区真的收紧；捏合 → 回放', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'Input.dispatchTouchEvent 多点触控仅 chromium 可用');
    await openEditor(page);
    await enterCrop(page);

    // 初始：整幅图（100% × 100%），zoom = 1
    const before = await cropRect(page);
    expect(before.w, `进入裁剪时应是整幅图，实得 ${JSON.stringify(before)}`).toBeCloseTo(100, 1);
    expect(before.h).toBeCloseTo(100, 1);
    const zoom0 = await zoomValue(page);
    expect(zoom0).toBeCloseTo(1, 2);

    const box = (await page.locator('[data-testid="container"]').boundingBox())!;
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    const cdp = await page.context().newCDPSession(page);
    const pinch = async (half: number, type: 'touchStart' | 'touchMove') => {
      await cdp.send('Input.dispatchTouchEvent', {
        type,
        touchPoints: [
          { x: cx - half, y: cy, id: 1 },
          { x: cx + half, y: cy, id: 2 },
        ],
      });
      // onPinchMove 的缩放落在 rAF 里 —— 必须留出一帧，否则测的是「没来得及生效」
      await page.waitForTimeout(60);
    };

    await pinch(40, 'touchStart');
    for (const half of [60, 80, 100, 120, 140]) await pinch(half, 'touchMove');
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.waitForTimeout(120);

    const zoomIn = await zoomValue(page);
    const after = await cropRect(page);
    // 40 → 140 半距 = 3.5 倍。允许 rAF 合帧带来的损耗，但必须是**量级上的**放大
    expect(zoomIn, `双指张开后 zoom 仍是 ${zoomIn} —— 双指缩放没有生效`).toBeGreaterThan(2);
    expect(after.w, `裁剪区宽没有收紧：${before.w}% → ${after.w}%`).toBeLessThan(before.w * 0.6);
    expect(after.h, `裁剪区高没有收紧：${before.h}% → ${after.h}%`).toBeLessThan(before.h * 0.6);
    // 取景框形状 === 裁剪区形状（cropSize 由我们按 rect 算，不用库的 aspect 锁）
    const shape = await page.locator('[data-testid="cropper"]').evaluate((el) => {
      const b = el.getBoundingClientRect();
      return b.width / b.height;
    });
    expect(shape, '取景框形状与裁剪区形状不一致 —— 屏上看到的不是真要裁的').toBeCloseTo(
      ((after.w / 100) * IMG_W) / ((after.h / 100) * IMG_H),
      1,
    );
    // §10.1：双指拧动不得引入旋转（库的 onPinchMove 会算 rotation，我们不接那个回调）
    const transform = await page.locator('.yk-redact__cropmedia').evaluate((el) => el.style.transform);
    expect(transform, `媒体 transform 含旋转：${transform}`).toContain('rotate(0deg)');

    // 捏回去：zoom 必须能回落（不是单向棘轮）
    await pinch(140, 'touchStart');
    for (const half of [110, 80, 50, 30]) await pinch(half, 'touchMove');
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.waitForTimeout(120);
    const zoomOut = await zoomValue(page);
    expect(zoomOut, `捏合后 zoom 未回落（${zoomIn} → ${zoomOut}）`).toBeLessThan(zoomIn);

    console.log(
      `[T7 双指缩放] zoom ${zoom0.toFixed(2)}× → ${zoomIn.toFixed(2)}× → ${zoomOut.toFixed(2)}×；` +
        `裁剪区 ${before.w}%×${before.h}% → ${after.w}%×${after.h}%`,
    );
  });
});

// ═════════════════════ 三路输入在裁剪态仍然齐全 ═════════════════════

test.describe('SC 2.5.7 裁剪态的非拖拽等价路径', () => {
  test('纯键盘：四个滑块 + 缩放滑块都能改裁剪区，取景框跟着变', async ({ page }) => {
    await openEditor(page);
    await enterCrop(page);

    // ① 四个 range 仍是原生 input，且 id 契约未变（读屏与测试都依赖它）
    const ids = await page.locator('.yk-redact__fields input[type="range"]').evaluateAll((els) => els.map((e) => e.id));
    expect(ids).toEqual(['yk-redact-crop-0-x', 'yk-redact-crop-0-y', 'yk-redact-crop-0-w', 'yk-redact-crop-0-h']);

    // ② 用「高」滑块把裁剪区压到约 40%（纯键盘：focus + ArrowLeft）
    await page.locator('#yk-redact-crop-0-h').focus();
    const h0 = (await cropRect(page)).h;
    for (let i = 0; i < 20; i++) await page.keyboard.press('ArrowLeft');
    const h1 = (await cropRect(page)).h;
    expect(h1, `方向键没有改变裁剪高（${h0}% → ${h1}%）`).toBeLessThan(h0 - 5);
    // 20 次 × step 0.5 = 10 个百分点，一步都不许掉（受控滑块 + 异步同步最容易掉步）
    expect(h1, `方向键掉步：${h0}% 按 20 下应到 ${h0 - 10}%，实得 ${h1}%`).toBeCloseTo(h0 - 10, 5);

    // 只改「高」，其余三个值必须一动不动。
    // 这条钉的是 RedactCropStage 里对库 pan 重标定的预补偿：少了它，「上」会被一点点
    // 带着走（几十次方向键后裁剪区明显下漂），而屏上与读屏都不会报错 —— 静默失效。
    const drift = await cropRect(page);
    expect(drift.x, `只改「高」却把「左」带到 ${drift.x}%`).toBeCloseTo(0, 1);
    expect(drift.y, `只改「高」却把「上」带到 ${drift.y}% —— pan 重标定预补偿失效`).toBeCloseTo(0, 1);
    expect(drift.w, `只改「高」却把「宽」带到 ${drift.w}%`).toBeCloseTo(100, 1);

    // 取景框必须跟着变形（库是受控的：外部写入被推回去了）
    const shape = await page.locator('[data-testid="cropper"]').evaluate((el) => {
      const b = el.getBoundingClientRect();
      return b.width / b.height;
    });
    const want = (((await cropRect(page)).w / 100) * IMG_W) / ((h1 / 100) * IMG_H);
    expect(shape, '滑块改了真值但取景框没跟上 —— 双向绑定断了').toBeCloseTo(want, 1);

    // ③ 缩放滑块（键盘可达）：方向键改 zoom → 裁剪区跟着收紧
    await page.locator('#yk-redact-crop-zoom').focus();
    const zoomA = await zoomValue(page);
    const wA = (await cropRect(page)).w;
    for (let i = 0; i < 30; i++) await page.keyboard.press('ArrowRight');
    const zoomB = await zoomValue(page);
    const wB = (await cropRect(page)).w;
    expect(zoomB, `缩放滑块方向键无效（${zoomA} → ${zoomB}）`).toBeGreaterThan(zoomA);
    expect(wB, `zoom 变了但裁剪区没变（${wA}% → ${wB}%）`).toBeLessThan(wA);

    // 焦点环可见（键盘用户必须看得见自己在哪）
    const outline = await page.locator('#yk-redact-crop-zoom').evaluate((el) => {
      el.focus();
      return parseFloat(getComputedStyle(el).outlineWidth) || 0;
    });
    expect(outline).toBeGreaterThan(0);

    // 取景框自身也可聚焦并有可读名（库渲染的 div，tabIndex=0 + 方向键平移）
    const frame = page.locator('[data-testid="cropper"]');
    await expect(frame).toHaveAttribute('aria-roledescription', '裁剪取景框');
    expect(await frame.getAttribute('aria-label')).toMatch(/^裁剪区：左 /);

    console.log(
      `[SC 2.5.7 裁剪键盘] 高 ${h0}% → ${h1}%；zoom ${zoomA.toFixed(2)}× → ${zoomB.toFixed(2)}×，宽 ${wA}% → ${wB}%`,
    );
  });

  test('拖拽路径未被削弱：舞台上拖出新遮盖框', async ({ page }) => {
    await openEditor(page);
    const before = await page.locator('.yk-redact__rect').count();
    const box = (await page.locator('.yk-redact__stage').boundingBox())!;
    // 真正的 press-move-release（拖拽路径本体）
    await page.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.6);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.7, { steps: 8 });
    await page.mouse.up();
    expect(await page.locator('.yk-redact__rect').count(), '拖拽没有新建遮盖框').toBe(before + 1);
  });
});

// ═════════════ 裁剪 × 遮盖合成：坐标契约没被库带偏 ═════════════

test.describe('裁剪后遮盖仍然落在该落的地方（硬门控）', () => {
  test('裁掉下半张 + 遮盖顶部 33% → 导出图零洋红存活', async ({ page }) => {
    await openEditor(page);
    await enterCrop(page);

    // 键盘把裁剪区压到上半张（洋红带 6%–22% 仍在裁剪区内）
    await page.locator('#yk-redact-crop-0-h').focus();
    for (let i = 0; i < 100; i++) await page.keyboard.press('ArrowLeft'); // 100% → 50%
    const rect = await cropRect(page);
    expect(rect.h).toBeLessThan(60);
    expect(rect.y).toBeCloseTo(0, 1);

    await page.getByRole('button', { name: '完成裁剪' }).click();
    await page.getByRole('button', { name: '遮盖顶部 33%' }).click();
    await page.getByRole('button', { name: '预览最终图' }).click();
    await page.waitForSelector('.yk-redact__previewimg');

    // 预览 <img> 的 src 是导出 blob 的 object URL → 这里读到的就是**将要发出去的像素**
    const stats = await page.evaluate(async () => {
      const img = document.querySelector('.yk-redact__previewimg') as HTMLImageElement;
      await img.decode();
      const c = document.createElement('canvas');
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      const ctx = c.getContext('2d', { alpha: false })!;
      ctx.drawImage(img, 0, 0);
      const { data } = ctx.getImageData(0, 0, c.width, c.height);
      let survivors = 0;
      let maxScore = -255;
      let black = 0;
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i]!;
        const g = data[i + 1]!;
        const b = data[i + 2]!;
        // 与 V1 断言 C 同一判据：score = min(R,B) − G（纯洋红 +255 / 哨兵绿 −255 / 黑 0）
        const score = Math.min(r, b) - g;
        if (score > maxScore) maxScore = score;
        if (score >= 12) survivors++;
        if (r === 0 && g === 0 && b === 0) black++;
      }
      const out = { w: c.width, h: c.height, survivors, maxScore, blackRatio: black / (c.width * c.height) };
      c.width = 0;
      c.height = 0;
      return out;
    });

    // 裁剪真的生效了（输出不再是 900×1200 的整幅比例）
    expect(stats.h / stats.w, `导出比例 ${stats.w}×${stats.h} 看不出裁剪`).toBeLessThan(1.2);
    // 黑框真的在（不是「什么都没画」的假通过）
    expect(stats.blackRatio, '导出图几乎没有黑像素 —— 遮盖没生效').toBeGreaterThan(0.1);
    // 真正的隐私断言：洋红零存活
    expect(stats.survivors, `裁剪后仍有 ${stats.survivors} 个洋红像素存活（峰值 ${stats.maxScore}）`).toBe(0);
    console.log(
      `[裁剪×遮盖] 输出 ${stats.w}×${stats.h}，黑占比 ${(stats.blackRatio * 100).toFixed(1)}%，` +
        `洋红峰值 ${stats.maxScore}，存活 ${stats.survivors}`,
    );
  });
});

// ═══════════ 裁剪态的双皮肤 × 昼夜四态：文字对比度（AA 4.5:1） ═══════════

/**
 * 只覆盖**裁剪态才存在**的文字（缩放滑块行 + 读数）。遮盖态那批目标由
 * tests/redact-editor-a11y.spec.ts 的四态用例负责，本文件不重复。
 */
const CROP_CONTRAST_TARGETS: readonly ContrastTarget[] = [
  { sel: '.yk-redact__zoomrow .yk-redact__slider__label', label: '缩放滑块标签' },
  { sel: '.yk-redact__zoomrow .yk-redact__slider__value', label: '缩放倍数读数' },
  { sel: '.yk-redact__cropreadout', label: '裁剪区读数' },
];

test.describe('裁剪态四态对比度（AA 4.5:1）', () => {
  for (const skin of SKINS) {
    test(`${skin.name}`, async ({ page }) => {
      await openEditor(page, skin);
      await enterCrop(page);
      const state = await page.evaluate(() => ({
        sakura: document.documentElement.classList.contains('sakura'),
        theme: document.documentElement.dataset.theme ?? '',
        inMarkdown: !!document.querySelector('.sl-markdown-content .yk-redact'),
      }));
      expect(state.sakura).toBe(skin.sakura);
      expect(state.theme).toBe(skin.theme);
      // 特异度坑只在 .sl-markdown-content 里才会出现 —— 必须确认真的在那层里测
      expect(state.inMarkdown).toBe(true);

      const results = await measureContrast(page, CROP_CONTRAST_TARGETS);
      console.log(
        `[裁剪态对比度/${skin.name}]\n` +
          results.map((r) => `  ${r.ratio.toFixed(2)}:1  ${r.label}  ${r.fg} on ${r.bg}`).join('\n'),
      );
      for (const r of results) {
        expect(r.found, `${r.label}（${r.sel}）在 DOM 里找不到`).toBe(true);
        expect(r.ratio, `${skin.name} · ${r.label}：${r.fg} on ${r.bg} 仅 ${r.ratio}:1`).toBeGreaterThanOrEqual(
          AA_TEXT,
        );
      }

      // 取景框的遮罩与描边是图形，不受 4.5:1 约束；但**遮盖块**的黑必须恒为不透明纯黑
      // （所见即所发）。裁剪态下遮盖舞台被 display:none 隐藏，这里顺手确认它没被改色。
      const burn = await page.locator('.yk-redact__rect').first().evaluate((el) => {
        const cs = getComputedStyle(el);
        return { bg: cs.backgroundColor, op: cs.opacity, filter: cs.filter, blend: cs.mixBlendMode };
      });
      expect(burn.bg, 'sakura 把遮盖块改色了 —— 所见即所发被破坏').toBe('rgb(0, 0, 0)');
      expect(burn.op).toBe('1');
      expect(burn.filter).toBe('none');
      expect(burn.blend).toBe('normal');
    });
  }
});
