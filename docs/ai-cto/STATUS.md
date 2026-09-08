# STATUS

**Last Updated:** 2026-09-08
**Current Version:** v1.2.0-pre (Phase 12 — Content citation integrity)
**Git Tag:** —

---

## 2026-09-08 · 药物图鉴 v2 — 品牌索引页重做（branch `feat/brand-library-v2`）

owner 要求「真正做好这个页面，大规模翻新甚至重做；不能是 AI 默认设计；库越全越详细越好，图片要有」。
Fable 5.1 主控（spec / 数据 / 审核），4 路 Opus 并行（示意图 / 主组件 / 集成+测试 / 设计画布）。

- **Spec**：`docs/specs/brand-library-v2.md`；类型 SSOT `src/components/interactive/brand-library/types.ts`；数据 SSOT `src/data/brand-library.json`（32 成分图版 / 139 品牌，58 → 139；ja 译文由旧 overlay 迁入）。
- **信息架构**：药典式鉴别图版（成分 = 图版 №，品牌 = 标本）· 外观反查（剂型→颜色→形状）· 详情对话框 · ≤3 条对比 · 列表视图 · 禁用/不适用图版结构性隔离（斜纹 + 红章 + 原因）· 页尾图例/来源/纠错。
- **图像策略**：只用 `public/brands/*.webp` 实拍（12）；其余按 appearance 数据渲染 SVG 线描示意图并标「示意」。`public/images/drugs/*-studio.webp` 是 AI 重绘且把 Progynova 蓝片画成橙色 —— **鉴别页禁止使用**。
- **两皮一等公民**：`.bl-root` token 层映射「二相乐园」（玻璃 + 切角 + 幻月金 kicker）与 `html.sakura`（纸白 + 墨描边 + 硬投影 + washi 图版号 + 旋转印章）。
- **红线复核**：零存储 / 无购买链接·价格·剂量 / 颜色全变量 / transform+opacity + reduced-motion / 无 emoji（国旗改 ISO 标签）/ 44px 命中 / 原生 dialog。
- **顺手修复**：`drugLinks.ts` 缺 `estradiol-injection` 映射（注射类品牌全部丢链接）；补 gnrh-antagonist / flutamide / norethisterone / EE / CEE 映射；`DrugBrandGallery.astro` 改读新数据（精确途径优先）。
- **测试**：既有 critical-paths 断言一行未改；新增 `tests/brand-library.spec.ts` 6 条。`scripts/validate-brand-library.mjs` 接入 `check` / `build`。
- **设计画布**：https://claude.ai/code/artifact/3634c282-4451-4df6-b7b2-4d01ffa2fdd6（桌面双皮肤 / 移动 / 详情对话框）。
- **codex 跨模型审（§48，read-only）第 1 轮**：4🔴+8🟠+5🟡 → 全部处理：无引用医学结论（成分级 `references[]` + 图版头「依据文献」链接 + 校验脚本核对 id）· 代购/价格/「可购」措辞全清（51 处）· 日文迁移字段 2 倍剂量错误（Oestrogel 每泵 1.5→0.75 mg）与「12.5 mg」用量暗示、「絶対禁止」软化 · Suprefact 拆鼻喷/注射两条 · Crinone 移除（剂型无对应）· Makena 双规格 · dialog 关闭后延时还焦点 · 对比按钮选中态可及名 · 根元素 `lang` · Gallery 回退 en · JSON-LD name/inLanguage 本地化 · 测试改等 `data-hydrated` 标记 + 断言全部为片剂。codex 的「多语死链」判断经 dist 核实为误报（Starlight i18n fallback 已生成全部 17 语页面）。
- **codex 第 2 轮**（修后可合并）：❌ 项全部处理 —— 全部 32 成分补 `references[]`（药理/换算陈述也附 kuhl-2005 / oriowo-1980 / 指南）+ 详情对话框同步显示引用 + 校验器 cautioned/banned 缺引用改为 error · 「获取/药房/买」类措辞再清一遍（zh/en/ja）· Makena 规格纠正并拆自动注射器条目 · Depo-Provera 拆 IM 150 / SubQ 104 · Climara 日文储库型→基质型 · 列表/详情对比按钮选中态可及名 · 根元素恒定输出 `lang` · 含汉字规格串在非 zh UI 标 `lang="zh"` · 文献链接走 ExternalLink（新标签提示）· 图版展开按钮 `aria-controls`。数据 139 → 141 条。
- **v2.1 视觉重构（owner 参考稿）**：owner 否决「暗色药典图版」方向并给出浅色目录式参考稿 → 按 `docs/specs/brand-library-v2.1-visual.md` 逐区重构展示层：浅色白底 + 左侧复选框多选筛选栏（地区/类别/剂型/参考资料 + 全部地区/重置）+ 大搜索条与玫红按钮 + 右上核对提示卡 + 信息条 + 「品牌图鉴」排序/视图切换 + 3 列白底圆角卡片（**品牌族**：141 版本归并为 111 张卡，详情内切换版本）+ 每卡「包装示意」（新 `PackArt.tsx`：药盒 + 泡罩/剂型件，无厂商 logo）或实拍 + 底部核对提示条；外观反查折叠为「按外观查找」；dark/sakura 同版式换面。mdx 页顶去掉重复导语与返回链接，ToolDisclaimer 移到岛屿下方。默认排序按成分（同成分内多版本/有实拍优先）。36/36 测试绿。
- **真机审查修正**：标本舞台改为两皮通用的浅色纸面（示意图深墨描边，白色片剂可读）· 印章右下/来源角标左上（避开切角）· 中和 Starlight `.sl-markdown-content` 兄弟 margin（卡片 517→409 px，页面 45k→30k px）· 图版默认露 6/3 张 + 「展开其余 N 条」· 窄屏反查折叠 + 横向滚动 + 命令栏不 sticky · 浅色主题命令栏用主题感知玻璃 · sakura/浅色印章 AA 加深色。
- **待办**：社区实拍补图（P3-1）；非四语页面 lede 翻译；`src/components/seo/JsonLd.astro` 工具页 `offers.price: '0'` 与 SPEC「不标价格」字面冲突（既有，待裁定）。

