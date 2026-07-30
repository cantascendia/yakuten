import { defineConfig } from '@playwright/test';

/**
 * 两个 webServer：
 *  - 4321 `npm run preview`：既有 spec 跑生产构建产物
 *  - 4322 `astro dev`：遮盖管线的 dev-only 挂载页（/dev/redact-harness/）只在 dev 存在，
 *    生产构建刻意不产出它（见 src/pages/dev/[harness].astro）。所以 V1/V2/V3 硬门控
 *    必须打 dev 服务器，这同时也是「测试页不进 dist/」的结构性保证。
 *
 * webkit project 覆盖 Safari/iOS 引擎（也是国产 App 内 WKWebView 的代理），
 * 可在 ubuntu runner 跑，不需要 macOS runner（SPEC §7.2）。
 * ⚠️ 诚实局限：Playwright 的 WebKit 是桌面构建，不等于真机 iOS Safari，
 * 更不等于微信 WKWebView —— 真机那一道靠 §7.2 的 /dev 自检页人工跑（V11）。
 */
export default defineConfig({
  testDir: './tests',
  timeout: 30000,
  retries: 1,
  use: {
    baseURL: 'http://localhost:4321',
    headless: true,
  },
  webServer: [
    {
      command: 'npm run preview',
      port: 4321,
      reuseExistingServer: true,
      timeout: 60000,
    },
    {
      command: 'npx astro dev --port 4322',
      port: 4322,
      reuseExistingServer: true,
      timeout: 120000,
    },
  ],
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
    // webkit 只跑遮盖隐私门控：既有三个 spec 是按 chromium 写的（Starlight DOM / 性能断言），
    // 把它们一并拉进 webkit 会引入与本轮无关的红灯。需要扩面时再逐个 spec 加。
    { name: 'webkit', use: { browserName: 'webkit' }, testMatch: /redact-privacy\.spec\.ts/ },
  ],
});
