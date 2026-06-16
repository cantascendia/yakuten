# ARCHITECTURE

**Last Updated:** 2026-04-23

## 技术栈

| 层 | 技术 | 版本 | 说明 |
|----|------|------|------|
| 框架 | Astro | 6.0.x | SSG + Islands |
| Docs 主题 | Starlight | 0.38.x | 提供侧边栏、导航、搜索框架 |
| 交互 | React | 19.2.x | Islands 模式，`client:visible` / `client:load` |
| 内容 | MDX | - | 含自定义组件 |
| 样式 | CSS Variables | - | 无 Tailwind，纯 CSS（多层皮肤） |
| 搜索 | Pagefind | - | 静态四语索引 |
| i18n | Astro native | - | `/zh/`, `/en/`, `/ja/`, `/ko/` 路由 |
| 部署 | Vercel | - | 静态 + Edge Functions + Analytics + Speed Insights |
| AI | Gemini | `gemini-3-flash-preview` | via `@ai-sdk/google` + `ai` SDK，Vercel Edge Function |
| 图像处理 | Sharp | 0.34.x | OG 图像生成 |
| 字体 | Google Fonts | - | Noto Serif SC / Sans SC / JetBrains Mono |
| 测试 | Playwright | 1.59.x | 28 项 E2E |
| 代码质量 | ESLint 9 + Prettier 3.8 | - | flat config |

---

## 目录结构

```
src/
  components/
    ThemeToggle.astro              # 米哈游 ↔ Sakura 皮肤切换
    interactive/                   # React Islands
      AIAssistant.tsx
      BloodTestChecker.tsx
      BloodTestCheckerRouter.tsx   # v3.2 router（→ b32 sakura 手账）
      blood-b32/                   # Sakura 手账模式专用追踪器
      DoseSimulator.tsx
      DrugBrandIndex.tsx
      DrugCards.tsx
      DrugComparator.tsx
      FloatingAIChat.tsx           # 全局浮动 AI 入口（client:load）
      InjectionCalculator.tsx
      ParticleCanvas.tsx
      ReferenceLibrary.tsx
      RiskScreener.tsx
    layout/
      ActionCards.astro
      BlogHeader.astro             # Phase 11 新增
      DrugQuickNav.astro
      GuideScenarioStrip.astro
      HeroSection.astro
      MissionStatement.astro
      ParticleBackground.astro
      SiteFooter.astro
      SplashNav.astro
      TrustPillars.astro           # Phase 11 新增（首页信任支柱）
    overrides/                     # Starlight 覆盖
      Head.astro                   # JSON-LD + fonts + hreflang + og:locale
      Footer.astro
      SiteTitle.astro
    seo/                           # Phase 11 新增
      JsonLd.astro                 # Drug / ScholarlyArticle / FAQPage / MedicalCondition
      BlogPostJsonLd.astro         # Article schema（博客专用）
      FaqSchema.astro              # FAQPage schema（独立可复用）
    ui/
      DangerBox.astro
      GlassCard.astro
      HospitalCard.astro
      InfoBox.astro
      WarningBox.astro
  layouts/
    BlogPostLayout.astro           # Phase 11 新增（博客专用 layout）
  content/
    docs/
      zh/                          # 中文（主语言）— 55 页（含 compare/、guides/、tools/、medications/）
      en/                          # 44 页
      ja/                          # 44 页
      ko/                          # 44 页
    blog/
      zh/                          # 14 篇博客（仅 zh，Phase 11）
  pages/
    zh/blog/
      index.astro                  # 博客索引
      [slug].astro                 # 博客动态路由（吃 BlogPostLayout）
  data/
    drugs.json                     # 20 药物
    drug-brands.json               # 58 品牌
    blood-ranges.json              # 7 项指标
    references.json                # 22 文献
    hospitals.json                 # 15 医院
    hotlines.json
    injection-doses.json
  i18n/
    ui.ts                          # 四语 UI 字符串
  styles/
    global.css                     # CSS variables 主定义
    glass.css                      # 米哈游毛玻璃组件
    emergency.css                  # 紧急横幅
    pathway.css                    # 用药路径时间线
    blog.css                       # Phase 11 新增（博客版式）
    starlight-override.css
    sakura-theme.css               # Sakura 皮肤令牌（仅 html.sakura 激活）
    sakura-skin.css                # Sakura DOM 重塑
    sakura-components.css          # Sakura 组件级样式
    blood-b32.css                  # 血检手账 v3.2 样式
api/
  ai-chat.ts                       # Vercel Edge Function（Gemini 3 Flash Preview）
scripts/
  validate-content.mjs             # 构建前内容校验 + 90 天新鲜度告警
  audit-seo-meta.mjs               # SEO meta 审计
  generate-images.mjs              # Gemini 流水线（多语图像）
  generate-og-images.mjs           # 构建后自动 OG 图（Sharp）
  inject-sitemap-lastmod.mjs       # 构建后自动 sitemap lastmod
  inject-drug-frontmatter.mjs      # 注入 drugs.json 字段到 MDX frontmatter
  inject-faqs-frontmatter.mjs      # 注入 FAQ frontmatter（驱动 FaqSchema）
  inject-compare-links.mjs         # 自动生成 compare 交叉链接
  image-manifest.json              # Gemini 多语图像清单
  gpt-image-2-manifest.json        # gpt-image-2 人工生成清单（zh，2026-04-23）
  seo/                             # Phase 11 新增 — SEO 自动化套件
    fetch-gsc.mjs                  # Google Search Console 拉取
    fetch-trends.mjs               # Google Trends 拉取
    refresh-keyword-gap.mjs        # 合成 keyword-gap snapshot
public/
  images/
    diagrams/
      zh/                          # 42 张（含 gpt-image-2 15 张 + codex 16 张图解 + Gemini 余）
      en/, ja/, ko/                # Gemini 多语版本
      drugs/                       # 药物示意图
      source/                      # 原始素材（gitignored）
.github/
  workflows/
    ci.yml                         # 内容验证 + TS 检查 + 构建
    seo-refresh.yml                # 月度（每月 1 号 02:30 UTC）SEO 快照 PR
```

