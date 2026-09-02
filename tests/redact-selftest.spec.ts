/**
 * 真机自检页（/dev/selftest/redact/）的门控
 * SPEC: docs/specs/ai-chat-image-input.md §7.2a ②（Playwright WebKit ≠ 真机 iOS Safari）、
 *       §7 表格 V11、R7、R7a、T6
 *
 * 场景 ③「新增测试」（铁律 #14 Test-Lock）：本文件全新增，不改任何既有断言。
 *
 * 这个 spec 守的**不是**遮盖正确性（那是 redact-privacy.spec.ts 的活），而是
 * 「真机自检这件工具本身可用」：
 *   - 一个按钮跑完全部断言，PASS/FAIL 以页面状态暴露（真机上无需开发者工具）
 *   - 每条必测项都在（少一条就是自检覆盖缩水，而缩水是静默的）
 *   - 正向对照真的在跑（§7.2a ①：没有正向对照的「零命中」等于没有断言）
 *   - 页面自己零远端请求
 * chromium + webkit 双引擎跑（见 playwright.config.ts 的 testMatch）；真机那一道留给 owner。
 */
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';

const DEV_ORIGIN = process.env.YK_DEV_URL ?? 'http://localhost:4322';
const SELFTEST_URL = `${DEV_ORIGIN}/dev/selftest/redact/`;

/** dev 冷启动要编译 tsx + 三份全站 CSS；自检里还有一张 12MP 图要编码 */
test.describe.configure({ timeout: 120_000 });

/** 自检必须覆盖的条目（id 来自 runSelfChecks）。少一条即为覆盖缩水。 */
const REQUIRED_IDS = [
  'v1-control', // 正向对照：fixture 里真的有洋红
  'v1-a',
  'v1-b',
  'v1-c', // 断言 C = 全图零洋红存活
  'v1-geom', // R7a-2：没乘 DPR
  'r7-type', // blob.type 校验
  'r7-webp-probe', // R7 平台探针（Safari 不能编 WebP）
  'v2-control', // 正向对照：fixture 里真的有 EXIF
  'v2-orientation',
  'v2-strip',
  'v2-icc',
  'v3-identity', // 预览字节 === 上传字节
  'v3-deterministic',
  'r1a-guard',
  'r7a-probe', // canvas 面积上限实测
  'r7a-big', // 12MP 大图：非全黑 + 是否触发降尺寸
  'net', // 零远端请求
] as const;

async function openSelfTest(page: Page): Promise<void> {
  await page.goto(SELFTEST_URL);
  await page.waitForSelector('html[data-redact-selftest="ready"]', { timeout: 90_000 });
  await page.waitForSelector('[data-yk-selftest-run]');
}

interface RowDump {
  id: string;
  status: string;
  title: string;
  detail: string;
}

async function runAll(page: Page): Promise<{ verdict: string; rows: RowDump[] }> {
  await page.locator('[data-yk-selftest-run]').click();
  await page.waitForSelector('[data-yk-selftest]', { timeout: 110_000 });
  const verdict = (await page.locator('[data-yk-selftest]').getAttribute('data-yk-selftest')) ?? '';
  const rows = await page.locator('.yk-st__row').evaluateAll((els) =>
    els.map((el) => ({
      id: '',
      status: [...el.classList].find((c) => c.startsWith('yk-st__row--'))?.replace('yk-st__row--', '') ?? '',
      title: el.querySelector('.yk-st__row__title')?.textContent?.trim() ?? '',
      detail: el.querySelector('.yk-st__row__detail')?.textContent?.trim() ?? '',
    })),
  );
  return { verdict, rows };
}

