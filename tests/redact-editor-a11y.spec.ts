/**
 * 遮盖编辑器（RedactEditor）的无障碍 / 交互门控
 * SPEC: docs/specs/ai-chat-image-input.md §3.2 R3 / R6 / R6a、§7 表格 V10
 *
 * 场景 ③「新增测试」（铁律 #14 Test-Lock）：本文件全新增，不改任何既有断言。
 * 与 tests/redact-privacy.spec.ts 的分工：那边守**导出像素**（隐私红线），
 * 这边守**用户能不能在不用鼠标/不用拖拽/看不清颜色的情况下完成任务**。
 *
 * 为什么必须是真浏览器而不是 jsdom：
 *  - `<input type="range">` 的方向键行为是 UA 实现的，jsdom 里按方向键不会改值 ——
 *    在 jsdom 上"测通"的键盘路径是假的。
 *  - `:focus-visible` 只有真实键盘输入才会命中；合成 KeyboardEvent 不触发。
 *  - 对比度必须读**合成后的**背景色（global.css 第 51 行记的坑），需要真实层叠。
 *
 * 打 4322（astro dev）而不是 baseURL(4321)：挂载页是 dev-only dynamic route，
 * 生产构建刻意不产出 —— 与 redact-privacy.spec.ts 同一理由。
 */
import { expect, test, type Locator, type Page } from '@playwright/test';
import { buildSentinelPng } from './helpers/redact-fixtures';

const DEV_ORIGIN = process.env.YK_DEV_URL ?? 'http://localhost:4322';
const EDITOR_URL = `${DEV_ORIGIN}/dev/editor/redact/`;

/**
 * 本文件的用例要等 dev 服务器首次编译 tsx + 四份全站 CSS，冷启动能吃掉十几秒。
 * 只抬本文件的超时，不动 playwright.config.ts 的全局 30s（那会影响其它 spec 的性能断言）。
 */
test.describe.configure({ timeout: 60_000 });

const IMG_W = 900;
const IMG_H = 1200;
/** 哨兵洋红带模拟化验单表头（姓名/证件号）——落在顶部 6%–22%，被预置的 0–30% 覆盖 */
const MAGENTA = { x: 0.06, y: 0.06, w: 0.88, h: 0.16 };

/** WCAG AA 正文最低对比度 */
const AA_TEXT = 4.5;

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
  // dev 服务器首次编译 tsx + 四份全站 CSS 会慢；给足时间，避免测冷启动而不是测组件
  await page.waitForSelector('html[data-redact-editor-harness="ready"]', { timeout: 60000 });
  await page.waitForSelector('.yk-redact', { timeout: 30000 });
}

/** 走完「选图」这一步。setInputFiles 对 display:none 的 input 同样有效。 */
async function loadSentinel(page: Page): Promise<void> {
  const png = await buildSentinelPng(IMG_W, IMG_H, MAGENTA);
  await page.setInputFiles('.yk-redact__filepick', {
    name: 'lab-sheet.png',
    mimeType: 'image/png',
    buffer: png,
  });
  await page.waitForSelector('.yk-redact__stage');
}

function rectLabels(page: Page): Promise<string[]> {
  return page.locator('.yk-redact__rect').evaluateAll((els) =>
    els.map((e) => e.getAttribute('aria-label') ?? ''),
  );
}

/** 当前焦点元素的可识别描述 + 焦点环宽度（0 = 焦点不可见） */
async function focusInfo(page: Page): Promise<{ id: string; text: string; outline: number }> {
  return await page.evaluate(() => {
    const a = document.activeElement as HTMLElement | null;
    if (!a) return { id: '', text: '(no focus)', outline: 0 };
    const cs = getComputedStyle(a);
    return {
      id: a.id,
      text: (a.getAttribute('aria-label') ?? a.textContent ?? a.tagName).trim().slice(0, 24),
      outline: parseFloat(cs.outlineWidth) || 0,
    };
  });
}

/** 一直按 Tab 直到焦点落在期望的 id 上（返回按了几次；找不到即失败） */
async function tabTo(page: Page, id: string, limit = 30): Promise<number> {
  for (let i = 1; i <= limit; i++) {
    await page.keyboard.press('Tab');
    if ((await focusInfo(page)).id === id) return i;
  }
  throw new Error(`Tab ${limit} 次仍未到达 #${id}`);
}

