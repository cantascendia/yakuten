# DECISIONS

**Last Updated:** 2026-04-23

关键技术决策记录。

---

## D001 — 选择 Astro + Starlight 而非 Next.js

**决策**：使用 Astro 6 + Starlight 0.38 替代 Next.js + 自定义 docs 系统

**理由**：
- Starlight 提供开箱即用的多语言文档框架（侧边栏、i18n 路由、Pagefind 搜索）
- Astro 零 JS 默认，对静态医疗内容站完全合适
- 相比 Next.js，减少约 60% 的基础架构代码量
- MDX 支持允许嵌入自定义医疗组件（CitationRef、DangerBox、JsonLd 等）

**代价**：Starlight 的 CSS 覆盖复杂（需要 `:root[data-theme]` 选择器），视觉定制难度较高（已通过 Sakura 副皮肤验证可解 — 见 D010）。

**状态**：已落地，无回退打算。

---

## D002 — AI 模型：锁定 Google Gemini

> **部分修订**（2026-07-29，见 D018）：本条「不迁移到 Claude / OpenAI」的主张
> **继续有效** —— 主供应商仍是 Google Gemini，且不迁移到 Claude / OpenAI。被修订的
> 是本条隐含的「单供应商」架构假设：自 D018 起，DeepSeek 作为 **Google 全链不可用
> 时的保底层**接入，不承担常规流量，不改变主供应商归属。

**决策**：AI 问答 Edge Function 长期使用 Google Gemini，**不迁移到 Claude / OpenAI**。

**当前模型**：见 `docs/specs/ai-chat-multi-tier-fallback.md` §2.2 的候选链
（链头为最新稳定 Flash；不在本文钉具体 model id —— 历史上钉死的
`gemini-3-flash-preview` 已随模型迭代过期两次）

**理由**：
- Vercel + `@ai-sdk/google` 集成成熟，Edge Function 冷启动延迟可接受
- Gemini Flash 系列免费配额 + 低成本，适合公益项目
- 实际产品质量在 references.json 系统提示注入下足够（不需要 Claude 级别推理）
- CLAUDE.md 中 "claude-sonnet-4-6" 是历史草稿，已弃用

**风险与缓解**：
- 模型 ID 漂移 → 通过 `cto-models` 命令周期性核对
- 答案质量不稳 → 系统提示强制引用 references.json + 拒绝个人化处方

**环境变量**：`GOOGLE_GENERATIVE_AI_API_KEY`（Vercel；2026-04 已修复硬编码泄漏，强制走 env）

**影响文件**：`api/ai-chat.ts`，`vercel.json`

> **变更**：本条原标 "待迁移 Claude API"。Phase 9 起项目实际锁定 Gemini，2026-04-23 正式更新决策为已settled。

---

## D003 — 静态优先 SSG 策略

**决策**：所有医疗内容页面使用静态生成（SSG），不使用 SSR

**理由**：
- 医疗内容不需要动态渲染
- 静态页面 CDN 分发，全球低延迟
- 减少服务器成本和维护复杂度
- 静态页面便于 Pagefind 全文索引

**例外**：
- `api/ai-chat.ts` — Vercel Edge Function（动态流式响应）
- `src/pages/zh/blog/[slug].astro` — 动态路由但仍构建期生成

---

## D004 — 医院数据结构：community-verified vs community-reported

**决策**：使用 `verificationLevel: 'community-verified' | 'community-reported'` 区分数据质量

**理由**：
- 医疗资源数据准确性至关重要，需要明确信息质量等级
- 避免直接声明"已核实"但实际可能过时
- 用户可据此判断就诊前是否需要额外核实

**数据文件**：`src/data/hospitals.json`（15 家医院，全部验证至 2026-04-12）

---

## D005 — 不使用 Tailwind

**决策**：所有样式使用原生 CSS Variables，不引入 Tailwind

