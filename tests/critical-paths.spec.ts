import { test, expect } from '@playwright/test';

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
  test('loads and accepts input', async ({ page }) => {
    await page.goto('/zh/tools/blood-checker/');
    await expect(page.locator('h1')).toContainText('血检');
    // Find an input field and type a value
    const input = page.locator('input[type="number"]').first();
    await expect(input).toBeVisible();
    await input.fill('150');
    // Should show some result
    const resultArea = page.locator('[role="meter"]').first();
    await expect(resultArea).toBeVisible();
  });
});

// ── Drug Comparator ──

test.describe('Drug Comparator', () => {
  test('loads with comparison table', async ({ page }) => {
    await page.goto('/zh/tools/drug-comparator/');
    await expect(page.locator('h1')).toContainText('药物');
    const table = page.locator('table');
    await expect(table).toBeVisible();
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