// ═══════════════════════ 结构：预置框 + 等价控件 + 命中区 ═══════════════════════

test.describe('R6 / R6a 结构（硬门控）', () => {
  test('预置遮盖顶部 30%，四个原生 range 与矩形双向绑定，命中区 ≥44px', async ({ page }) => {
    await openEditor(page);
    await loadSentinel(page);

    // §3.1 / R6a-1：预置「遮盖顶部 25–30%」，取上限更保守
    expect(await rectLabels(page)).toEqual(['遮盖区 1：左 0%，上 0%，宽 100%，高 30%']);

    // R6：每个遮盖框四个**原生** input[type=range]（不是 div+role=slider）
    const ranges = page.locator('.yk-redact__slider input[type="range"]');
    await expect(ranges).toHaveCount(4);
    const meta = await ranges.evaluateAll((els) =>
      els.map((e) => {
        const i = e as HTMLInputElement;
        return { id: i.id, min: i.min, max: i.max, step: i.step, value: i.value, vt: i.getAttribute('aria-valuetext') };
      }),
    );
    // 动态 max：aria-valuemax 必须说真话（x 的上限 = 100 − 宽度 = 0）
    expect(meta.map((m) => m.id)).toEqual([
      'yk-redact-rect-0-x',
      'yk-redact-rect-0-y',
      'yk-redact-rect-0-w',
      'yk-redact-rect-0-h',
    ]);
    expect(meta[0]!.max).toBe('0'); // 宽 100% → 左边缘无处可去
    expect(meta[3]!.max).toBe('100');
    expect(meta.every((m) => m.step === '0.5')).toBe(true);
    expect(meta[2]!.value).toBe('100');
    expect(meta[3]!.value).toBe('30');
    // aria-valuetext 说人话（SPEC R6 原文举例：「遮盖区 1 上边缘，位于图片顶部 8%」）
    expect(meta[1]!.vt).toBe('遮盖框 1 上边缘，位于图片顶部 0%');
    expect(meta[3]!.vt).toBe('遮盖框 1 高度，占图片高的 30%');

    // 绝不用 role="application"（会关掉 AT 浏览模式）
    expect(await page.locator('[role="application"]').count()).toBe(0);
    // 二维选区没有 ARIA pattern → 不许自造 role=slider 的 div
    expect(await page.locator('div[role="slider"], span[role="slider"]').count()).toBe(0);
    // 可读角色名
    await expect(page.locator('.yk-redact__rect').first()).toHaveAttribute('aria-roledescription', '遮盖框');

    // 触控目标：视觉手柄 12–16px，命中区 ::before 撑到 44px 且向框外扩展
    const handle = await page.locator('.yk-redact__handle--nw').first().evaluate((el) => {
      const box = el.getBoundingClientRect();
      const before = getComputedStyle(el, '::before');
      return {
        visual: [Math.round(box.width), Math.round(box.height)],
        hit: [parseFloat(before.width), parseFloat(before.height)],
        offset: [parseFloat(before.insetInlineStart || before.left), parseFloat(before.insetBlockStart || before.top)],
      };
    });
    expect(handle.visual[0]).toBeGreaterThanOrEqual(12);
    expect(handle.visual[0]).toBeLessThanOrEqual(16);
    expect(handle.hit[0]).toBeGreaterThanOrEqual(44);
    expect(handle.hit[1]).toBeGreaterThanOrEqual(44);
    // 命中区中心相对手柄中心外移（撑大的是框外空白，不遮内容）
    expect(handle.offset[0]).toBeLessThan(-handle.visual[0] / 2);

    // R6a-4：文案不得暗示「已帮你遮好了」
    const notes = await page.locator('.yk-redact__note').allInnerTexts();
    expect(notes.join('\n')).toContain('这不代表已经替你确认遮住了什么');
    expect(notes.join('\n')).toContain('建议改用手动输入数值');
    // §3.3 原文文案
    await expect(page.locator('.yk-redact__title')).toHaveText('请遮住姓名和证件号');
    await expect(page.locator('.yk-redact__hint')).toContainText(
      '化验单上方通常有姓名、身份证号、就诊卡号。已为你预置了一个遮盖框，可拖动调整。',
    );
    // 绝不提供模糊/马赛克（§9：Depix 70–90% 还原率）
    const all = await page.locator('.yk-redact').innerText();
    expect(all).not.toMatch(/模糊|马赛克|像素化/);
  });

  test('R6a：一键预设 25% / 33%', async ({ page }) => {
    await openEditor(page);
    await loadSentinel(page);
    await page.getByRole('button', { name: '遮盖顶部 25%' }).click();
    expect((await rectLabels(page))[0]).toContain('高 25%');
    await page.getByRole('button', { name: '遮盖顶部 33%' }).click();
    expect((await rectLabels(page))[0]).toContain('高 33%');
  });
});

