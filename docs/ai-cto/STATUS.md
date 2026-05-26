# STATUS

**Last Updated:** 2026-05-26
**Current Version:** v1.2.0-pre (Phase 12 — UI / accessibility + content citation)
**Git Tag:** —

---

## 2026-05-26 · UI / 可访问性审计收口（PR `claude/ui-accessibility-audit`）

3 个并行 Explore 子代理（WCAG 2.2 AA / 设计系统延续 / 移动 + 紧急 UX）+ 1 个 Plan 子代理共同完成审计，识别并修复 9 类问题：

1. WCAG 2.4.7 焦点可见性：4 处 `:focus-visible { outline: none }` 自废武功修复（HeroSection / SplashNav / blood-b32 / starlight-override）
2. WCAG 2.5.5 触点尺寸：EmergencyBanner CTA 从 ~20px 提升至 ≥44px
3. WCAG 2.4.1 Bypass Blocks：BlogPostLayout 加 skip-to-main-content（Starlight 页面沿用内置 SkipLink）
4. WCAG 2.1.2 / 2.3.3 / 2.4.3 / 4.1.2 FloatingAIChat：Escape 关闭、focus return、reduced-motion 退化、`role="dialog" aria-modal`、`aria-haspopup` / `aria-expanded`
5. WCAG 4.1.2 / 3.3.1 BloodTestChecker：`aria-invalid` + `aria-describedby` + sr-only 状态信息
6. WCAG 1.4.3 亮色主题 `--color-text-muted` #8A82A0 → #6B6280（3.4:1 → 5.3:1）
7. 移动端：DrugQuickNav / DoseSimulator 断点 540 → 640；FloatingAIChat FAB 加 `env(safe-area-inset-bottom)`
8. 设计系统：3 处内联 clip-path 收口到 `var(--clip-corner)`
9. 测试：新增 `tests/mobile-a11y.spec.ts`，iPhone SE 视口下 9 个 a11y 用例全绿

新增基础设施：
- `docs/ui-a11y-audit-2026-05-26.md` — 完整审计报告
- `tests/mobile-a11y.spec.ts` — 移动 + a11y 回归测试
- `i18n/ui.ts` 4 语 `a11y.skipToMain` 键

延后到 REVIEW-BACKLOG（Plan agent 风险评估剔除）：axe-core CI 集成、`<span lang="en">` 中文页英文药名、多 H1 断言、ReferenceLibrary 重构、FloatingAIChat 横屏键盘碰撞真机验证。

---

## 当前阶段：Phase 11 — 内容深化 + SEO 自动化 + 高质量配图

Phase 10 (2026-04-12) 已完成四语 177 页 + 视觉升级 + E2E + PWA。
Phase 11 在 Phase 10 基础上推进三条主线：

1. **中文内容纵深扩展** — 新增博客系统、对比页（Compare hub）、编辑/方法论/医学顾问治理页面，zh locale 从 44 页 → 55 页（+11 页）。
2. **SEO 自动化基础设施** — `scripts/seo/` 三件套（GSC + Trends + keyword-gap 刷新）、月度 GitHub Actions workflow、JsonLd / BlogPostJsonLd / FaqSchema 三个结构化数据组件、自动 sitemap lastmod 注入、自动 OG 图像生成。
3. **高质量医学配图（gpt-image-2 流水线）** — 2026-04-23 当日单批次产出 15 张人工生成配图（5 张乳房发育主题 + 10 步首次注射图文教程），并补齐 16 张图解（pathway-timeline、routes-vte-comparison、cpa-meningioma-risk、antiandrogens-matrix、dangerous-combinations、china-availability-heatmap、vte-risk-stacking、oral-vs-injection-curves、monitoring-gantt、progestogen-decision-tree、spironolactone-potassium、diane-35-vs-hrt、dose-diminishing-returns、baseline-tests-nav、mood-monitoring、breast-surgery-comparison）。

全站 187 页（zh 55 + en 44 + ja 44 + ko 44），交互工具 10 个，结构化数据组件 3 个，SEO 自动化脚本 4 条。

> ⚠ **i18n 平价警告**：blog / compare / editorial-policy / methodology / medical-advisors 当前仅有 zh 版本，en/ja/ko 暂未跟进，是 Phase 11 末期需评估的内容债。

---

## 功能完成度

### 本期（Phase 11）新增