**理由**：
- 米哈游毛玻璃风格需要复杂的 CSS（clip-path、backdrop-filter、渐变），Tailwind utility 不擅长
- CSS Variables 允许在 Starlight 主题系统内优雅覆盖
- Astro component scoped styles 减少样式冲突
- Sakura 副皮肤通过 `html.sakura` 类前缀实现物理隔离（见 D010），CSS variables 比 Tailwind 类切换更干净

---

## D006 — React Islands 交互策略

**决策**：默认 `client:visible`（懒加载），全局 AI 浮动按钮用 `client:load`

**理由**：
- `client:visible`：确保大多数用户不下载不需要的 JS
- AI 聊天浮动按钮需要 `client:load` 确保立即可用
- Astro Islands 允许精确控制水合时机

---

## D007 — i18n 内容策略（修订）

**原决策**（2026-04-08）：中文为完整内容，英日为核心 5 页子集

**Phase 9-10 调整**：扩展到四语 44 页平价（zh/en/ja/ko 全部 44 页核心覆盖）

**Phase 11 现状**（2026-04-23）：
- 主体（before-you-start / pathway / risks / dose-limits / blood-tests / 20 药物 / 工具）保持四语 44 页平价
- **新增 zh-only 内容**：博客 14 篇 / compare 决策矩阵 3 篇 / editorial-policy / methodology / medical-advisors
- 韩语交互工具 UI 字符串 fallback 英文（功能正常，文案未本地化）

**理据**：
- 主用户群是中文 DIY 用户，深度内容优先 zh 验证产品-市场契合
- 翻译成本（医疗术语 + 引用 + 文化适配）高，验证 zh 内容效果后再批量翻译
- en/ja/ko 主体 44 页足以保证 SEO + 国际可访问性

**Phase 12 计划**：translate compare 决策矩阵 + 治理三页 + top 5 博客到 en/ja/ko（P1 内容债）

---

## D008 — 紧急横幅不可关闭

**决策**：`EmergencyBanner` 组件无关闭按钮，始终显示

**理由**：
- 与中国 DIY HRT 风险相关的紧急信息（血栓、肝损伤）属于安全底线
- 若用户可关闭，可能在紧急情况发生时错过关键信息
- CLAUDE.md 明确禁止弱化紧急横幅

---

## D009 — Pathway 时间线布局

**决策**：使用左对齐单列时间线，放弃两列交替设计

**背景**：原设计尝试左列标签 + 右列内容的两列交替布局，因 Starlight 内容区宽度约 720px，两列各 360px 太窄。CSS `order` 属性在网格布局中无法实现真正交替（需 JS）。

**解决方案**：左边线 + 节点标记 + 完整内容卡片（传统垂直时间轴）

**影响文件**：`src/styles/pathway.css`，`src/content/docs/{zh,en,ja,ko}/pathway.mdx`

---

## D010 — Sakura 副皮肤：物理隔离而非 CSS skin

**决策**（Phase 10/11）：Sakura「手账」皮肤通过 `html.sakura` 类前缀实现，所有样式以 `html.sakura ` 开头，与默认米哈游皮肤物理隔离。

**背景**：早期尝试在原 CSS 上叠 sakura skin，污染了基础组件、破坏了 Starlight 的 sidebar / search / TOC（多次回滚 — 见 commits `41a991d`, `54fb28b`, `09b0cea`）。

**最终方案**：
- 三层 CSS：`sakura-theme.css`（令牌）→ `sakura-skin.css`（DOM 重塑）→ `sakura-components.css`（组件）
- 所有规则前缀 `html.sakura`，默认状态零侵入
- `BloodTestCheckerRouter.tsx` 在 sakura 模式下路由到 `blood-b32/` 子树（v3.2 「血检手账」追踪器）

**理由**：
- 默认米哈游皮肤已通过用户验证，不能为了二皮肤回退
- CSS 类切换比 fork 整个站点便宜
- 物理隔离让两套设计可独立演化

---

## D011 — 图像生成双流水线

**决策**：保留 Gemini 自动流水线 + 引入 gpt-image-2 人工流水线，按 locale 分流。

**背景**（2026-04-23）：Gemini 自动生成的多语图解在医学场景下质量参差（解剖比例、Tanner 分期、注射部位精度不足）。重要 zh 页面（乳房发育 / 首次注射）需更高质量。