// ═══════════════ V10：纯键盘走完 加框→移动→缩放→删除→预览→发送 ═══════════════

test.describe('V10 纯键盘全流程（硬门控）', () => {
  test('每一步焦点可见，且不使用任何指针事件', async ({ page }) => {
    await openEditor(page);
    await loadSentinel(page);
    const trace: string[] = [];

    // ① 加框 —— Tab 到「新增遮盖框」按 Enter
    await page.locator('.yk-redact__title').click(); // 只为把焦点起点放在组件之前，不参与操作
    await page.locator('body').press('Tab');
    let f = await focusInfo(page);
    while (f.text !== '新增遮盖框') {
      await page.keyboard.press('Tab');
      f = await focusInfo(page);
    }
    expect(f.outline, '「新增遮盖框」键盘焦点无可见焦点环').toBeGreaterThan(0);
    trace.push(`① 加框：焦点=${f.text} outline=${f.outline}px → Enter`);
    await page.keyboard.press('Enter');
    expect(await page.locator('.yk-redact__rect').count()).toBe(2);

    // ② 移动 —— Tab 到 遮盖区 2 的「左」slider，方向键真的改值（UA 行为）
    await tabTo(page, 'yk-redact-rect-1-x');
    f = await focusInfo(page);
    expect(f.outline, '「左」滑块无可见焦点环').toBeGreaterThan(0);
    const x0 = await page.locator('#yk-redact-rect-1-x').inputValue();
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    const x1 = await page.locator('#yk-redact-rect-1-x').inputValue();
    expect(Number(x1), '方向键没有改变「左」值 —— 键盘路径是假的').toBeCloseTo(Number(x0) + 2, 5);
    // 可视矩形与 slider 双向绑定（矩形 aria-label 必须跟着 slider 走）
    const labelX = (await rectLabels(page))[1]!.match(/左 ([\d.]+)%/);
    expect(labelX, '矩形 aria-label 里读不到「左」').not.toBeNull();
    expect(Number(labelX![1]), 'slider 值与矩形 aria-label 不一致（双向绑定断了）').toBeCloseTo(Number(x1), 5);
    trace.push(`② 移动：左 ${x0}% → ${x1}%（ArrowRight ×4，step 0.5）`);

    // ③ 缩放 —— Tab 到「宽」slider
    await tabTo(page, 'yk-redact-rect-1-w');
    f = await focusInfo(page);
    expect(f.outline).toBeGreaterThan(0);
    const w0 = await page.locator('#yk-redact-rect-1-w').inputValue();
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    const w1 = await page.locator('#yk-redact-rect-1-w').inputValue();
    expect(Number(w1)).toBeCloseTo(Number(w0) + 1, 5);
    trace.push(`③ 缩放：宽 ${w0}% → ${w1}%`);

    // ④ 删除 —— Shift+Tab 回到该框的「删除」按钮
    for (let i = 0; i < 6; i++) {
      await page.keyboard.press('Shift+Tab');
      f = await focusInfo(page);
      if (f.text.startsWith('删除（遮盖框 2')) break;
    }
    expect(f.text, 'Shift+Tab 未回到「删除（遮盖框 2）」').toContain('删除（遮盖框 2');
    expect(f.outline).toBeGreaterThan(0);
    await page.keyboard.press('Enter');
    expect(await page.locator('.yk-redact__rect').count()).toBe(1);
    trace.push(`④ 删除：焦点=${f.text} outline=${f.outline}px → Enter，剩 1 个框`);
    // 播报（aria-live 节流后仍必须最终播出）
    await expect(page.locator('.yk-redact__srstatus')).toContainText('已删除遮盖区 2', { timeout: 3000 });

    // ⑤ 预览
    f = await focusInfo(page);
    while (f.text !== '预览最终图') {
      await page.keyboard.press('Tab');
      f = await focusInfo(page);
    }
    expect(f.outline).toBeGreaterThan(0);
    trace.push(`⑤ 预览：焦点=${f.text} outline=${f.outline}px → Enter`);
    await page.keyboard.press('Enter');
    await page.waitForSelector('.yk-redact__previewimg');

    // ⑥ 发送 —— 阶段切换后焦点必须被接管（否则键盘用户掉回 body）
    f = await focusInfo(page);
    expect(f.text, '进入预览后焦点没有交接到「发送这张图」').toBe('发送这张图');
    expect(f.outline).toBeGreaterThan(0);
    trace.push(`⑥ 发送：焦点自动交接=${f.text} outline=${f.outline}px → Enter`);
    await page.keyboard.press('Enter');

    // dev 挂载页的自测面板：预览 blob 与 onSend 收到的 blob 同实例 + sha256 相同
    const panel = page.locator('pre[data-selftest]');
    await expect(panel).toHaveAttribute('data-selftest', 'pass', { timeout: 10000 });
    const report = await panel.innerText();
    expect(report).toContain('预览与上传是同一个 Blob 实例');
    expect(report).toContain('预览字节 === 上传字节');
    expect(report).not.toContain('FAIL');

    console.log(`[V10 键盘走查]\n${trace.join('\n')}\n${report}`);
  });
});