---

## 架构约束

1. **零 JS 默认** — Astro 纯静态，交互仅通过 React Islands
2. **引用强制** — 所有医疗声明需 `<CitationRef>`，无引用不发布
3. **纯前端工具** — 血检 / 计算器 / 模拟器零数据传输，无后端存储
4. **AI 无状态** — 对话不持久化，不存储用户数据
5. **第三方分析仅聚合** — Vercel Analytics + Google Analytics 4（`PUBLIC_GA_ID` 控制，均带 `yakuten-dev` opt-out），仅采集聚合 PV/事件，不上报健康数据/用户输入/血检记录；无 FB/TikTok 等广告社媒像素；GA gtag 在大陆被墙，大陆以 Bing 站长 + Vercel 为准
6. **颜色变量化** — 所有颜色通过 CSS variables，不硬编码
7. **动画限制** — 仅 transform + opacity，需 `prefers-reduced-motion` fallback
8. **紧急横幅不可关闭** — 红底白字，无关闭按钮
9. **皮肤隔离** — Sakura 皮肤通过 `html.sakura` 类前缀，与默认米哈游皮肤物理隔离，互不影响
10. **API key 环境变量化** — 严禁硬编码（2026-04 已修复 Google API key 历史泄漏）

---

## 视觉设计系统

### 主皮肤：米哈游「二相乐园」

```css
--color-primary: #C84B7C;  /* 绯色 */
--color-accent: #D4A853;   /* 幻月金 */
--glass-bg: rgba(26,22,37,0.6);
--glass-blur: blur(12px);
--glass-border: 1px solid rgba(200, 75, 124, 0.15);
--clip-corner: polygon(0 0, calc(100%-16px) 0, 100% 16px, 100% 100%, 16px 100%, 0 calc(100%-16px));
```

### 副皮肤：Sakura「手账」

- 触发：`<html class="sakura">`（通过 `ThemeToggle.astro` 切换）
- 三层 CSS：`sakura-theme.css`（令牌）→ `sakura-skin.css`（DOM 重塑）→ `sakura-components.css`（组件）
- 设计语言：手写体 + 浅粉色卡片，类似纸质手账
- 兼容性：保留 Starlight sidebar / search / TOC，仅重塑视觉层
- 配套：`BloodTestCheckerRouter.tsx` 在 sakura 模式下走 `blood-b32/` 路径（v3.2 「血检手账」追踪器）

---

## SEO / AEO 架构

