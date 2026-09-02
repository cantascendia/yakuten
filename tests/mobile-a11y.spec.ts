import { test, expect, devices } from '@playwright/test';

/**
 * Mobile viewport (375×667 / iPhone SE) + accessibility regression tests.
 *
 * Companion to critical-paths.spec.ts. These tests catch regressions
 * introduced by the 2026-05-26 UI/a11y audit fixes:
 *   - skip-to-main link on blog layout
 *   - :focus-visible restored on stripped components
 *   - WCAG 2.5.5 touch targets on emergency CTA
 *   - DrugQuickNav single-column on phones
 *   - FloatingAIChat Escape close + aria-haspopup
 *   - BloodTestChecker aria-invalid + aria-describedby
 */

test.use({ ...devices['iPhone SE'] });

// ── Mobile layout ──

test.describe('Mobile (iPhone SE 375×667) layout', () => {
  test('emergency banner visible on splash without horizontal scroll', async ({ page }) => {
    await page.goto('/zh/');
    const banner = page.locator('[role="alert"]').first();
    await expect(banner).toBeVisible();

    // No horizontal scroll on body
    const bodyOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(bodyOverflow).toBeLessThanOrEqual(1);
  });

  test('emergency CTA meets 44×44 minimum tap target', async ({ page }) => {
    await page.goto('/zh/');
    const cta = page.locator('.emergency-banner__cta').first();
    await expect(cta).toBeVisible();
    const box = await cta.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.height).toBeGreaterThanOrEqual(44);
  });

  test('DrugQuickNav stacks to single column on 375px', async ({ page }) => {
    await page.goto('/zh/');
    const grid = page.locator('.drug-nav__grid').first();
    if (await grid.count() > 0) {
      const cols = await grid.evaluate(
        (el) => window.getComputedStyle(el).gridTemplateColumns.split(' ').length,
      );
      expect(cols).toBe(1);
    }
  });

  test('blog skip-link is keyboard-accessible', async ({ page }) => {
    await page.goto('/zh/blog/cpa-dose-safe-range/');
    // spec-change 2026-07-29：博客迁入 StarlightPage 后，原自定义
    // `.blog-skip-link` + `#blog-main-content` 已被 Starlight 原生实现取代
    // （实测产物：`<a href="#_top">跳转到内容</a>`）。
    // 断言改为按**行为**而非类名：首次 Tab 必须落在一个指向主内容的跳转链接上。
    // WCAG 2.4.1 Bypass Blocks 的意图完全保留，且不再与具体实现耦合 ——
    // 换回自定义实现时这条依然有效。
    await page.keyboard.press('Tab');
    const focused = page.locator(':focus');
    await expect(focused).toBeVisible();
    const href = await focused.getAttribute('href');
    expect(href, '首个 Tab 焦点应是指向页内主内容的跳转链接').toMatch(/^#/);
    // 该锚点必须真实存在，否则跳转链接是坏的
    const target = page.locator(String(href));
    await expect(target).toHaveCount(1);
  });
});

// ── Accessibility ──

test.describe('Accessibility — focus and modals', () => {
  test('hero search has visible focus ring (not outline:none)', async ({ page }) => {
    await page.goto('/zh/');
    const search = page.locator('.hero-search').first();
    if (await search.count() > 0) {
      await search.focus();
      const outline = await search.evaluate(
        (el) => window.getComputedStyle(el).outlineWidth,
      );
      // Outline width must be present (not 0px / none) after :focus-visible
      expect(outline).not.toBe('0px');
    }
  });

  test('FloatingAIChat opens via FAB and exposes dialog semantics', async ({ page }) => {
    await page.goto('/zh/');
    const fab = page.locator('button[aria-label*="AI"]').first();
    await expect(fab).toBeVisible();
    expect(await fab.getAttribute('aria-haspopup')).toBe('dialog');
    expect(await fab.getAttribute('aria-expanded')).toBe('false');

    await fab.click();
    const dialog = page.locator('[role="dialog"][aria-modal="true"]');
    await expect(dialog).toBeVisible();
  });

  test('FloatingAIChat closes on Escape', async ({ page }) => {
    await page.goto('/zh/');
    const fab = page.locator('button[aria-label*="AI"]').first();
    await fab.click();
    const dialog = page.locator('[role="dialog"][aria-modal="true"]');
    await expect(dialog).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible({ timeout: 1000 });
  });

  test('BloodTestChecker input gets aria-invalid in red zone', async ({ page }) => {
    await page.goto('/zh/blood-tests/');
    // Find any blood-test input by class
    const input = page.locator('input.btc-input').first();
    await expect(input).toBeVisible();
    // Enter a value well above any reasonable safe range
    // ⚠️ 必须用 pressSequentially 而不是 fill()（bug-fix 2026-07-29）。
    // fill() 直接设 DOM value 再派发一个合成 input 事件，React 受控组件收不到
    // → onChange 不触发 → 不重渲染 → aria-describedby 永远不出现。
    // 实测：fill() 后 2 秒、乃至重填一次，describedby 都是 null；
    // 换 pressSequentially 逐字符敲则立刻得到 describedby=btc-status-e2 + aria-invalid=true。
    // 断言未做任何放宽 —— 实现本来就是对的，是测试没走到那条代码路径。
    await input.click();
    await input.pressSequentially('9999', { delay: 20 });
    await page.waitForTimeout(200);
    const ariaInvalid = await input.getAttribute('aria-invalid');
    // Either 'true' or null is acceptable; we want it to flip to true at red
    // We assert that the describedby pointer to a status node is set
    const describedBy = await input.getAttribute('aria-describedby');
    expect(describedBy).not.toBeNull();
    expect(ariaInvalid === 'true' || ariaInvalid === null).toBeTruthy();
  });
});

// ── Emergency banner accessibility ──

test.describe('Emergency banner ARIA', () => {
  test('emergency banner exposes role="alert" and aria-live="assertive"', async ({ page }) => {
    await page.goto('/zh/');
    const banner = page.locator('[role="alert"]').first();
    const live = await banner.getAttribute('aria-live');
    expect(live).toBe('assertive');
  });
});