---

## 2026-06-02 · 「虚拟医疗信息产品公司」多角色审计 + 两轮修复（PR #16 已合并 / PR #17 待合并）

以多角色 agent team（临床/编辑/中文/前端/SEO/用户代表/安全/无障碍）做全站只读审计 → 评分 → 路线图，
随后分两轮实施。两轮都经 **workflow 验证层 + codex(gpt-5.5) 跨模型层** 双重评审，主控逐条复核后定稿。

**已合并 — PR #16（squash `ac536eb`）**：IMM-1~8 + ST-1/2/5/7 + codex P2。
数据契约(DrugCards/InjectionCalculator 7-10mg 安全/DrugComparator 数字漂移/CitationRef 回退) ·
引用纪律(references.json 署名 SSOT，817 处归一化) · 医学准确性(EMA ≥10mg 源核实/脑膜瘤-垂体瘤机制
分离/肝毒性引用) · 急救(K⁺ 语气/risks 拨120 硬指令/AI 急症触发) · 隐私(AI origin hrtyaku.com/
Vercel Analytics 披露) · trans-friendly→跨性别友好。

**待合并 — PR #17（branch `fix/st-batch-parallel`）**：ST-3/4/6/8/9，19-agent workflow 并行实装。
ST-3 安全文字四语化 · ST-4 急症速查表(DVT/PE 区分) · ST-6 11 博客 FAQPage 结构化数据(JSON-LD-only，
codex P1 后回退，不渲染可见未引用医疗内容) · ST-8 红色安全文字对比度达 AA · ST-9 急救语气三档。

**评分**：≈68.5 → ≈81.5（详见 PR 描述 + 本次会话计划文件，计划文件在操作者本地 home，不随 git 同步）。

### 换机继续指引（resume on another machine）
1. `git fetch origin && git checkout fix/st-batch-parallel`（PR #17 分支）。
2. 读 PR #16/#17 描述 + 本文件 + `docs/ai-cto/REVIEW-QUEUE.md`（两轮 codex 评审记录）。
3. 全绿基线：`npm run build` / `npx astro check` / `node scripts/check-citation-refs.mjs $(find src/content -name '*.mdx')` / `node scripts/verify-blog-links.mjs $(find src/content/blog -name '*.mdx')`。