// ═══════════════ R4 / §9：全程零网络、零存储 ═══════════════

test.describe('R4 无网络副作用 + §9 不存图片（硬门控）', () => {
  test('从选图到发送：fetch / XHR / sendBeacon 全程 0 次，storage 里无图片数据', async ({ page }) => {
    // 必须在页面任何脚本之前装钩子
    await page.addInitScript(() => {
      const w = window as unknown as { __ykNet: string[]; __ykStore: string[] };
      w.__ykNet = [];
      w.__ykStore = [];
      const nf = window.fetch;
      window.fetch = (...args: Parameters<typeof fetch>) => {
        w.__ykNet.push(`fetch ${String(args[0])} @@ ${(new Error().stack ?? '').split('\n').slice(1, 4).join(' | ')}`);
        return nf.apply(window, args);
      };
      const xo = XMLHttpRequest.prototype.open;
      XMLHttpRequest.prototype.open = function (this: XMLHttpRequest, ...a: unknown[]) {
        w.__ykNet.push(`xhr ${String(a[1])}`);
        return (xo as unknown as (...x: unknown[]) => void).apply(this, a);
      } as typeof xo;
      if (navigator.sendBeacon) {
        const sb = navigator.sendBeacon.bind(navigator);
        navigator.sendBeacon = (url: string | URL, data?: BodyInit | null) => {
          w.__ykNet.push(`beacon ${String(url)}`);
          return sb(url, data);
        };
      }
      const si = Storage.prototype.setItem;
      Storage.prototype.setItem = function (this: Storage, k: string, v: string) {
        w.__ykStore.push(`${k}=${String(v).length}B`);
        return si.call(this, k, v);
      };
    });

    await openEditor(page);
    await loadSentinel(page);
    await page.getByRole('button', { name: '遮盖顶部 33%' }).click();
    await page.getByRole('button', { name: '预览最终图' }).click();
    await page.waitForSelector('.yk-redact__previewimg');
    await page.getByRole('button', { name: '发送这张图' }).click();
    await expect(page.locator('pre[data-selftest]')).toHaveAttribute('data-selftest', 'pass');

    const log = await page.evaluate(() => {
      const w = window as unknown as { __ykNet: string[]; __ykStore: string[] };
      return { net: w.__ykNet, store: w.__ykStore };
    });
    // 真正的红线是「字节有没有离开设备」→ 断言零 http/https/ws 请求。
    // blob: 是本机内存读取，不出设备；且实测这一条来自 **Astro dev 工具栏的 a11y audit**
    // （栈里是 /node_modules/.vite/deps/audit-*.js 的 lint()），生产没有它。
    // 所以 blob: 只断言「不是我们自己的代码发的」——编辑器读字节走 blob.arrayBuffer()，
    // 一旦有人改成 fetch(objectURL) 这条会亮。
    // 按**协议头**判定，不能用 includes('http')：object URL 长这样
    // `blob:http://localhost:4322/…`，含 http 但协议是 blob（本机内存）。
    const remote = log.net.filter((e) => {
      const url = e.split(' @@ ')[0]!.replace(/^(fetch|xhr|beacon) /, '');
      return /^(https?|wss?):/.test(url) || url.startsWith('//') || url.startsWith('/');
    });
    expect(remote, `编辑器发出了远端网络请求：${remote.join(' / ')}`).toEqual([]);
    const ours = log.net.filter((e) => e.includes('/src/components/interactive/redact/'));
    expect(ours, `编辑器自己的代码发起了请求：${ours.join(' / ')}`).toEqual([]);
    // §9：不写 localStorage、不入会话历史、发送后即从内存释放
    for (const entry of log.store) {
      expect(entry, `storage 写入疑似图片数据：${entry}`).not.toMatch(/img|image|redact|blob|photo/i);
      expect(Number(entry.split('=')[1]!.replace('B', '')), `storage 写入过大：${entry}`).toBeLessThan(200);
    }
  });
});