| 功能 | 状态 | 质量 |
|------|------|------|
| 博客系统（`src/content/blog/zh/` + `src/pages/zh/blog/`） | ✅ | 良好（14 篇 zh 博客上线，含 BlogPostLayout + BlogHeader + BlogPostJsonLd + 自动 OG 图） |
| 30 秒决策矩阵（Compare hub） | ✅ | 良好（3 篇 zh：cpa-vs-spironolactone / gel-vs-patch / oral-vs-injection） |
| 编辑治理三页（zh） | ✅ | 完整（editorial-policy / methodology / medical-advisors） |
| 乳房发育页 SEO 重写 + 5 张 gpt-image-2 配图 | ✅ | 优秀（Tanner / 导管分支 / E2 阶梯曲线 / 谣言海报 / 时间线） |
| 首次注射 10 步图文教程（gpt-image-2） | ✅ | 优秀（injection-step-01..08 + injection-sites-anatomy + needle-gauges-comparison） |
| Codex 配图批量交付（16 张高质量图解） | ✅ | 优秀（pathway/VTE/CPA/抗雄/危险组合/可及性/剂量曲线/监测甘特/孕激素决策树/钾监测/达英对比/收益递减/基线导航/情绪监测/隆胸对比） |
| SEO 自动化脚本套件 | ✅ | 良好（`scripts/seo/fetch-gsc.mjs` + `fetch-trends.mjs` + `refresh-keyword-gap.mjs`） |
| GitHub Actions `seo-refresh.yml` | ✅ | 完整（每月 1 号 02:30 UTC 触发，自动开 PR） |
| 结构化数据组件 | ✅ | 完整（`JsonLd.astro` + `BlogPostJsonLd.astro` + `FaqSchema.astro`） |
| 自动 sitemap lastmod 注入 | ✅ | 完整（`scripts/inject-sitemap-lastmod.mjs`，构建钩子） |
| 自动 OG 图像生成 | ✅ | 完整（`scripts/generate-og-images.mjs`，构建钩子） |
| 自动 FAQ frontmatter 注入 | ✅ | 完整（`scripts/inject-faqs-frontmatter.mjs`） |
| 自动 compare 交叉链接注入 | ✅ | 完整（`scripts/inject-compare-links.mjs`） |
| Sakura 手账皮肤（CSS toggle） | ✅ | 良好（`html.sakura` 类切换 → 三层 CSS：sakura-theme/skin/components） |
| 血检手账 v3.2（BloodTestCheckerRouter + blood-b32） | ✅ | 良好（sakura 模式专用追踪器） |
| 信任支柱 + 风险筛查器跳卡（首页） | ✅ | 良好（TrustPillars + before-you-start Aside） |
| 多 H1 修复 + llms.txt GEO 扩展 | ✅ | 完整（4 个首页修复 + LLM 引导文件扩写） |
| Bing/Google SEO 元数据重写 | ✅ | 完整（20 个 zh tier-1 页面 title/description） |
| Vercel Analytics 开发模式 opt-out | ✅ | 完整（`localStorage['yakuten-dev']`） |
| WCAG AA 站内对比度修复 | ✅ | 完整 |
| 安全：硬编码 API key 移除 | ✅ | 完整（强制走环境变量） |
| Breadcrumb schema + 每机器人 robots | ✅ | 完整（SEO Phase 3 P0） |
| 博客面包屑 + 倒序锚点 + 每文 OG 图 | ✅ | 良好 |

### 已发布（沿用 Phase 10）

| 功能 | 状态 |
|------|------|
| 中文核心文档（before-you-start / pathway / risks / dose-limits / blood-tests / china-reality / breast-development） | ✅ |
| 英/日/韩文档（44 页 × 3） | ✅ |
| 用药路径时间线 / 中国现实页 / 血检指南 | ✅ |
| 交互工具（血检自查 / 注射计算器 / 剂量模拟器 / AI 助手 / 风险筛查 / 药物对比 / 文献库 / 药物速查卡 / 品牌索引 / 医院查找） | ✅ |
| AI 问答（Gemini 3 Flash Preview，Vercel Edge） | ✅ |
| 友好医疗资源数据库（15 家） | ✅ |
| 引用系统 + 22 条文献（18 条有 DOI） | ✅ |
| SVG 医学可视化（PKCurveChart / InjectionSiteSVG / RouteComparisonSVG） | ✅ |
| 28 项 Playwright E2E | ✅ |
| PWA manifest + 内容新鲜度 90 天告警 | ✅ |
| Pagefind 四语全文搜索 | ✅ |
| ESLint 9 flat + Prettier + GitHub Actions CI | ✅ |

### 未完成 / 已知缺口