**方案**：
- **Gemini 流水线**（`scripts/generate-images.mjs` + `image-manifest.json`）：保持，覆盖 en/ja/ko 主要图解
- **gpt-image-2 流水线**（ChatGPT 网页 + `scripts/gpt-image-2-manifest.json`）：人工产出，仅替换 zh 主要图，2026-04-23 单批 15 张（5 张乳房发育 + 10 步首次注射）
- `gpt-image-2-manifest.json` 显式标注 "Do not regenerate via scripts/generate-images.mjs"

**代价**：i18n 配图质量分化（zh 高于 en/ja/ko）。可接受，因主用户群是 zh。

---

## D012 — SEO 自动化：月度快照 + PR 决策

**决策**（Phase 11）：通过 GitHub Actions `seo-refresh.yml` 每月自动拉取 Google Trends + GSC 数据，刷新 `docs/seo-keyword-gap.md` AUTO-SNAPSHOT 块，自动开 PR。

**理由**：
- SEO 数据观察周期长（月级），手动跑容易漏
- 用 PR 形式让人类审阅 striking-distance 词，决定是否补内容
- GSC 凭证用 base64 secret 注入，临时落盘 `.gsc-credentials.json`，always 清理

**实现**：
- `scripts/seo/fetch-gsc.mjs`（googleapis）
- `scripts/seo/fetch-trends.mjs`（google-trends-api，无需凭证）
- `scripts/seo/refresh-keyword-gap.mjs`（合成 markdown）
- `peter-evans/create-pull-request@v6` 开 PR 到 `seo/auto-snapshot` 分支

**影响**：`.github/workflows/seo-refresh.yml`、`docs/seo-keyword-gap.md`、`docs/data/trends-*.json`

---

## D013 — 结构化数据：三组件独立可组合

**决策**（Phase 11）：把结构化数据拆成 `JsonLd.astro` / `BlogPostJsonLd.astro` / `FaqSchema.astro` 三个独立 Astro 组件，按页面类型组合。

**理由**：
- 主体文档页用 `JsonLd.astro`（Drug / ScholarlyArticle / MedicalCondition / Breadcrumb）
- 博客用 `BlogPostJsonLd.astro`（Article schema，含 headline / datePublished / author）
- 任意页可加 `FaqSchema.astro`（驱动来源：frontmatter `faqs:[]` — 由 `inject-faqs-frontmatter.mjs` 半自动维护）

**代价**：组件数量增加。可接受，关注点分离换可维护性。

---

## D014 — 安全：API key 必须走环境变量

**决策**（2026-04-12 后强化）：所有第三方 API key（Google AI / GSC）严禁硬编码在源码或 `astro.config.mjs`，必须通过环境变量。

**背景**：commit `bc4d481 security: remove hardcoded Google API key, require env var` — 历史 Google API key 出现在源码中，已轮换并移除。

**强制点**：
- `api/ai-chat.ts`：`GOOGLE_GENERATIVE_AI_API_KEY` 环境变量（Vercel）
- `scripts/seo/fetch-gsc.mjs`：从 `.gsc-credentials.json` 读取（gitignored；CI 用 secret）
- `.gitignore` 包含 `.gsc-credentials.json`、`.env*`

**审计**：`scripts/audit-seo-meta.mjs` 不涉及凭证，但提醒任何 SEO 脚本扩展不可硬编码。

---

## D015 — 引用库证据等级字段与评定规则

**决策**（2026-05-26 / 内容审计 PR `claude/website-content-audit-5i4So`）：`src/data/references.json` schema 增加 `evidenceLevel: "A"|"B"|"C"|"X"` 必填字段，覆盖全部 29 条历史条目。

**背景**：CONTENT.md §2 与 CLAUDE.md "Evidence levels: A/B/C/X" 长期要求证据等级，但 references.json schema 此前只含 `id/authors/year/title/journal/doi/url`，导致：
- 内容声明的证据等级与文献元数据不可机器校验
- ReferenceLibrary 工具页无法按等级筛选
- 翻译与跨页一致性靠人记忆

