import { test, expect, type Page } from '@playwright/test';

/**
 * 药物图鉴 v2.1（/zh/tools/brand-index/）能力测试。
 * SPEC: docs/specs/brand-library-v2.1-visual.md（§0 逐区 / §1 信息架构 / §5 验收）。
 *
 * 与 v2 的差异（本轮按 spec 变更同步，符合 Test-Lock 合法场景 1「Spec 变更」）：
 * - 卡片 = 品牌族（多国版本合并），禁用条目不再单独分区，改为沉底 + 红色类别胶囊。
 * - 外观反查折叠进「按外观查找」，chip 需先展开。
 * - 视图切换是图标钮（可及名「网格」/「列表」）。
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
  test('展开「按外观查找」后，剂型「片剂」+ 颜色「蓝色」能筛出结果', async ({ page }) => {
    const root = await openLibrary(page);

    // 反查条默认折叠（§1）：先展开
    const toggle = root.getByRole('button', { name: '按外观查找' });
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');

    // 每级 chip 是一个 role="group"（可及名 = 该级标签）。左栏 fieldset 也叫「剂型」，
    // 所以必须先限定在反查条内，再按组取 chip。
    // chip 自身的可及名是「标签 + 命中计数」（如「片剂 65」），所以按子串匹配。
    const finder = root.locator('.bl-finder');
    const formChip = finder.getByRole('group', { name: '剂型' }).getByRole('button', { name: '片剂' });
    const colorChip = finder.getByRole('group', { name: '颜色' }).getByRole('button', { name: '蓝色' });

    await formChip.click();
    await colorChip.click();

    // 两级 chip 都是 aria-pressed 开关
    await expect(formChip).toHaveAttribute('aria-pressed', 'true');
    await expect(colorChip).toHaveAttribute('aria-pressed', 'true');

    const cardTitles = root.locator('article h3');
    await expect(cardTitles.first()).toBeVisible();
    expect(
      await cardTitles.count(),
      '「片剂 + 蓝色」应至少筛出 1 个品牌族'
    ).toBeGreaterThan(0);
    // 结果必须全部是片剂：任何可见卡的剂型值都不能不是「片剂」
    await expect(root.locator('article:visible .bl-card__form').filter({ hasNotText: '片剂' })).toHaveCount(0);
  });
});

test.describe('Brand Library — 详情对话框', () => {
  test('首张卡「查看详情」打开 dialog，ESC 关闭', async ({ page }) => {
    const root = await openLibrary(page);

    // 详情按钮的可及名是 aria-label「查看 {品牌} 详情」
    await root.getByRole('button', { name: '详情' }).first().click();

    const dialog = page.locator('dialog[open]');
    await expect(dialog).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.locator('dialog[open]')).toHaveCount(0);
  });

  test('多地区品牌族在详情里可切换版本', async ({ page }) => {
    const root = await openLibrary(page);

    // 补佳乐族有中国大陆 / 欧洲 / 泰国 / 印度 / 台港澳多个版本（§1 归并）
    await root.locator('input[type="search"]').fill('Progynova');
    const card = root.locator('article').first();
    await expect(card).toBeVisible();
    await card.getByRole('button', { name: '详情' }).click();

    const dialog = page.locator('dialog[open]');
    await expect(dialog).toBeVisible();

    const versions = dialog.getByRole('group', { name: '版本' }).getByRole('button');
    expect(await versions.count(), '补佳乐族应有多个地区版本').toBeGreaterThan(1);

    // 切到第 2 个版本：该版本按钮进入 pressed 态
    await versions.nth(1).click();
    await expect(versions.nth(1)).toHaveAttribute('aria-pressed', 'true');
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

    // sticky 托盘：出现「对比（2）」入口
    const openCompare = root.getByRole('button', { name: '对比（2）' });
    await expect(openCompare).toBeVisible();
    await openCompare.click();

    const dialog = page.locator('dialog[open]');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('table')).toBeVisible();
  });
});

test.describe('Brand Library — 禁用条目', () => {
  test('禁用品牌族沉底显示，卡上写明「不适用于 HRT」', async ({ page }) => {
    const root = await openLibrary(page);

    // §1：不再单独分区，禁用族排在末尾并带红色类别胶囊
    const banned = root.locator('article[data-banned="true"]');
    expect(await banned.count(), '数据里存在不适用于 HRT 的品牌').toBeGreaterThan(0);
    await banned.first().scrollIntoViewIfNeeded();
    await expect(banned.first().getByText('不适用于 HRT').first()).toBeVisible();
  });
});

test.describe('Brand Library — 视图切换', () => {
  test('切到列表视图后存在 table', async ({ page }) => {
    const root = await openLibrary(page);

    await root.getByRole('button', { name: '列表', exact: true }).click();
    await expect(root.getByRole('table')).toBeVisible();
  });
});

test.describe('Brand Library — 左栏多选筛选', () => {
  test('勾选「中国大陆」只剩含中国大陆版本的品牌族', async ({ page }) => {
    const root = await openLibrary(page);

    const before = await root.locator('article').count();
    await root.getByLabel('中国大陆').check();

    const cards = root.locator('article');
    await expect(cards.first()).toBeVisible();
    const after = await cards.count();
    expect(after, '勾选地区后结果应变少').toBeLessThan(before);
    // 每张卡的「地区版本」都必须含中国大陆
    const regionCells = root.locator('article .bl-kv__row:nth-child(3) dd');
    const texts = await regionCells.allInnerTexts();
    expect(texts.length).toBe(after);
    expect(texts.every((text) => text.includes('中国大陆'))).toBe(true);

    // 顶部「全部地区」按钮清空该组
    await root.getByRole('button', { name: '全部地区' }).click();
    expect(await root.locator('article').count()).toBe(before);
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