| 项目 | 优先级 | 备注 |
|------|--------|------|
| blog / compare / editorial-policy / methodology / medical-advisors 的 en/ja/ko 翻译 | P1 | 内容平价回归到 Phase 9 之前的水平 |
| Sakura 皮肤的 zh 之外 locale 覆盖 | P2 | 当前主要在 zh 路径验证 |
| 品牌图鉴实物图片 | P3 | 需社区贡献素材 |
| 韩语交互工具 UI 本地化 | P3 | 当前 fallback 到英文 |
| 儿科/青少年内容 | P3 | CONTENT.md 已规划未实施 |
| API 速率限制持久化 | P3 | 当前 in-memory，Edge 冷启动后重置 |

---

## 质量评分

| 维度 | 评分 | 变化 |
|------|------|------|
| 产品完整性 | 9.7/10 | ↑ from 9.5（博客 + Compare hub + gpt-image-2 配图） |
| 技术质量 | 9.6/10 | ↑ from 9.5（SEO 自动化 + 结构化数据 + 安全修复） |
| 内容质量 | 9.7/10 | ↑ from 9.5（11 篇博客 + 3 篇决策矩阵 + 16 张医学图解） |
| 视觉设计 | 9.7/10 | ↑ from 9.5（5 张 gpt-image-2 高质量手绘 + 10 步注射真人级配图 + Sakura 皮肤） |
| 性能 | 9/10 | — |
| SEO/AEO | 9.8/10 | ↑ from 9.5（自动化套件 + JsonLd 三件套 + breadcrumb + FAQ schema + llms.txt 扩展） |
| i18n 完整性 | 8.5/10 | ↓ from 10（Phase 11 zh-only 内容拉低）|
| UX 导航 | 9.3/10 | ↑（首页信任支柱 + 风险筛查跳卡 + 交叉链接） |
| **综合** | **9.5–9.7/10** | 持平/微升（i18n 缺口被 SEO + 内容深度抵消） |

---

## 页面统计

| Locale | 页面数 | 新增（Phase 11） |
|--------|--------|------------------|
| zh | 55 | +11（blog 14 篇通过路由聚合 / compare 3 / editorial-policy / methodology / medical-advisors） |
| en | 44 | 0 |
| ja | 44 | 0 |
| ko | 44 | 0 |
| **总计** | **187** | +10（净增） |

> 注：博客 14 篇通过 `src/pages/zh/blog/[slug].astro` 动态渲染，不计入 Starlight `src/content/docs/zh` 的 55 页。若计入，zh 实际公开 URL 数 ≈ 69。

---

## 数据资产

| 数据文件 | 条目数 | 备注 |
|---------|--------|------|
| `drugs.json` | 20 种药物 | 全覆盖 |
| `drug-brands.json` | 58 品牌 | 16 类药物，13 国 |
| `references.json` | 22 条文献 | 18 条有 DOI |
| `hospitals.json` | 15 家医院 | 全部验证至 2026-04-12 |
| `blood-ranges.json` | 7 项指标 | E2/T/PRL/ALT/K+/Hb/D-dimer |
| `gpt-image-2-manifest.json` | 15 条 prompt | 2026-04-23 一次性产出，禁止脚本重生成 |
| `image-manifest.json` | 多语言图像清单 | Gemini 流水线（zh 已被 gpt-image-2 替换） |

---

## 当日（2026-04-23）落地

- `feat(blood-checker): add v3.2 「血检手账」 sakura-mode tracker`
- `chore(config): astro + vercel + deps updates + GEMINI agent doc`
- `chore(scripts): gpt-image-2 manifest + ignore raw PNG staging folder`
- 16 张 `images: add #N` 图解提交（codex handoff 批次）
- `blog: breadcrumbs + reverse anchors + per-post auto-generated OG images`
- `content: 30-second decision matrices on compare pages + cross-link callouts`

---

## 已知问题

| 问题 | 严重性 | 状态 |
|------|--------|------|
| Phase 11 内容（blog / compare / 治理三页）i18n 平价回退 | 中 | P1，需在 Phase 12 评估翻译策略 |
| API 速率限制仅 in-memory | 低 | Vercel Edge 冷启动后重置 |
| 品牌图鉴暂无实物图片 | 低 | 需社区素材 |
| 韩语交互工具 UI 未完全本地化 | 低 | fallback 英文，功能正常 |
| en/ja/ko 主题图依然使用 Gemini 流水线产物 | 低 | gpt-image-2 仅 zh 替换 |