// ═══════════════════ SC 2.5.7 第三条路径：点击-再点击 ═══════════════════

test.describe('SC 2.5.7 点击-再点击（硬门控）', () => {
  test('两次独立点击即可加框，全程无 press-move-release', async ({ page }) => {
    await openEditor(page);
    await loadSentinel(page);
    const before = await page.locator('.yk-redact__rect').count();

    await page.getByRole('button', { name: '点两次加框' }).click();
    await expect(page.getByRole('button', { name: /点两次加框|再点一次对角/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    const stage: Locator = page.locator('.yk-redact__stage');
    const box = (await stage.boundingBox())!;
    // 两次**独立**click（各自 down+up 于同一点，之间没有任何 move-with-button-down）
    await stage.click({ position: { x: box.width * 0.2, y: box.height * 0.5 } });
    await expect(page.locator('.yk-redact__srstatus')).toContainText('已记下第一个角', { timeout: 3000 });
    await stage.click({ position: { x: box.width * 0.7, y: box.height * 0.65 } });

    const after = await page.locator('.yk-redact__rect').count();
    expect(after, '点击-再点击没有生成新框').toBe(before + 1);
    const label = (await rectLabels(page))[after - 1]!;
    // 两点定框：左≈20%、上≈50%、宽≈50%、高≈15%（±2% 容差给舞台取整）
    const nums = [...label.matchAll(/([\d.]+)%/g)].map((m) => Number(m[1]));
    expect(nums[0]).toBeGreaterThan(18);
    expect(nums[0]).toBeLessThan(22);
    expect(nums[1]).toBeGreaterThan(48);
    expect(nums[1]).toBeLessThan(52);
    expect(nums[2]).toBeGreaterThan(48);
    expect(nums[2]).toBeLessThan(52);
    expect(nums[3]).toBeGreaterThan(13);
    expect(nums[3]).toBeLessThan(17);
    // 用完自动退出该模式（避免下一次点击意外又开一个框）
    await expect(page.getByRole('button', { name: '点两次加框' })).toHaveAttribute('aria-pressed', 'false');
  });
});

// ═══════════════════ 双皮肤 × 昼夜四态：对比度 ═══════════════════

const CONTRAST_TARGETS: readonly { sel: string; label: string }[] = [
  { sel: '.yk-redact__title', label: '标题' },
  { sel: '.yk-redact__hint', label: '说明行' },
  { sel: '.yk-redact__note', label: '诚实说明（R6a-4）' },
  { sel: '.yk-redact__link', label: '手动输入链接' },
  { sel: '.yk-redact__field__name', label: '框名/小标题' },
  { sel: '.yk-redact__slider__label', label: '滑块标签' },
  { sel: '.yk-redact__slider__value', label: '滑块数值' },
  { sel: '.yk-redact__btn:not(.yk-redact__btn--primary):not(.yk-redact__btn--danger)', label: '普通钮' },
  { sel: '.yk-redact__btn--primary', label: '主行动钮' },
  { sel: '.yk-redact__btn--danger', label: '删除钮' },
];

test.describe('双皮肤 × 昼夜四态：文字对比度（AA 4.5:1）', () => {
  for (const skin of SKINS) {
    test(`${skin.name}`, async ({ page }) => {
      await openEditor(page, skin);
      await loadSentinel(page);

      const state = await page.evaluate(() => ({
        sakura: document.documentElement.classList.contains('sakura'),
        theme: document.documentElement.dataset.theme ?? '',
        inMarkdown: !!document.querySelector('.sl-markdown-content .yk-redact'),
      }));
      expect(state.sakura).toBe(skin.sakura);
      expect(state.theme).toBe(skin.theme);
      // 特异度坑只在 .sl-markdown-content 里才会出现 —— 必须确认真的在那层里测
      expect(state.inMarkdown).toBe(true);

      const results = await page.evaluate((targets) => {
        const lum = (rgb: number[]): number => {
          const f = rgb.map((v) => {
            const c = v / 255;
            return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
          });
          return 0.2126 * f[0]! + 0.7152 * f[1]! + 0.0722 * f[2]!;
        };
        const parse = (s: string): number[] => {
          const m = s.match(/[\d.]+/g);
          if (!m) return [0, 0, 0, 0];
          return [Number(m[0]), Number(m[1]), Number(m[2]), m[3] === undefined ? 1 : Number(m[3])];
        };
        /** 逐层向上合成半透明背景 —— 必须对**合成后的**底色算（global.css 第 51 行的坑） */
        function effectiveBg(el: Element): number[] {
          let r = 0;
          let g = 0;
          let b = 0;
          let a = 0;
          let node: Element | null = el;
          while (node) {
            const bg: number[] = parse(getComputedStyle(node).backgroundColor);
            const ba: number = bg[3] ?? 1;
            if (ba > 0) {
              // 已累积层在上，新层在下：src-over
              r = r * a + bg[0]! * ba * (1 - a);
              g = g * a + bg[1]! * ba * (1 - a);
              b = b * a + bg[2]! * ba * (1 - a);
              a = a + ba * (1 - a);
              if (a > 0) {
                r /= a;
                g /= a;
                b /= a;
              }
              if (a >= 0.999) return [r, g, b];
            }
            node = node.parentElement;
          }
          // 顶到根仍未不透明 → 按白纸兜底（会低估暗字对比度，方向保守）
          return [r * a + 255 * (1 - a), g * a + 255 * (1 - a), b * a + 255 * (1 - a)];
        }
        const ratioOf = (fg: number[], bg: number[]): number => {
          const l1 = lum(fg);
          const l2 = lum(bg);
          return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
        };
        return targets.map(({ sel, label }) => {
          const el = document.querySelector(sel);
          if (!el) return { label, sel, found: false, ratio: 0, fg: '', bg: '' };
          const cs = getComputedStyle(el);
          const fg = parse(cs.color).slice(0, 3);
          // 候选底色：合成后的 background-color + （若有渐变）**每一个色标**。
          // 渐变只写在 background-image 里，光看 background-color 会算到卡片底色上 ——
          // 那正是「白字在渐变亮端不过 AA」这类 bug 的藏身处。
          const candidates: number[][] = [effectiveBg(el)];
          if (cs.backgroundImage && cs.backgroundImage !== 'none') {
            for (const m of cs.backgroundImage.matchAll(/rgba?\(([^)]+)\)/g)) {
              const stop = parse(m[0]!);
              const sa = stop[3] ?? 1;
              const under = effectiveBg(el.parentElement ?? el);
              candidates.push([0, 1, 2].map((i) => stop[i]! * sa + under[i]! * (1 - sa)));
            }
          }
          let worst = candidates[0]!;
          let ratio = ratioOf(fg, worst);
          for (const c of candidates) {
            const r = ratioOf(fg, c);
            if (r < ratio) {
              ratio = r;
              worst = c;
            }
          }
          return {
            label,
            sel,
            found: true,
            ratio: Math.round(ratio * 100) / 100,
            fg: `rgb(${fg.map(Math.round).join(',')})`,
            bg: `rgb(${worst.map(Math.round).join(',')})`,
          };
        });
      }, CONTRAST_TARGETS as { sel: string; label: string }[]);

      console.log(
        `[对比度/${skin.name}]\n` +
          results.map((r) => `  ${r.ratio.toFixed(2)}:1  ${r.label}  ${r.fg} on ${r.bg}`).join('\n'),
      );

      for (const r of results) {
        expect(r.found, `${r.label}（${r.sel}）在 DOM 里找不到`).toBe(true);
        // 1:1 附近就是本会话刚修的那个 P0 形态（文字被刷成与底色同色）
        expect(r.ratio, `${skin.name} · ${r.label}：${r.fg} on ${r.bg} 仅 ${r.ratio}:1`).toBeGreaterThanOrEqual(
          AA_TEXT,
        );
      }

      // 遮盖框的黑必须**恒为不透明纯黑**：它代表导出像素的真实颜色，任何皮肤都不得改
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