```
构建时:
  validate-content.mjs → astro build → inject-sitemap-lastmod.mjs → generate-og-images.mjs

页面级:
  Head.astro
    ├─ hreflang × 4（zh/en/ja/ko + x-default）
    ├─ og:locale + alternate
    ├─ canonical
    └─ JsonLd 注入（自动 frontmatter 驱动）
        ├─ JsonLd.astro     ← Drug / ScholarlyArticle / MedicalCondition / FAQPage / Breadcrumb
        ├─ BlogPostJsonLd   ← Article + headline + datePublished + author
        └─ FaqSchema        ← FAQPage（faqs[] frontmatter 驱动）

GEO（生成式引擎优化）:
  llms.txt                  ← 站点结构 + 证据标准 + 引用格式 + GEO 扩展条目

月度自动化（GitHub Actions seo-refresh.yml）:
  fetch-gsc.mjs             ← GSC API（Service Account JSON）
  fetch-trends.mjs          ← google-trends-api（无凭证）
  refresh-keyword-gap.mjs   ← 合成 docs/seo-keyword-gap.md AUTO-SNAPSHOT 块
  → 自动 PR (peter-evans/create-pull-request@v6)
```

---

## AI 聊天架构

```
用户 → FloatingAIChat.tsx (React, client:load)
     → AIAssistant.tsx (聊天 UI + 状态管理)
     → POST /api/ai-chat (Vercel Edge Function, runtime: 'edge')
     → @ai-sdk/google + ai SDK
     → Gemini 3 Flash Preview API
     → 流式响应回 UI
```

- 模型：`gemini-3-flash-preview`
- 速率限制：5 req/min per IP（Edge Function 内存 Map，非持久；冷启动后重置）
- API key：`GOOGLE_GENERATIVE_AI_API_KEY` 环境变量（Vercel）— 严禁硬编码
- 系统提示注入：`references.json` 摘要

---

## i18n 架构

- `defaultLocale: 'zh'` — 中文为默认语言
- 四语：`/zh/`, `/en/`, `/ja/`, `/ko/`
- 内容文件：`src/content/docs/{locale}/page.mdx`
- UI 字符串：`src/i18n/ui.ts` → `useTranslations(lang)` hook
- Starlight 侧边栏：每条目有 `translations` 字段
- Sidebar：6 折叠组（开始 / 安全底线 / 实操指南 / 药物详解 / 工具 / 关于）
- Pagefind 索引：四语全文搜索
- **Phase 11 i18n 缺口**：`src/content/blog/zh/`、`src/content/docs/zh/compare/`、editorial-policy / methodology / medical-advisors 仅 zh

---

## 图像生成流水线

两条流水线并存，按 locale 分流：

| 流水线 | 用途 | 触发 | locale | 状态 |
|--------|------|------|--------|------|
| Gemini（`scripts/generate-images.mjs` + `image-manifest.json`） | 多语自动生成图解 | 手动脚本 | en / ja / ko 主要 | 仍在用 |
| gpt-image-2（ChatGPT web UI + `scripts/gpt-image-2-manifest.json`） | 高质量人工生成 | 手动（ChatGPT 网页） | zh 替换层 | 2026-04-23 单批 15 张 |

> ⚠ `gpt-image-2-manifest.json` 标注 "Do not regenerate via scripts/generate-images.mjs" — 这是人工产物，禁止脚本覆盖。

---

## 关键文件地图

| 文件 | 用途 |
|------|------|
| `astro.config.mjs` | 多语言路由、Starlight 配置、6 组侧边栏、SEO meta、CSS 加载顺序 |
| `src/styles/global.css` | 所有 CSS variables 主定义 |
| `src/i18n/ui.ts` | UI 字符串四语翻译 |
| `src/data/drugs.json` | 结构化药物数据（20 种） |
| `src/data/hospitals.json` | 友好医院数据库（15 家） |
| `src/data/references.json` | 文献引用数据库（22 条，18 DOI） |
| `api/ai-chat.ts` | AI 聊天 Edge Function（Gemini 3 Flash Preview） |
| `src/components/interactive/FloatingAIChat.tsx` | 全局 AI 入口，全页面浮动 |
| `src/components/seo/JsonLd.astro` | 结构化数据中央注入点 |
| `src/components/ThemeToggle.astro` | 米哈游 ↔ Sakura 皮肤切换 |
| `scripts/seo/refresh-keyword-gap.mjs` | SEO 月度 keyword-gap 合成 |
| `scripts/gpt-image-2-manifest.json` | 高质量配图 prompt 锁定 |
| `.github/workflows/seo-refresh.yml` | SEO 月度自动 PR |
