import { test, expect, devices } from '@playwright/test';

/**
 * Performance + technical SEO regression tests.
 *
 * Companions to critical-paths.spec.ts. These tests catch regressions
 * introduced by the 2026-05-26 perf/SEO audit fixes:
 *   - vercel.json security + cache headers
 *   - Hospital JSON-LD (MedicalOrganization)
 *   - Tool page JSON-LD (SoftwareApplication)
 *   - Blog hreflang correctness
 *   - BlogPostJsonLd → BlogPosting type
 */

test.describe('JSON-LD schema coverage', () => {
  test('tool page emits SoftwareApplication schema', async ({ page }) => {
    await page.goto('/zh/tools/blood-checker/');
    const ldJsons = await page
      .locator('script[type="application/ld+json"]')
      .allTextContents();
    const combined = ldJsons.join('\n');
    expect(combined).toContain('SoftwareApplication');
    expect(combined).toContain('HealthApplication');
  });

  test('hospital cards emit MedicalOrganization schema', async ({ page }) => {
    await page.goto('/zh/tools/hospital-finder/');
    const ldJsons = await page
      .locator('script[type="application/ld+json"]')
      .allTextContents();
    const combined = ldJsons.join('\n');
    expect(combined).toContain('MedicalOrganization');
    expect(combined).toContain('PostalAddress');
    // PKU Third Hospital is the canonical first entry
    expect(combined).toMatch(/北京.*三院|北京大学第三医院/);
  });

  test('blog post uses BlogPosting (not generic Article)', async ({ page }) => {
    await page.goto('/zh/blog/cpa-dose-safe-range/');
    const ldJsons = await page
      .locator('script[type="application/ld+json"]')
      .allTextContents();
    const combined = ldJsons.join('\n');
    expect(combined).toContain('BlogPosting');
  });

  test('drug page emits Drug + MedicalWebPage', async ({ page }) => {
    await page.goto('/zh/medications/antiandrogens/cpa/');
    const ldJsons = await page
      .locator('script[type="application/ld+json"]')
      .allTextContents();
    const combined = ldJsons.join('\n');
    expect(combined).toContain('"@type":"Drug"');
    expect(combined).toContain('MedicalWebPage');
  });
});

test.describe('Hreflang correctness', () => {
  test('docs page declares all 4 locale alternates + x-default', async ({ page }) => {
    await page.goto('/zh/about/');
    const links = page.locator('link[rel="alternate"][hreflang]');
    const hreflangs = await links.evaluateAll((els) =>
      els.map((el) => el.getAttribute('hreflang')),
    );
    expect(hreflangs).toContain('zh-CN');
    expect(hreflangs).toContain('en');
    expect(hreflangs).toContain('ja');
    expect(hreflangs).toContain('ko');
    expect(hreflangs).toContain('x-default');
  });

  test('blog post declares ONLY zh hreflang (not 404 mirrors)', async ({ page }) => {
    await page.goto('/zh/blog/cpa-dose-safe-range/');
    const links = page.locator('link[rel="alternate"][hreflang]');
    const hreflangs = await links.evaluateAll((els) =>
      els.map((el) => el.getAttribute('hreflang')),
    );
    // Should NOT declare en/ja/ko mirrors that don't exist
    expect(hreflangs).not.toContain('en');
    expect(hreflangs).not.toContain('ja');
    expect(hreflangs).not.toContain('ko');
    // But zh-CN + x-default both correct
    expect(hreflangs).toContain('zh-CN');
    expect(hreflangs).toContain('x-default');
  });
});

test.describe('Hydration directives', () => {
  test('BloodTestChecker uses client:visible (not client:load)', async ({ page }) => {
    // Hard to test directive directly — proxy: blood-tests.mdx is a long page
    // (>400 lines). The component must render eventually but not block FCP.
    await page.goto('/zh/blood-tests/');
    await expect(page.locator('h1')).toBeVisible();
    // The component lives at #tool anchor — scroll there to trigger
    // client:visible hydration
    await page.locator('#tool').scrollIntoViewIfNeeded();
    const input = page.locator('input.btc-input').first();
    await expect(input).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Performance markers', () => {
  test('first-load HTML has font preconnect hints', async ({ page }) => {
    await page.goto('/zh/');
    const preconnect = page.locator(
      'link[rel="preconnect"][href*="fonts.googleapis.com"]',
    );
    expect(await preconnect.count()).toBeGreaterThan(0);
  });

  test('Google Fonts URL includes weight 700 for Noto Sans SC', async ({ page }) => {
    await page.goto('/zh/');
    const fontLink = await page
      .locator('link[href*="Noto+Sans+SC"]')
      .first()
      .getAttribute('href');
    expect(fontLink).toMatch(/Noto\+Sans\+SC:wght@[\d;]*700/);
  });
});