**评定规则**（与 CONTENT.md §2 对齐）：
- **A**：国际指南（WPATH SOC 8、Endocrine Society、UCSF）、Meta-analysis、Cochrane、大型多中心数据库队列（如 BMJ Vinogradova 2019 UK CPRD）
  - 命中：`coleman-2022` / `hembree-2017` / `ucsf-2016` / `canonico-2018` / `vinogradova-2019` / `lee-2022` / `hudelist-2026`
- **B**：单项 RCT、单中心前瞻队列、规范性单机构剂量推荐、监管机构限制令
  - 命中：`deblok-2021` / `meyer-2020` / `kanin-2025` / `misakian-2025` / `herndon-2023` / `poage-2026` / `rothman-2024` / `gerber-2024` / `ema-2020` / `fuji-2023`
- **C**：病例报告、回顾性研究、专家意见、灰文献（同行教育站点）、小样本药代动力学、未充分外部复制的方案
  - 命中：`aly-2021` / `kuhl-2005` / `oriowo-1980` / `patel-2021` / `price-1997` / `prior-2019` / `neyman-2019` / `fuqua-2024` / `angus-2024` / `wilde-2024` / `matsumoto-2020` / `howlow-2024`
- **X**（无证据）：本库不收录；仅在「社区常见说法纠正」段落引用时由内容侧手工标注，不进入 references.json

**强制点**：
- `scripts/validate-content.mjs` 后续会要求每条 references.json 必填 `evidenceLevel`
- `CitationRef.astro` tooltip 可附带等级（不强制 UI 变更）
- `ReferenceLibrary.tsx` 与 `appendix-references.mdx` 可按等级筛选展示

**复评节奏**：与 WPATH SOC 9 草案发布同步重审一次；A 级文献新增国际指南时重排序。

**影响文件**：`src/data/references.json`、`src/components/ui/CitationRef.astro`、`docs/ai-cto/DECISIONS.md`

---

## D016 — 内容引用治理：博客纳入 validator + 紧急表述保留

**决策**（2026-05-26）：

**1) Validator scope 扩展**：`scripts/validate-content.mjs` 同时扫描 `src/content/docs/**/*.mdx` 与 `src/content/blog/**/*.mdx`。两路径下 `evidenceLevel` 非 "X" 的页面均必须有 `<CitationRef>` 与 frontmatter `references[]`。

**背景**：审计发现博客目录此前未纳入 validator 扫描范围，14 篇 zh 博客累计 ~108 处剂量声明零引用，与 docs 路径形成不对称合规。

**2) 绝对语言三档分桶**：CLAUDE.md "no absolute language" 规则不可一刀切。按上下文分类：
- **保留**：紧急停药指令（"必须立即停药就医"）、CC-BY-SA 等法律表述（"必须注明出处"）、引述指南原文且已用 `<CitationRef>` 归因者
- **软化**：剂量/操作建议中的"必须"→"建议/通常需要"（如"舌下含服必须分次"→"建议舌下分次含服"）
- **删除**：纯营销性绝对表述（本站无此类）

**理由**：医学站点的紧急停药指令属临床绝对禁忌，软化反而降低警示强度并增加医疗法律风险；指南引述需保真。

**影响文件**：`scripts/validate-content.mjs`、`src/content/blog/zh/*.mdx`、`src/content/docs/zh/{before-you-start,blood-tests,china-reality}.mdx`

---

## D017 — DOI 存活与引用真实性周期性验证

**决策**（2026-05-26）：新增 `scripts/verify-doi-liveness.mjs` + 月度 GitHub Actions workflow，自动验证 references.json 中 DOI / URL 是否仍可解析。

