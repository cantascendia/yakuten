import { test, expect, type Page } from '@playwright/test';

/**
 * 药物图鉴 v2（/zh/tools/brand-index/）新增能力测试。
 * SPEC: docs/specs/brand-library-v2.md §8「新增」清单。
 *
 * 既有断言（h1 含「品牌」、search 可见、「全部地区」按钮、搜索「补佳乐」后 h3 计数、
 * 药物详情页的「品牌图鉴」+ brand-index 链接）留在 tests/critical-paths.spec.ts，
 * 本文件不重复也不改动它们（铁律 #14 Test-Lock）。
 *
 * 岛屿是 client:visible：必须先把 .bl-root 滚进视口、等它可见，再操作。
 * 控件文案取自 src/components/interactive/brand-library/i18n.ts 的 zh 列
 * （对比入口用的是全角括号「对比（n）」，不是半角）。
 */

const PAGE_URL = '/zh/tools/brand-index/';

/** 打开页面并等待 client:visible 岛屿水合完成 */
async function openLibrary(page: Page) {
  await page.goto(PAGE_URL);
  const root = page.locator('.bl-root');
  await root.scrollIntoViewIfNeeded();
  await expect(root).toBeVisible();
  // 岛屿在 mount effect 后打 data-hydrated 标记：只有它出现才代表事件处理已就绪
  // （SSR HTML 里搜索框同样可见，单靠可见性会有 hydration 前点击的竞态）
  await expect(page.locator('.bl-root[data-hydrated="true"]')).toBeVisible();
  await expect(root.locator('input[type="search"]')).toBeVisible();
  return root;
}

test.describe('Brand Library — 外观反查', () => {
  test('剂型「片剂」+ 颜色「蓝色」能筛出结果', async ({ page }) => {
    const root = await openLibrary(page);

    // 反查条的每级 chip 是一个 role="group"（可及名 = 该级标签）。
    // 必须限定在组内：「片剂」在全页还会命中成分名「雌二醇（微粉化片剂）」
    // 和 Ovestin 片剂 的详情 / 对比按钮。
    // chip 自身的可及名是「标签 + 命中计数」（如「片剂 65」），所以按子串匹配。
    const formChip = root.getByRole('group', { name: '剂型' }).getByRole('button', { name: '片剂' });
    const colorChip = root.getByRole('group', { name: '颜色' }).getByRole('button', { name: '蓝色' });

    await formChip.click();
    await colorChip.click();

    // 两级 chip 都是 aria-pressed 开关（SPEC §5.2）
    await expect(formChip).toHaveAttribute('aria-pressed', 'true');
    await expect(colorChip).toHaveAttribute('aria-pressed', 'true');

    const cardTitles = root.locator('article h3');
    await expect(cardTitles.first()).toBeVisible();
    expect(
      await cardTitles.count(),
      '「片剂 + 蓝色」应至少筛出 1 个品牌'
    ).toBeGreaterThan(0);
    // 结果必须全部是片剂：任何可见卡的剂型 chip 都不能不是「片剂」
    await expect(root.locator('article:visible .bl-card__form').filter({ hasNotText: '片剂' })).toHaveCount(0);
  });
});

test.describe('Brand Library — 详情对话框', () => {
  test('首张卡「详情」打开 dialog，ESC 关闭', async ({ page }) => {
    const root = await openLibrary(page);

    // 详情按钮的可及名是 aria-label「查看 {品牌} 详情」
    await root.getByRole('button', { name: '详情' }).first().click();

    const dialog = page.locator('dialog[open]');
    await expect(dialog).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.locator('dialog[open]')).toHaveCount(0);
  });
});

test.describe('Brand Library — 对比', () => {
  test('勾选 2 条后托盘出现，可打开对比表', async ({ page }) => {
    const root = await openLibrary(page);

    // 对比开关是 aria-pressed 按钮，可及名是 aria-label「把 {品牌} 加入对比」
    const compareToggles = root.getByRole('button', { name: '加入对比' });
    await expect(compareToggles.first()).toBeVisible();
    expect(
      await compareToggles.count(),
      '对比需要至少 2 个可选品牌'
    ).toBeGreaterThanOrEqual(2);

    await compareToggles.nth(0).click();
    await compareToggles.nth(1).click();

    // 底部 sticky 托盘（SPEC §5.5）：出现「对比（2）」入口
    const openCompare = root.getByRole('button', { name: '对比（2）' });
    await expect(openCompare).toBeVisible();
    await openCompare.click();

    const dialog = page.locator('dialog[open]');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('table')).toBeVisible();
  });
});

test.describe('Brand Library — 禁用分区', () => {
  test('禁用图版存在且写明「不适用于 HRT」', async ({ page }) => {
    const root = await openLibrary(page);

    // 页尾视觉隔离的禁用/不适用图版（SPEC §3 / §5.1）
    const banned = root.getByRole('region', { name: '禁用 / 不适用' });
    await expect(banned).toBeVisible();
    await expect(banned.getByText('不适用于 HRT').first()).toBeVisible();
  });
});

test.describe('Brand Library — 视图切换', () => {
  test('切到列表视图后存在 table', async ({ page }) => {
    const root = await openLibrary(page);

    await root.getByRole('button', { name: '列表', exact: true }).click();
    await expect(root.getByRole('table')).toBeVisible();
  });
});

test.describe('Brand Library — 樱粉皮肤', () => {
  test('html.sakura 下无 console error 且仍渲染 .bl-root', async ({ page }) => {
    // `astro preview` 不提供 Vercel 的 /_vercel/insights|speed-insights 脚本，
    // 每个页面都会稳定 404 两次。那是本地预览环境的噪音，不是本页面的错误。
    const IGNORED_ERROR_SOURCES = /\/_vercel\//;

    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() !== 'error') return;
      if (IGNORED_ERROR_SOURCES.test(msg.location()?.url ?? '')) return;
      consoleErrors.push(`${msg.text()} @ ${msg.location()?.url ?? ''}`);
    });
    page.on('pageerror', (e) => consoleErrors.push(String(e)));

    const root = await openLibrary(page);

    await page.evaluate(() => document.documentElement.classList.add('sakura'));
    await expect(page.locator('html')).toHaveClass(/sakura/);

    // 换皮后再驱动一次渲染，确保 sakura 分支下的组件路径也跑到
    await root.getByRole('button', { name: '详情' }).first().click();
    await expect(page.locator('dialog[open]')).toBeVisible();
    await page.keyboard.press('Escape');

    await expect(root).toBeVisible();
    expect(consoleErrors, `sakura 模式下出现 console error:\n${consoleErrors.join('\n')}`).toEqual(
      []
    );
  });
});
