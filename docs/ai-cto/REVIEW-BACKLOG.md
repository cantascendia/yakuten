# REVIEW BACKLOG

**Last Updated:** 2026-05-26

累积的技术 / 内容 / i18n / 运营债，按优先级分级。来源：git log（Phase 9-11）+ 现有代码扫描。

> 优先级口径：**P0** 影响生产或安全 / **P1** 影响产品完整性或主用户群体验 / **P2** 重要但可推迟 / **P3** nice-to-have

---

## P0 — 立即处理

| # | 项目 | 来源 | 备注 |
|---|------|------|------|
| - | _无 P0 项_ | — | 当前生产健康；安全（D014）已收口 |

---

## P1 — 内容平价 + 自动化闭环

| # | 项目 | 来源 | 备注 |
|---|------|------|------|
| P1-1 | **Phase 11 zh 增量内容翻译到 en/ja/ko** | git log Phase 11 | 14 篇博客 / 3 篇 compare 决策矩阵 / editorial-policy / methodology / medical-advisors 全部 zh-only。i18n 评分从 10/10 跌至 8.5/10。建议先 compare 决策矩阵 + 治理三页（信任信号），博客分批翻译 |
| P1-2 | **SEO 月度 PR 实际进入决策循环** | `.github/workflows/seo-refresh.yml` | 自动 PR 已通，但缺少明确 SOP：谁审、striking-distance 词如何转 issue、是否归档历史快照。建议在 `cto-review` 命令里加 SEO PR 处理项 |
| P1-3 | **首次注射 10 步图文教程的 i18n 配图** | commit `9fd53f5` + `gpt-image-2-manifest.json` | injection-step-01..08 仅 zh 高质量版本；en/ja/ko 仍是 Gemini 流水线产出，质量分化 |
| P1-4 | **Sakura 皮肤 zh 之外验证 + 文档** | commits `41a991d`/`54fb28b`/`09b0cea`/`b0e3d0a` | 多次回滚痕迹说明 Sakura 在 Starlight 内陷阱较多。需要在 ARCHITECTURE 之外增加 sakura 维护 SOP，并在 en/ja/ko 路径下抽样验证 |
| P1-5 | **WPATH SOC 9 草案监控** | references.json 引用基线 | WPATH SOC 9 草案预期 2026 年发布；出版后 30 天内必须更新 references.json，标注与 SOC 8 差异，刷新文献库 UI |
| P1-6 | **Phase 11 内容深化的医学审阅记录** | commits 一批新增内容（cpa-meningioma-risk / cpa-dose-safe-range / blood-test-timing）| `medical-advisors.mdx` 框架已有，但博客是否经独立医学审阅未在 commit log 体现。需建立审阅签字流程 |

---

## P2 — 重要但可推迟

| # | 项目 | 来源 | 备注 |
|---|------|------|------|
| P2-PERF-1 | **Sakura 字体 @import 改造为 JS 条件注入** | 2026-05-26 perf-seo 审计 | `src/styles/sakura-theme.css:13` 顶部 @import 加载 Fraunces/Plus Jakarta/Ma Shan Zheng/Zen Maru Gothic/Klee One/Kosugi Maru/Yuji Syuku/DotGothic16 等 ~10 个手账字体 family，即使 sakura mode 未激活也强制全站下载。改造方案：移到 sakura-fonts.css 单独文件，在 ThemeToggle.astro 切换时通过 JS 注入 `<link rel="stylesheet">`。风险：FOUC + 切换体验。需独立 PR |
| P2-PERF-2 | **OG 图像 PNG → WebP** | 同上 | `scripts/generate-og-images.mjs` 当前 sharp 输出 PNG（14 MB / 219 张）。改 WebP 节省 60-70% (4-6 MB)。微小社交平台兼容性 trade-off（旧 Android/iOS 显示 SVG fallback） |
| P2-PERF-3 | **Sakura CSS 懒加载** | 同上 | 1443 行 sakura CSS（24 KB gzip）全部捆绑到 common chunk，仅 <1% 用户使用。需配合 P2-PERF-1 的字体改造一起做 |
| P2-SEO-1 | **Drug 品牌 Product schema** | 同上 | DrugBrandIndex.tsx / drug-cards.tsx per-brand 当前只渲染视觉卡片，缺 Product 结构化数据 |
| P2-SEO-2 | **Medical advisors Person schema** | 同上 | medical-advisors.mdx 列表展示，缺 Person 节点 |
| P2-SEO-3 | **Compare 页双 Drug 节点** | 同上 | compare/cpa-vs-spironolactone 等当前是通用 MedicalWebPage，可 emit 两个 Drug + ComparisonChart |
| P2-1 | **API 速率限制持久化** | `api/ai-chat.ts` line ~17-20 | 当前 `rateLimitMap = new Map`，Edge 冷启动后重置；可被并发滥用。建议接 Upstash Redis 或 Vercel KV |
| P2-2 | **Gemini 模型 ID 漂移监控** | `api/ai-chat.ts` line 153 `gemini-3-flash-preview` | "preview" 标签易过期。建议加 `cto-models` 月度检查 + 改成稳定通道 |
| P2-3 | **gpt-image-2 流水线的可重复性** | `scripts/gpt-image-2-manifest.json` `_note` | 当前是 ChatGPT 网页人工生成，禁止脚本重生成。如果原图丢失或需要小修，无可重复路径。建议存档原始 PSD/PNG |
| P2-4 | **韩语交互工具 UI 字符串本地化** | `src/components/interactive/*` + `src/i18n/ui.ts` | 当前 fallback 英文，功能正常但用户体验低于 zh/en/ja |
| P2-5 | **多 H1 修复完整回归** | commit `419a27d` | 4 个首页已修，但 starlight-override 长期对 H1 有自定义渲染。建议加 E2E 断言 H1 唯一性 |
| P2-6 | **`docs/data/gsc-*.csv` 仅 CI artifact，本地无副本** | `.github/workflows/seo-refresh.yml` line ~78 | gitignored，本地开发者拿不到历史。考虑加密存档或 S3 |
| P2-7 | **i18n parity guard CI** | — | 没有 CI 阻断 zh-only 内容上线。建议加脚本：检查 `src/content/docs/zh/*.mdx` 与 `en/ja/ko` 镜像存在性，超阈值警告（不阻断） |

