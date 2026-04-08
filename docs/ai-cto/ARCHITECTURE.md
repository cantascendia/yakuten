# ARCHITECTURE

**Last Updated:** 2026-04-08

## 技术栈

| 层 | 技术 | 版本 | 说明 |
|----|------|------|------|
| 框架 | Astro | 5.x | SSG + Islands |
| Docs 主题 | Starlight | latest | 提供侧边栏、导航、搜索框架 |
| 交互 | React | 18 | Islands 模式，`client:visible` / `client:load` |
| 内容 | MDX | - | 含自定义组件 |
| 样式 | CSS Variables | - | 无 Tailwind，纯 CSS |
| 搜索 | Pagefind | - | 静态，支持中文（未集成） |
| i18n | Astro native | - | /zh/, /en/, /ja/ 路由 |
| 部署 | Vercel | - | 静态 + Edge Functions |
| AI | Gemini Flash | - | via Vercel Edge Function |
| 字体 | Google Fonts | - | Noto Serif SC / Sans SC / JetBrains Mono |

## 目录结构

```
src/
  components/
    interactive/     # React Islands
      AIAssistant.tsx
      BloodTestChecker.tsx
      DoseSimulator.tsx
      FloatingAIChat.tsx    # 全局浮动 AI 入口（client:load）
      InjectionCalculator.tsx
    layout/          # Astro 布局组件
      ActionCards.astro
      HeroSection.astro
      MissionStatement.astro
      SiteFooter.astro
      SplashNav.astro      # 首页专用导航
    overrides/       # Starlight 覆盖
      Head.astro           # 自定义 <head>（含 JSON-LD, fonts）
      Footer.astro         # 覆盖 Starlight footer
    seo/
      JsonLd.astro         # JSON-LD schema 注入
    ui/              # 通用 UI 组件
      DangerBox.astro
      GlassCard.astro
      HospitalCard.astro
      InfoBox.astro
      WarningBox.astro
  content/
    docs/
      zh/            # 中文（主语言）— 完整
      en/            # 英文 — 5 核心页
      ja/            # 日文 — 5 核心页
  data/
    drugs.json
    blood-ranges.json
    references.json
    hospitals.json
  i18n/
    ui.ts            # UI 字符串翻译
  styles/
    global.css       # CSS variables 定义
    glass.css        # 毛玻璃组件样式
    emergency.css    # 紧急横幅
    pathway.css      # 用药路径时间线
    starlight-override.css  # Starlight 主题覆盖
api/
  ai-chat.ts         # Vercel Edge Function
```

## 架构约束

1. **零 JS 默认** — Astro 纯静态，交互仅通过 React Islands
2. **引用强制** — 所有医疗声明需 `<CitationRef>` 组件，无引用不发布
3. **纯前端工具** — 血检工具/计算器零数据传输，无后端存储
4. **AI 无状态** — 对话不持久化，无用户数据存储
5. **无第三方 tracking** — 不引入 GA/FB pixel 等追踪脚本
6. **颜色变量化** — 所有颜色通过 CSS variables，不硬编码
7. **动画限制** — 仅 transform + opacity，需 `prefers-reduced-motion` fallback
8. **紧急横幅** — 红底白字，禁止可关闭

## 视觉设计系统

米哈游「二相乐园」风格：

```css
/* 主色 */
--color-primary: #C84B7C;  /* 绯色 */
--color-accent: #D4A853;   /* 幻月金 */

/* 毛玻璃 */
--glass-bg: rgba(26,22,37,0.6);
--glass-blur: blur(12px);
--glass-border: 1px solid rgba(200, 75, 124, 0.15);

/* 对角切角 */
--clip-corner: polygon(0 0, calc(100%-16px) 0, 100% 16px, 100% 100%, 16px 100%, 0 calc(100%-16px));
```

## 关键文件地图

| 文件 | 用途 |
|------|------|
| `astro.config.mjs` | 多语言路由、Starlight 配置、侧边栏、SEO meta |
| `src/styles/global.css` | 所有 CSS variables 定义 |
| `src/i18n/ui.ts` | UI 字符串多语言翻译 |
| `src/data/drugs.json` | 结构化药物数据 |
| `src/data/hospitals.json` | 友好医院数据库（8 家） |
| `src/data/references.json` | 文献引用数据库 |
| `api/ai-chat.ts` | AI 聊天 Edge Function |
| `src/components/interactive/FloatingAIChat.tsx` | 全局 AI 入口，全页面浮动 |

## AI 聊天架构

```
用户 → FloatingAIChat.tsx (React, client:load)
     → AIAssistant.tsx (聊天 UI + 状态管理)
     → POST /api/ai-chat (Vercel Edge Function)
     → Gemini Flash API (Google AI)
     → 流式响应回 UI
```

速率限制：5 req/min per IP（Edge Function 内存 Map，非持久）

## i18n 架构

- `defaultLocale: 'zh'` — 中文为默认语言
- URL 结构：`/zh/page/`, `/en/page/`, `/ja/page/`
- 内容文件：`src/content/docs/{locale}/page.mdx`
- UI 字符串：`src/i18n/ui.ts` → `useTranslations(lang)` hook
- Starlight 侧边栏：每条目有 `translations` 字段