**实现要点**：
- 对 22 条有 DOI 的条目发 GET `Range: bytes=0-0` 至 `https://doi.org/{doi}`（HEAD 多被 Crossref / 期刊返回 403）
- 对 7 条无 DOI 的条目（aly-2021 / ema-2020 / fuji-2023 / ucsf-2016 / gerber-2024 / angus-2024 / wilde-2024）发 GET 至 `url`
- 状态码处理：200/206/30x = 通过；403/405/429 = 需人工确认（不算失败）；4xx/5xx = 失败
- 报告写入 `docs/citations-liveness-{date}.md`
- GitHub Actions 月度跑 + `pull_request` 触发（首月人工审，稳定后改 schedule + 自动开 PR）

**理由**：医学引用一旦 DOI 死链或 URL 重定向到错误内容，站点公信力严重受损；CLAUDE.md "no citation = no content" 隐含"引用必须真实有效"。

**影响文件**：`scripts/verify-doi-liveness.mjs`、`.github/workflows/verify-citations.yml`、`docs/citations-liveness-*.md`

---

## D018 — AI 供应商：Google 主 + OpenAI 免费层 + DeepSeek 保底（四层降级）

> **同日修订（2026-07-29，同一 PR 内）**：本条初版写的是「三层降级」。owner 随后
> 开通 OpenAI 每日免费额度（数据共享换取，Tier 1），端点增加**第四层 `free-oai`**，
> 排在付费层**之前**。修订理由与「同等对待免费层」的数据处理定位见下方。
>
> 该漂移由 boundary-security 评审在双签中查出 —— 代码与主 spec 已是四层，
> 本条却仍写三层、环境变量清单也缺两项。**不影响构建，只断审计链**：
> 后来者只读本条会以为 `OPENAI_API_KEY` / `AI_TIERS` 未经授权。

**决策**（2026-07-29，owner 授权）：AI 问答端点采用四层供应商降级 ——
Google 免费 key → **OpenAI 免费层（gpt-5.6 sol/terra/luna）** → Google 付费 key
（Pro 会员每月 $10 credits / Prepay 预付费）→ DeepSeek v4 保底。

**OpenAI 层排在付费层之前的理由**：其免费池是 use-it-or-lose-it（每日重置，
不用即作废）。垫在付费层前面，能让 owner 每月 $10 的 credits 基本不被动用。
池归属（250K/天 = sol；2.5M/天 = terra + luna）来自 **owner 账号侧观测**，
非官方文档记载 —— 官方帮助中心该页对抓取器 403。

**与 D002 的关系**：D002「不迁移到 Claude / OpenAI」不变，主供应商仍为 Google。
本条只新增「Google 全链不可用时的可用性保底」，不改变常规路径的供应商归属。

**理由**：
- 单供应商 = 单点故障。免费额度耗尽 / key 失效 / 区域性故障 → 端点直接 503，
  医疗信息站在用户最需要时不可用
- 付费层（Pro credits + Prepay）覆盖**额度类**故障；DeepSeek 覆盖 Google 侧
  **凭证/服务级**故障 —— 两类故障根因不同，需要不同层级应对
- DeepSeek 为独立法域、独立基础设施的供应商，与 Google 相关性低，保底价值
  高于再加一个 Google key

**数据处理定位**（owner 知情决策）：DeepSeek 与 Google 免费层**同等对待** ——
接受其 ToS 下输入可能用于模型改进。端点仍 stateless，不存储对话（CONSTITUTION
§6 不变）。owner 在知晓「境内主体持有中文圈跨性别用户的 HRT 查询」这一法域差异
的前提下作出该决策；复议触发条件见 spec。

**风险与缓解**：
- 遵循度差异（禁个性化剂量 / 躯体急症引导）→ 上线前跨模型探针验证，P0 组 3/3
  为硬门控；见 `docs/specs/ai-chat-multi-tier-fallback.md` §5
- 供应商静默换模型版本 → 季度重跑探针
- 付费额度超支 → Prepay 天然断供（余额耗尽即返错 → 自动降级）

