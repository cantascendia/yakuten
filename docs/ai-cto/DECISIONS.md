# DECISIONS

**Last Updated:** 2026-04-08

关键技术决策记录。

---

## D001 — 选择 Astro + Starlight 而非 Next.js

**决策**：使用 Astro 5 + Starlight 替代 Next.js + 自定义 docs 系统

**理由**：
- Starlight 提供开箱即用的多语言文档框架（侧边栏、i18n 路由、Pagefind 搜索）
- Astro 零 JS 默认，对静态医疗内容站完全合适
- 相比 Next.js，减少约 60% 的基础架构代码量
- MDX 支持允许嵌入自定义医疗组件（CitationRef、DangerBox 等）

**代价**：Starlight 的 CSS 覆盖复杂（需要 `:root[data-theme]` 选择器），视觉定制难度较高。

---

## D002 — AI 模型选择（待迁移）

**当前状态**：使用 Google Gemini Flash（`gemini-2.0-flash-preview`）

**问题**：
- CLAUDE.md 明确指定应使用 Claude Sonnet（`claude-sonnet-4-6`）
- Gemini 对跨性别医疗领域的回答质量低于 Claude
- 当前模型 ID 可能已过时

**决策**：Phase 4B 中将 `api/ai-chat.ts` 迁移至 Anthropic SDK + Claude Sonnet

**影响文件**：`api/ai-chat.ts`，Vercel 环境变量（`GEMINI_API_KEY` → `ANTHROPIC_API_KEY`）

---

## D003 — 静态优先 SSG 策略

**决策**：所有医疗内容页面使用静态生成（SSG），不使用 SSR

**理由**：
- 医疗内容不需要动态渲染
- 静态页面 CDN 分发，全球低延迟
- 减少服务器成本和维护复杂度
- 静态页面便于 Pagefind 全文索引

**例外**：`api/ai-chat.ts` 是 Vercel Edge Function（动态）

---

## D004 — 医院数据结构设计

**决策**：使用 `verificationLevel: 'community-verified' | 'community-reported'` 区分数据质量

**理由**：
- 医疗资源数据准确性至关重要，需要明确信息质量等级
- 避免直接声明"已核实"但实际可能过时
- 用户可据此判断就诊前是否需要额外核实

**数据文件**：`src/data/hospitals.json`（8 家医院，6 省市）

---

## D005 — 不使用 Tailwind

**决策**：所有样式使用原生 CSS Variables，不引入 Tailwind

**理由**：
- 米哈游毛玻璃风格需要复杂的 CSS（clip-path、backdrop-filter、渐变），Tailwind utility 不擅长
- CSS Variables 允许在 Starlight 主题系统内优雅覆盖
- Astro component scoped styles 减少样式冲突

---

## D006 — React Islands 交互策略

**决策**：默认 `client:visible`（懒加载），全局 AI 浮动按钮用 `client:load`

**理由**：
- `client:visible`：确保大多数用户不下载不需要的 JS
- AI 聊天浮动按钮需要 `client:load` 确保立即可用
- Astro Islands 允许精确控制水合时机

---

## D007 — i18n 内容策略

**决策**：中文为完整内容，英日为核心 5 页子集

**理由**：
- 主要用户是中文读者，优先保证中文内容质量
- 英文/日文翻译成本高，先覆盖最高流量页面（首页、用药路径、风险、剂量限制）
- 医药详解页面翻译复杂（含引用、专业术语），推迟到 Phase 5

---

## D008 — 紧急横幅不可关闭

**决策**：`EmergencyBanner` 组件无关闭按钮，始终显示

**理由**：
- 与中国 DIY HRT 风险相关的紧急信息（血栓、肝损伤）属于安全底线
- 若用户可关闭，可能在紧急情况发生时错过关键信息
- CLAUDE.md 明确禁止弱化紧急横幅

---

## D009 — Pathway 时间线布局选择

**决策**：使用左对齐单列时间线，放弃两列交替设计

**背景**：原设计尝试左列标签 + 右列内容的两列交替布局，因 Starlight 内容区宽度约 720px，两列各 360px 太窄，无法容纳内容。CSS `order` 属性在网格布局中无法实现真正的交替效果（需要 JavaScript）。

**解决方案**：左边线 + 节点标记 + 完整内容卡片，类似传统垂直时间轴。

**影响文件**：`src/styles/pathway.css`，`src/content/docs/zh/pathway.mdx`（及 en/ja 版）
