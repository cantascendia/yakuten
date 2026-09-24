import { test, expect } from '@playwright/test';

/** 血检手账 is client:visible — scroll it into view so it hydrates, then open a new record. */
async function openTracker(page: import('@playwright/test').Page) {
  await page.locator('astro-island[component-url*="BloodTestCheckerRouter"]').scrollIntoViewIfNeeded();
  await page.getByRole('button', { name: '+ 新记录' }).first().click();
}

// ── Navigation & i18n ──

test.describe('Site navigation', () => {
  test('root redirects to /zh/', async ({ page }) => {
    await page.goto('/');
    // Preview server doesn't handle vercel.json redirects, so check page loads
    await expect(page).toHaveTitle(/HRT/);
  });

  test('zh splash page loads', async ({ page }) => {
    await page.goto('/zh/');
    await expect(page).toHaveTitle(/HRT/);
  });

  test('en locale loads', async ({ page }) => {
    await page.goto('/en/about/');
    await expect(page).toHaveTitle(/About/);
    expect(await page.locator('html').getAttribute('lang')).toBe('en');
  });

  test('ja locale loads', async ({ page }) => {
    await page.goto('/ja/about/');
    expect(await page.locator('html').getAttribute('lang')).toBe('ja');
  });

  test('ko locale loads', async ({ page }) => {
    await page.goto('/ko/about/');
    expect(await page.locator('html').getAttribute('lang')).toBe('ko');
  });

  test('language selector exists on doc pages', async ({ page }) => {
    await page.goto('/zh/about/');
    // Starlight uses a <select> or starlight-lang-select
    const langSelect = page.locator('select, starlight-lang-select').first();
    await expect(langSelect).toBeVisible();
  });
});

// ── Emergency Banner ──

test.describe('Emergency banner', () => {
  test('emergency banner is visible on splash page', async ({ page }) => {
    await page.goto('/zh/');
    const banner = page.locator('[role="alert"]');
    await expect(banner).toBeVisible();
  });

  test('emergency banner has no close button', async ({ page }) => {
    await page.goto('/zh/');
    const banner = page.locator('[role="alert"]');
    const closeBtn = banner.locator('button');
    expect(await closeBtn.count()).toBe(0);
  });
});

// ── SEO ──

test.describe('SEO infrastructure', () => {
  test('robots.txt is accessible', async ({ page }) => {
    const response = await page.goto('/robots.txt');
    expect(response?.status()).toBe(200);
    const text = await page.textContent('body');
    expect(text).toContain('Sitemap');
  });

  test('llms.txt is accessible', async ({ page }) => {
    const response = await page.goto('/llms.txt');
    expect(response?.status()).toBe(200);
    const text = await page.textContent('body');
    expect(text).toContain('HRT');
  });

  test('sitemap-index.xml exists', async ({ page }) => {
    const response = await page.goto('/sitemap-index.xml');
    expect(response?.status()).toBe(200);
  });

  test('pages have hreflang tags', async ({ page }) => {
    await page.goto('/zh/about/');
    const hreflangs = await page.locator('link[hreflang]').count();
    expect(hreflangs).toBeGreaterThanOrEqual(4); // zh-CN, en, ja, ko + x-default
  });

  test('pages have JSON-LD structured data', async ({ page }) => {
    await page.goto('/zh/medications/estrogens/oral/');
    const jsonLd = await page.locator('script[type="application/ld+json"]').textContent();
    expect(jsonLd).toContain('MedicalWebPage');
    expect(jsonLd).toContain('Drug');
  });

  test('manifest.json is accessible', async ({ page }) => {
    const response = await page.goto('/manifest.json');
    expect(response?.status()).toBe(200);
  });
});

// ── Blood Test Checker ──

test.describe('Blood Test Checker', () => {
  // 血检手账（唯一版本）：新增记录 → 输入 → 保存。
  // pressSequentially 而非 fill()：React 受控输入收不到 fill() 的合成事件（2026-07-29）。
  test('adds a record and grades it', async ({ page }) => {
    await page.goto('/zh/tools/blood-checker/');
    await expect(page.locator('h1')).toContainText('血检');
    await openTracker(page);
    const e2 = page.locator('input[data-metric="e2"]');
    await expect(e2).toBeVisible();
    await e2.click();
    await e2.pressSequentially('550', { delay: 20 }); // pmol/L ≈ 150 pg/mL → 达标
    await page.getByRole('button', { name: /保存/ }).click();
    await expect(page.getByText('共 1 条记录')).toBeVisible();
    // no demo records are ever seeded
    expect(await page.evaluate(() => localStorage.getItem('yakuten_blood_seeded_v1'))).toBeNull();
  });

  test('red-zone value shows the non-dismissible classic warning', async ({ page }) => {
    await page.goto('/zh/tools/blood-checker/');
    await openTracker(page);
    const k = page.locator('input[data-metric="k"]');
    await k.click();
    await k.pressSequentially('6.2', { delay: 20 });
    await page.getByRole('button', { name: /保存/ }).click();
    const alert = page.locator('.b32-root [role="alert"]');
    await expect(alert).toContainText('高钾血症');
    await expect(alert.locator('a[href="/zh/risks/"]')).toBeVisible();
  });
});

// ── Drug Comparator ──