**环境变量**：`GOOGLE_GENERATIVE_AI_API_KEY`（必需）、**`OPENAI_API_KEY`（可选）**、
`GOOGLE_PAID_API_KEY`（可选）、`DEEPSEEK_API_KEY`（可选）、
`AI_COOLDOWN_DISABLED`（可选 kill switch）、**`AI_TIERS`（可选，仅测试用）**。
**key 未设 = 该层不存在**，无独立开关变量（避免两个真值源漂移）。
⚠ 免费与付费**必须是两个独立 GCP 项目** —— 同项目启用 billing 会让免费额度立即消失。

**`AI_TIERS` 是测试门控开关，不是运行时配置**：把可用层限制为白名单，让 P0 安全
探针能定向打到待测层（降级链的性质决定了上游层成功时下游层永远走不到，否则这条
门控无法执行）。只读 env、绝不接受请求侧输入；生效时响应带 `x-yk-tiers`，
**该头出现在生产即为「测完忘删」的告警**。用法见 spec §4.3。

**OpenAI 层的上线前置条件（硬性）**：必须在 OpenAI project 级配 hard spend limit。
帮助中心称免费额度耗尽后**按正常费率计费而非报错**（该页 403，未逐字验证）；
若属实，免费池用尽会**静默转付费**，降级链第一跳永不触发而账单在涨。
spend limit 把静默计费变成可检测的 `429 insufficient_quota`。

**已过安全门控**：2026-07-29 以 `AI_TIERS=free-oai` 定向验证 gpt-5.6-terra，
P0 组 7/7（每题 3/3）。报告见
`docs/ai-safety-probe-free-oai-openai-gpt-5-6-terra-2026-07-29.md`。
**DeepSeek 层尚未跑探针，配 key 前必须补。**

**同批决策**：`scripts/seo/ai-analyze.mjs` 的 Gemini 调用停用 —— 它曾复用同一把
免费 key，跑一次就吃掉当天用户侧额度。免费额度归属用户侧。

**影响文件**：`api/ai-chat.ts`、`scripts/seo/ai-analyze.mjs`、
`docs/specs/ai-chat-multi-tier-fallback.md`

## D019 — 乐园手账（sakura）转正为唯一设计，取代 D010

**日期**：2026-09-24 · **决策人**：owner（「取消旧版的设计，只保留新版」）

**决策**：米哈游「二相乐园」深色玻璃皮退役；乐园手账成为唯一设计，🌸 切换按钮与首访引导卡移除。

- **激活**：`src/middleware.ts` 在构建期把 `class="sakura"` 写进静态 HTML（爬虫/无 JS 访客也拿到新版，零闪屏）；`Head.astro` 保留内联 `classList.add` 兜底。`/v2/`、`/dev/` 跳过。
- **明暗**：只保留浅色纸面。**幻月夜暂停**：夜间 token 只翻转一半（桌面变深、纸面不变），所有表格偶数行（含剂量表）对比度约 1.2:1、pathway 决策分支文字隐形、AI 页 prose 规则污染 —— 安全信息不可读。ThemeProvider 强制 light、ThemeSelect 不渲染；`starlight-theme` 存值保留，待 token 按 surface/on-surface 成对重设计后再开放。
- **血检工具**：v3.2 血检手账成为唯一版本（localStorage，永不上传）。
  - 不再给首访者写入 3 条示例记录；老用户未改动过的示例记录在加载时清除。
  - 手账自身分级在 E2/T/PRL/Hb 上比经典版宽松 → 手账额外执行经典红区判定并显示 `RED_WARNINGS`（红底白字、不可关闭、链急症指南）。阈值与四语警告原样迁至 `src/utils/blood/redFlags.ts`，**不做任何放宽**。两套分级口径的统一需临床复核后另行决策。
- **分两步**：本次（Phase A）只做常驻切换；旧皮 CSS/粒子/经典检查器等死代码在 Phase B 按组件合并删除（旧的无前缀样式目前仍是 sakura 的布局地基）。

**影响文件**：`src/middleware.ts`、`src/components/overrides/{Head,ThemeProvider,ThemeSelect}.astro`、`src/components/interactive/BloodTestCheckerRouter.tsx`、`src/components/interactive/blood-b32/*`、`src/utils/blood/{storage,redFlags}.ts`、`CLAUDE.md`