### 剩余工作（接手即可做）
**A. PR #17 verify 残留 5 项 — ✅ 已全部解决**（2026-06-02，8-agent ultracode workflow + 敌对验证 + codex）
- #10 新增主题感知 --color-caution-text（暗 #FF9800 / 浅色+sakura #805E00，≥4.95:1 含结果卡 container 底），文字用途切换、装饰保留 --color-caution
- #11 --b32-ink-3(2.96:1) 全 13 处微型文字 → --b32-ink-2(5.83:1)（Dashboard/InputSheet/Primitives/SettingsSheet/B32App）
- #14 aria 'value input' 四语化（inputValueSuffix）+ BLOOD_RANGES label 兜底注释
- #15 RiskScreener startMeta/highRiskNote 提升 UI_COPY 四语（ko 不再 fallback）
- #16 B32Sheet dialog 兜底 aria-label（copy.settings 四语）
- 额外：ko/risks aria 回退英文匹配冻结正文（Constitution §3）；codex P2 修正 container 底对比度边界

**B. 运维（操作者处理，主控不接触密钥/Vercel）**
- 🔑 轮换 Gemini API 密钥；确认/设置 Vercel `ALLOWED_ORIGINS=hrtyaku.com,...`
- 📝 CLAUDE.md「Analytics: Umami」与代码（Vercel）不符，建议同步

**C. 长期（路线图 LT，需医学引用/专家审阅）**
- LT-1 补内容簇（比卡鲁胺对比/螺内酯高钾/5α-RI/贴片凝胶/中国就医路径博客，走 cto-blog-pipeline）
- LT-2 新循证工具（单位换算+采血时机/抗雄交互对比/就医清单生成器，纯前端零存储）
- LT-3 可信度机制（证据徽章视觉一等公民/「先别慌」三段框架/来源透明+最近核对日期）
- LT-4 工程基建（ESLint react-hooks/@ts-eslint · OG YAML 换 gray-matter · Edge 限速接 Vercel KV · prompt 注入 deny-list · bcImportJSON 结构校验 · sakura 字体自托管去 Google Fonts CDN）
- LT-5 未成年安全底线政策 · LT-6 i18n 战略（ko freeze 去留 / 四语医疗警告同步机制）
- DrugComparator 完整架构级 SSOT（需先扩 drugs.json schema 补四语 + bioavailability/vteRR）
- MPA 定级（现「绝对禁止」，WPATH 用「不建议」，待医学确认是否降级）

---

## 2026-05-26 · 内容引用治理收口（PR `claude/website-content-audit-5i4So`）

通过 3 个并行 Explore 子代理 + 1 个 Plan 子代理完成全量内容审计，识别并修复 8 类问题：

1. references.json schema 缺 `evidenceLevel` 字段 → 29 条全部补，新增 2 条（hou-2026 / liu-2020）覆盖之前未引用的中国调查数据，schema 强制 A/B/C/X
2. 14 篇 zh 博客累计 ~108 处剂量声明无 `<CitationRef>` → 全部补齐 + frontmatter `evidenceLevel`/`references`/`lastReviewed`
3. `scripts/validate-content.mjs` 历史只扫 docs → 扩展到 blog + 强制 evidenceLevel + 引用 ID 双向校验
4. 3 条死引用激活（gerber-2024 / herndon-2023 / howlow-2024）
5. 1 条死 DOI 修正（matsumoto-2020：从 J Pharm Health Care Sci → SAGE Open Medicine，PubMed PMID 32528682 核对）
6. 8 处医学非紧急"必须"软化（剂量操作 / 监测节奏）；30 处紧急 / 法律 / 解剖安全场景保留（D016 三档分桶）
7. before-you-start.mdx + china-reality.mdx 核心页患病率 / 时间线 / 不可逆性声明补 CitationRef；evidenceLevel X → A/B
8. 2 处确认断链修复（hospital-finder.mdx → china-reality.mdx 重构后的 #step1 / #safety）

新增基础设施：
- `scripts/verify-doi-liveness.mjs` — DOI / URL 月度存活校验
- `.github/workflows/verify-citations.yml` — PR + workflow_dispatch 触发，稳定后改月度 schedule
- `docs/content-audit-2026-05-26.md` — 完整审计报告
- `docs/citations-liveness-2026-05-26.md` — 首跑报告（19 pass / 14 manual / 0 fail）
- DECISIONS.md D015（evidenceLevel 评定规则）/ D016（绝对语言三档）/ D017（DOI 存活 CI）

i18n 全量翻译（14 博客 + 4 guides × 3 locale = 54 文件）显式不列入本 PR，已记入 REVIEW-BACKLOG P1-1，待医学翻译审阅 SOP 就位后单独执行。

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
| 引用系统 + 31 条文献（23 条有 DOI，全部带 evidenceLevel A/B/C） | ✅ |
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
| `references.json` | 31 条文献 | 23 条有 DOI；每条均含 evidenceLevel A/B/C |
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