---

## P3 — nice-to-have

| # | 项目 | 来源 | 备注 |
|---|------|------|------|
| P3-1 | **品牌图鉴实物图片** | `data/drug-brands.json` 58 品牌 | 当前只有文字描述，缺产品图。需社区贡献素材 |
| P3-2 | **儿科 / 青少年内容** | CONTENT.md | 已规划未实施；伦理与法律敏感，需医学顾问明确边界 |
| P3-3 | **更多 SVG 插图（分子结构、Tanner 分期 SVG 化）** | 当前以 webp 配图为主 | Servier Medical Art CC BY 4.0 可用作底图 |
| P3-4 | **首页粒子背景性能** | `ParticleCanvas.tsx` / `ParticleBackground.astro` | 已限 60 粒子，老移动端仍可优化（OffscreenCanvas） |
| P3-5 | **博客 RSS** | `src/pages/zh/blog/` | 当前无 RSS feed，订阅者只能靠主动访问 |
| P3-6 | **Pagefind 索引 + 博客** | `src/content/blog/zh/` | 验证博客是否进入 Pagefind 全文索引；如未，需配置 |
| P3-7 | **OG 图像样式与品牌升级** | `scripts/generate-og-images.mjs` | 自动生成已通，但风格偏单调，可接入米哈游主皮肤令牌 |
| P3-8 | **FUNDING.yml 实际激活** | `.github/FUNDING.yml`（占位） | 当前只是占位符。如要接 OpenCollective / Liberapay 需运营决策 |
| P3-9 | **`scripts/inject-*.mjs` 幂等性测试** | `inject-faqs-frontmatter.mjs` 等 | 注释声明幂等，但没有自动化测试覆盖。建议加 vitest 单测 |

---

## 内容债（独立列出）

来自 commit log 中可识别的内容缺口：

| 项目 | 备注 |
|------|------|
| en/ja/ko 缺 14 篇博客 | 见 P1-1 |
| en/ja/ko 缺 3 篇 compare 决策矩阵 | 见 P1-1 |
| editorial-policy / methodology / medical-advisors 仅 zh | 见 P1-1，治理可信度信号 |
| `docs/image-generation-handoff-codex.md` 等 codex handoff 文档（commit `9997958`）状态未在 STATUS 体现 | 16 张图解已落地，但 handoff 文档是否归档未知 |
| 无 `BlogPostLayout` 的 i18n 镜像 | `src/layouts/BlogPostLayout.astro` 当前默认 zh 行文逻辑 |

---

## 运营债

| 项目 | 备注 |
|------|------|
| 反馈表单（腾讯问卷）数据回流路径未文档化 | `SiteFooter.astro` 链接已上线，但谁定期看、如何转 issue 未明确 |
| 医院数据 90 天再验证机制 | 当前手动；建议加 GitHub Issue 自动开单（cron） |
| 引用文献 90 天 DOI 链接可用性扫描 | `references.json` 22 条；可加脚本周期性 HEAD 请求 |

---

## 处理原则

1. P1 项进入下一个 sprint planning（Phase 12 候选）
2. P2 项作为 cleanup window 任务，季度内消化
3. P3 项作为社区贡献候选（issue 模板已就位）
4. 新债通过 `cto-review` / `cto-audit` 命令周期性补充到本文件