test.describe('真机自检页（硬门控）', () => {
  test('一个按钮跑完全部断言，且全部 PASS', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('pageerror', (e) => consoleErrors.push(e.message));

    await openSelfTest(page);

    // 跑之前不该有判定（避免「页面写死 PASS」这种假通过）
    expect(await page.locator('[data-yk-selftest]').count()).toBe(0);

    const { verdict, rows } = await runAll(page);
    const fails = rows.filter((r) => r.status === 'fail');
    console.log(
      `[自检/${test.info().project.name}] verdict=${verdict}\n` +
        rows.map((r) => `  ${r.status.toUpperCase().padEnd(4)} ${r.title}\n       ${r.detail}`).join('\n'),
    );

    expect(fails.map((f) => `${f.title} —— ${f.detail}`), '自检有失败项').toEqual([]);
    expect(verdict, '页面大字判定不是 PASS').toBe('pass');
    // 大字判定必须真的是大字（真机上不开开发者工具也要看得见）
    const size = await page
      .locator('.yk-st__verdict__big')
      .evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
    expect(size, `判定字号只有 ${size}px`).toBeGreaterThanOrEqual(28);
    expect(consoleErrors, `页面抛了未捕获异常：${consoleErrors.join(' / ')}`).toEqual([]);
  });

  test('必测项一条都不少，且正向对照确实在跑', async ({ page }) => {
    await openSelfTest(page);
    // 直接问模块要 id 列表，避免靠 DOM 文案反推。路径当参数传进去：TS 不该去解析
    // 这个只在 dev 服务器上存在的运行时 URL。
    const ids: string[] = await page.evaluate(async (modPath) => {
      const mod = (await import(modPath)) as {
        runSelfChecks: () => Promise<{ rows: { id: string; status: string }[] }>;
      };
      const report = await mod.runSelfChecks();
      return report.rows.map((r) => `${r.id}:${r.status}`);
    }, '/src/components/interactive/redact/selftest/runSelfChecks.ts');
    const map = new Map(ids.map((s) => s.split(':') as [string, string]));
    for (const id of REQUIRED_IDS) {
      expect(map.has(id), `自检少了必测项 ${id}`).toBe(true);
      expect(map.get(id), `必测项 ${id} 是 ${map.get(id)}`).not.toBe('fail');
    }
    // 正向对照必须是**断言**（pass/fail），不能降级成 info —— 否则它不再拦得住空断言
    expect(map.get('v1-control')).toBe('pass');
    expect(map.get('v2-control')).toBe('pass');
  });

  test('页面自己不上传任何字节', async ({ page }) => {
    /**
     * 判据分两层，都要成立：
     *  ① **零写请求**：任何 POST/PUT/PATCH 都是「字节可能离开设备」，一律不允许。
     *  ② 跨 origin 只允许字体 CDN —— 那是 global.css 的 `@import`（站点皮肤，dev 页为了
     *     复现真实层叠必须载它），与自检数据无关。除此之外的跨 origin 一律算泄漏。
     * dev 服务器自身的模块加载 / HMR / CSS 是本地基建，同 origin，不计。
     */
    const writes: string[] = [];
    const foreign: string[] = [];
    const FONT_HOSTS = ['https://fonts.googleapis.com/', 'https://fonts.gstatic.com/'];
    page.on('request', (req) => {
      const url = req.url();
      if (!['GET', 'HEAD'].includes(req.method())) writes.push(`${req.method()} ${url}`);
      if (url.startsWith(DEV_ORIGIN) || url.startsWith('blob:') || url.startsWith('data:')) return;
      if (FONT_HOSTS.some((h) => url.startsWith(h))) return;
      foreign.push(url);
    });
    await openSelfTest(page);
    await runAll(page);
    expect(writes, `自检页发出了写请求：${writes.join(' / ')}`).toEqual([]);
    expect(foreign, `自检页发出了字体 CDN 以外的跨 origin 请求：${foreign.join(' / ')}`).toEqual([]);

    // 页面自己那条「零远端请求」断言也必须通过（它读的是首帧前装的计数器）
    const netRow = await page
      .locator('.yk-st__row')
      .filter({ hasText: '零远端调用' })
      .first()
      .getAttribute('class');
    expect(netRow, '页面内的零请求自检不是 pass').toContain('yk-st__row--pass');
  });
});

test.describe('自检页只存在于 dev', () => {
  test('dist/ 里没有自检页与自检代码', () => {
    const dist = join(process.cwd(), 'dist');
    test.skip(!existsSync(dist), 'dist/ 不存在，跳过（本断言在 npm run build 后才有意义）');
    expect(existsSync(join(dist, 'dev')), 'dist/dev 存在 —— dev 页泄漏进生产产物').toBe(false);
    const astroDir = join(dist, '_astro');
    if (!existsSync(astroDir)) return;
    const leaked = readdirSync(astroDir).filter((n) => /selftest|self-test/i.test(n));
    expect(leaked, '_astro 里有自检脚本资产').toEqual([]);
  });
});