test.describe('Drug Comparator', () => {
  test('loads with comparison table', async ({ page }) => {
    await page.goto('/zh/tools/drug-comparator/');
    await expect(page.locator('h1')).toContainText('药物');
    // spec-change 2026-07-29：对比视图从 <table> 改为响应式卡片网格
    // （`gridTemplateColumns: repeat(auto-fit, minmax(280px, 1fr))`，
    // 与 risks §7.1 同一 auto-fit 模式 —— 窄屏下真 table 会横向溢出）。
    // 容器走内联 style，故给对比卡加了纯测试钩子 .dc-compare-card（无样式）。
    // ⚠️ 不要退回用 .dc-drug-link 计数：它是**条件渲染**的（无详情页的药物
    // 退化为纯文本，如 CPA），「CPA vs 螺内酯」只会数出 1 个。
    //
    // 断言按**能力**而非标签，且比原版（只查 <table> 可见）强得多：
    // 点一个预设组合 → 必须真的渲染出**两张**对比卡。
    // 初始态只有 1 张，所以必须驱动 UI 才测到「对比」这个能力本身。
    const preset = page.locator('.dc-preset-chip').first();
    await expect(preset).toBeVisible();
    await preset.click();
    const cards = page.locator('.dc-compare-card');
    await expect(cards.first()).toBeVisible();
    await expect(cards, '点预设后对比视图应渲染 2 张对比卡').toHaveCount(2);
  });
});

// ── Drug Brand Index ──

test.describe('Drug Brand Index', () => {
  test('loads with search and filter', async ({ page }) => {
    await page.goto('/zh/tools/brand-index/');
    await expect(page.locator('h1')).toContainText('品牌');
    // Search input exists
    const search = page.locator('input[type="search"]');
    await expect(search).toBeVisible();
    // Filter buttons exist
    const filterBtns = page.locator('button').filter({ hasText: '全部地区' });
    await expect(filterBtns).toBeVisible();
  });

  test('search filters results', async ({ page }) => {
    await page.goto('/zh/tools/brand-index/');
    const search = page.locator('input[type="search"]');
    await search.fill('补佳乐');
    // Should show filtered results (fewer cards)
    const cards = page.locator('h3');
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);
    expect(count).toBeLessThan(20);
  });
});

// ── Drug Cards ──

test.describe('Drug Cards', () => {
  test('loads 20 drug cards', async ({ page }) => {
    await page.goto('/zh/tools/drug-cards/');
    await expect(page.locator('h1')).toContainText('速查');
    const cards = page.locator('h3');
    expect(await cards.count()).toBe(20);
  });

  test('category filter works', async ({ page }) => {
    await page.goto('/zh/tools/drug-cards/');
    // Click "抗雄激素" filter
    await page.locator('button').filter({ hasText: '抗雄激素' }).click();
    const cards = page.locator('h3');
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);
    expect(count).toBeLessThan(20);
  });

  test('cards show hrtyaku.com branding', async ({ page }) => {
    await page.goto('/zh/tools/drug-cards/');
    const brand = page.locator('text=hrtyaku.com').first();
    await expect(brand).toBeVisible();
  });
});

// ── Risk Screener ──

test.describe('Risk Screener', () => {
  test('loads with disclaimer', async ({ page }) => {
    await page.goto('/zh/tools/risk-screener/');
    await expect(page.locator('h1')).toContainText('风险');
  });
});

// ── Medication Pages ──

test.describe('Medication pages', () => {
  test('oral estradiol page has CitationRef', async ({ page }) => {
    await page.goto('/zh/medications/estrogens/oral/');
    const citations = page.locator('sup a, a[href*="doi.org"]');
    expect(await citations.count()).toBeGreaterThan(0);
  });

  test('GnRH page has usage section', async ({ page }) => {
    await page.goto('/zh/medications/antiandrogens/gnrh-agonists/');
    // Check for the injection technique heading
    await expect(page.locator('h2, h3').filter({ hasText: /使用方法|皮下注射/ }).first()).toBeVisible();
  });

  test('banned drugs page has danger warning', async ({ page }) => {
    await page.goto('/zh/medications/banned-drugs/');
    const danger = page.locator('[role="alert"], .danger');
    expect(await danger.count()).toBeGreaterThan(0);
  });

  test('brand gallery shows brands with index link', async ({ page }) => {
    await page.goto('/zh/medications/estrogens/oral/');
    const gallery = page.locator('text=品牌图鉴').first();
    await expect(gallery).toBeVisible();
    // Index link exists in page (may be in collapsed sidebar or in gallery footer)
    const indexLink = page.locator('a[href*="brand-index"]');
    expect(await indexLink.count()).toBeGreaterThan(0);
  });
});

// ── Footer ──

test.describe('Footer', () => {
  test('footer has legal disclaimer', async ({ page }) => {
    await page.goto('/zh/about/');
    const notice = page.locator('text=不提供处方');
    await expect(notice).toBeVisible();
  });

  test('footer has GitHub link', async ({ page }) => {
    await page.goto('/zh/about/');
    const github = page.locator('a[href*="github.com"]').first();
    await expect(github).toBeVisible();
  });
});

// ── 乐园手账 is the only design ──

test.describe('Sakura-only design', () => {
  test('static HTML ships html.sakura, no toggle, light by default', async ({ page, request }) => {
    const html = await (await request.get('/zh/')).text();
    expect(html).toMatch(/<html[^>]*class="[^"]*\bsakura\b/);
    await page.goto('/zh/');
    await expect(page.locator('html')).toHaveClass(/\bsakura\b/);
    await expect(page.locator('#sakura-toggle')).toHaveCount(0);
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  });

  test('幻月夜 is paused: a stored dark preference still renders light', async ({ page }) => {
    await page.goto('/zh/');
    await page.evaluate(() => localStorage.setItem('starlight-theme', 'dark'));
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await expect(page.locator('starlight-theme-select')).toHaveCount(0);
  });
});
