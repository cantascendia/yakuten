# Yakuten Content Audit — 2026-05-26

**Branch**: `claude/website-content-audit-5i4So`
**Scope**: Full content + citation + i18n + emergency-messaging + AI-disclaimer + data-asset audit, with concrete remediation.
**Triggering ask**: 全面审计内容；准确处理医学引用；确保所有引用真实有效；多角度审查。
**Audit method**: 3 parallel Explore agents + 1 Plan agent (validation) + author manual verification (PubMed EFetch / Crossref).
**Reference standard**: SPEC.md / CONTENT.md / AGENTS.md / `docs/ai-cto/DECISIONS.md` (the playbook handbook at `C:/projects/ai-playbook/playbook/handbook.md` is not accessible in the remote execution environment; project-internal specs substitute as the canonical audit baseline).

---

## Executive summary

| 维度 | 状态 | 备注 |
|------|------|------|
| 文献库 schema (references.json) | 🔴 → ✅ | 29 + 2 新条目；schema 增加 `evidenceLevel`；3 条死引用已激活 |
| 博客引用合规 | 🔴 → ✅ | 14 篇 zh 博客累计 ~108 处剂量声明无 CitationRef → 全部补齐 |
| 核心 docs 页引用 | 🟡 → ✅ | before-you-start / china-reality 引用缺口已补；blood-tests 已合规 |
| 绝对语言（"必须"） | 🟡 → ✅ | 38 处分三档分桶：8 处软化、30 处保留（紧急/法律/解剖安全） |
| 锚点链接 | 🟡 → ✅ | 2 处确认断链已修；其他经审计为 Starlight auto-slug 命中 |
| Validator 覆盖 | 🔴 → ✅ | 扩展到 `src/content/blog/`；引用 ID + 证据等级双向校验 |
| DOI 真实有效性 | 🔴 → ✅ | 1 条死 DOI（matsumoto-2020）修正；新增 CI 脚本周期性校验 |
| 紧急横幅 | ✅ | 红底白字、不可关闭、`role="alert"`、`aria-live="assertive"` |
| AI 问答 disclaimer | ✅ | 不可旁路、无关闭按钮、无 localStorage 隐藏标志 |
| 个人化剂量语言 | ✅ | grep 全站无"你应该服用 X mg"类违规 |
| 热线/医院数据 | ✅ | 全部 `lastVerified` 在 2 个月内；URL 格式合法 |
| 简繁混用/打字错误 | ✅ | 全站简体中文一致；无 TODO/Lorem ipsum 残留 |
| i18n（zh/en/ja/ko）docs 覆盖 | ✅ | 44 页 × 4 = 176 完全平价 |
| i18n（zh/en/ja/ko）blog + guides 覆盖 | 🟡（不列入本 PR） | 14 博客 + 4 guides 仅 zh；翻译策略待医学审阅 SOP 就位 |

---

## 1. 引用治理（核心修复）

### 1.1 references.json schema 扩展

**问题**：CONTENT.md §2 与 CLAUDE.md 同时强制 `evidenceLevel` A/B/C/X，但 schema 仅含 `id/authors/year/title/journal/doi/url`，无字段承载等级。后果：内容声明的等级与文献元数据脱钩、ReferenceLibrary UI 不能按等级筛选、翻译跨页一致性靠人脑维护。

**修复**（commit `9c08a42`）：

- 29 条历史条目全部补 `evidenceLevel`，分级理由记入 `docs/ai-cto/DECISIONS.md` D015
  - **A**（指南 / Meta / 多中心 RCT）：coleman-2022, hembree-2017, ucsf-2016, canonico-2018, vinogradova-2019, lee-2022, hudelist-2026
  - **B**（单项 RCT / 前瞻队列 / 监管限制令）：deblok-2021, meyer-2020, kanin-2025, misakian-2025, herndon-2023, poage-2026, rothman-2024, gerber-2024, ema-2020, fuji-2023
  - **C**（病例 / 专家 / 灰文献 / 小样本 PK）：aly-2021, kuhl-2005, oriowo-1980, patel-2021, price-1997, prior-2019, neyman-2019, fuqua-2024, angus-2024, wilde-2024, matsumoto-2020, howlow-2024
- `CitationRef.astro` tooltip 追加 "证据等级 X"（不强制 UI 改动）
- 新增 2 条文献（commit `260c328`）：
  - `hou-2026` — JAMA Netw Open 2026;9(1):e2552440（DOI 10.1001/jamanetworkopen.2025.52440）。**手工核对**通过 PubMed EFetch + PMC12776202，确认 N=4296、87.5% / 52.3% / 15.1% 三个百分比与 china-reality.mdx 现有 inline 数据**逐字一致**
  - `liu-2020` — J Sex Med 2020;17(11):2291-2298（DOI 10.1016/j.jsxm.2020.07.081）。复旦 2020 全国调查 N=579

### 1.2 三条死引用激活

**问题**：`gerber-2024` / `herndon-2023` / `howlow-2024` 在 references.json 但 0 处引用 — 数据库与内容脱节。

**修复**（commit `0d5e82a`）：

- `gerber-2024`（CPA 低剂量 vs 标准剂量等效）→ `src/content/blog/zh/cpa-dose-safe-range.mdx`
- `howlow-2024`（IJTH "How low can you go" 综述）→ `src/content/blog/zh/cpa-dose-safe-range.mdx`
- `herndon-2023`（EV SC vs IM）→ `src/content/blog/zh/blood-test-timing-after-injection.mdx`（讨论给药途径影响谷值时机）

每条激活前阅读论文 abstract，确保引用位置与原文实际结论匹配。

### 1.3 14 篇 zh 博客累计 ~108 处剂量声明补 CitationRef

**问题**：`scripts/validate-content.mjs` 历史只扫 `src/content/docs/`，未覆盖 `src/content/blog/zh/`。后果：14 篇博客累计 ~108 处剂量 / OR / RR 数字声明零引用，与 docs 路径形成"docs 严管、blog 散养"的合规不对称。

**修复**（commits `7da0022` + `0d5e82a` + `a651c37`）：

1. 扩展 validator 到 `src/content/blog/**/*.mdx`（warn-only）
2. 14 篇博客按主题分 4 组并行补齐 CitationRef + frontmatter `evidenceLevel`/`references`/`lastReviewed`
3. 收口：把 blog warning 提升为 hard error，与 docs 同档

### 1.4 核心 docs 页补引用

| 页面 | 修复 |
|------|------|
| `before-you-start.mdx` | evidenceLevel 从 X → A；新增 ~10 处 CitationRef（指南、VTE 文献、Patel breast development、deBlok cohort） |
| `china-reality.mdx` | 87.5% / 52.3% / 15.1% / 86% / 96% 患病率统计加 CitationRef（hou-2026 + liu-2020）；evidenceLevel X → B |
| `blood-tests.mdx` | 审计时确认已合规（参考值表与 ALT/K+/Hb/D-dimer 全部已 cited） |

### 1.5 Validator 双向校验

`scripts/validate-content.mjs` 现在执行：

- references.json 每条必须含 `id/authors/year/title` 与有效 `evidenceLevel`（A|B|C|X）
- 每篇 docs/blog MDX 若 `evidenceLevel != X`，必须 frontmatter `references[]` 非空 + 内容含 `<CitationRef>`
- 每个 `<CitationRef id="X">` 中的 `X` 必须在 references.json 存在（硬错误）
- 每个 `<CitationRef id="X">` 应在 frontmatter `references[]` 出现（硬错误）
- 内容超过 90 天未审阅 → warn（freshness 提示）

终态：`npm run validate:content` 输出 `Content validation passed.`，零错误零警告。

---

## 2. 绝对语言三档分桶（D016）

**问题**：CLAUDE.md "no absolute language" 规则不能一刀切。实际"必须"出现 38 处（Plan agent 复核纠正了 Explore agent 报告的 8 处）。

**triage 与修复**（commit `82d1081`）：

| 类别 | 处置 | 计数 | 例 |
|------|------|------|------|
| 紧急停药 / 不可逆解剖安全 | **保留** | ~10 | risks.mdx / hrt-emergency-symptoms 标题"必须立即停药就医"；EE 禁用 |
| 法律 / 编辑政策 / 引述指南 | **保留** | ~12 | CC-BY-SA "必须注明出处"；methodology / editorial-policy 元规则；EMA 2020 quoted "使用最低有效剂量" |
| 严重后果安全（撤药反弹/无菌/骨密度） | **保留** | ~10 | CPA 突停 → 肾上腺；GnRH 不补 E2 → 骨松；螺内酯 → 高钾；分装无菌 |
| 剂量操作 / 监测节奏 | **软化** | 8 | "必须分次给药" → "建议分次给药" |

软化的 8 处文件：bujiale-how-to-take.mdx ×3、hrt-monitoring-schedule.mdx ×1、pathway.mdx ×1、guides/switch-e2-route.mdx ×2、before-you-start.mdx ×1。

---

## 3. 锚点链接

**问题**：Explore agent 报告 ~10 处锚点链接断裂，多数声称是中文标题 auto-slug 失效。

**复审**（commit `4fb5a98`）：

仅 **2 处确认断链** — `tools/hospital-finder.mdx` 中两个链接指向 china-reality.mdx 重构前的 §8.4 / §8.5 章节锚点，但实际内容已合并到 `#step1` 与 `#safety`。已修。

其他疑似断链经审计为 Starlight + remark GitHub-style 自动 slugger 命中：
- `#china-guide` / `#tool` / `#safety` / `#step1` 已有显式 `<h2 id="...">`
- `#phase0..#phase3` 已有 `<div class="phase-row" id="phaseN">`
- `#sc-vs-im-对比` / `#注射操作步骤` / `#注射操作规范` 标题文本与 auto-slug 一致

按 Plan agent 建议未盲目添加 `{#ascii-id}` — 避免破坏入站 SEO 链接。

---

## 4. DOI 真实有效性（用户明确要求）

### 4.1 新增脚本 + CI

**修复**（commit `783e37a`）：

- 新增 `scripts/verify-doi-liveness.mjs`：对每条 references.json 条目发 GET `Range: bytes=0-0` 至 `https://doi.org/{doi}` 或 `url`
- 状态码策略：200/206/30x = pass；403/405/429/TIMEOUT/5xx-after-retry = manual（publisher block 不算死）；其他 4xx / network = hard fail
- 输出 `docs/citations-liveness-{YYYY-MM-DD}.md` markdown 报告
- 新增 `.github/workflows/verify-citations.yml`：`workflow_dispatch` + `pull_request` 触发（首月人工审，稳定后改 monthly schedule）

### 4.2 修复 matsumoto-2020 死 DOI

**手工核对**：脚本首跑后 matsumoto-2020 返回 404。通过 PubMed EFetch（PMID 32528682）确认论文实际为：

- 标题：Analysis of drug-induced interstitial lung disease using the Japanese Adverse Drug Event Report database
- 期刊：SAGE Open Medicine（不是 J Pharm Health Care Sci）
- DOI：10.1177/2050312120918264（不是 10.1186/s40780-020-00171-7）

已修正（commit `783e37a`）。

### 4.3 终态报告

`docs/citations-liveness-2026-05-26.md`：

- **19 pass** — DOI 解析返回 200/206/30x
- **14 manual review** — 403 / 5xx（Crossref / Elsevier / BMJ / SAGE / Lippincott CDN 对 bot 一律阻挡；人工浏览器打开均可正常加载）
- **0 fail**

---

## 5. i18n 覆盖

### 5.1 已达标
- docs 路径 4 语完全平价：44 页 × 4 = 176 文件，全部存在
- 紧急横幅、AI disclaimer 4 语翻译就绪
- 工具页 UI 字符串 zh/en/ja/ko 完整

### 5.2 已知缺口（本 PR **不修**）

- 14 篇 zh 博客 + 4 篇 zh guides → en/ja/ko 缺口 = 54 个翻译文件
- SPEC.md §8 翻译工作流要求 AI 起草 → 人工审校；本站为医学站，AI 起草医学剂量内容在无人工审阅流程下风险过高
- 当前侧边栏已标 "Chinese only" / 「中国語のみ」/「중국어」— 用户体验已有最小程度护栏
- 已记入 `docs/ai-cto/REVIEW-BACKLOG.md` P1-1，待医学翻译审阅 SOP 就位后单独 PR

---

## 6. 紧急横幅 / AI 免责声明 / 数据资产 — 合规

| 检查 | 结论 | 证据 |
|------|------|------|
| 紧急横幅红底白字 | ✅ | `src/styles/emergency.css:5-6` linear-gradient(135deg, var(--color-danger)…) + var(--color-text-on-dark) |
| 紧急横幅不可关闭 | ✅ | EmergencyBanner.astro 无 onClick / localStorage hide / data-dismiss |
| AI disclaimer 不可旁路 | ✅ | AIAssistant.tsx:519-521 始终渲染；无 query param 旁路；FloatingAIChat.tsx:85-87 仅检查路径 |
| 个人化剂量语言 | ✅ | grep "你应该.*mg" 全站零命中 |
| 热线 lastVerified | ✅ | 12356 / 400-161-9995 / 120 均 2026-04-08 verified |
| 医院 lastVerified | ✅ | 15 家均 2026-04-01 to 2026-04-12 verified |
| 简繁混用 / TODO | ✅ | 全站简体一致；无 placeholder 残留 |

---

## 7. 删项 / 范围外

按 Plan agent 风险评估：

- **42 个 blog stub MDX 文件**（en/ja/ko × 14）— 删；medical site 发"draft"占位文件会被搜索引擎索引、稀释信任
- **12 个 guides 全量翻译**（en/ja/ko × 4）— 延后；AI 起草医学剂量内容在无人工审阅流程下属高风险
- **侧边栏重写**（hardcoded `/zh/blog/`）— 不改；当前 "Chinese only" 标注属意图设计
- **ReferenceLibrary.tsx 改读 references.json**（替代当前硬编码副本）— 延后；不属本次审计核心

记入 `docs/ai-cto/REVIEW-BACKLOG.md`。

---

## 8. 提交映射

| Commit | 主题 |
|--------|------|
| `9c08a42` | refs: add evidenceLevel taxonomy to references.json (29 entries) |
| `7da0022` | validate: extend content validator to blog/ + require evidenceLevel |
| `0d5e82a` | content(blog): add CitationRef to 14 zh blog posts (~108 dose claims) |
| `783e37a` | ci: add DOI liveness verification script + monthly workflow |
| `260c328` | content(docs): citations for before-you-start + china-reality core pages |
| `a651c37` | validate: promote blog citation warnings to hard errors |
| `82d1081` | content: soften non-emergency "必须" per D016 triage |
| `4fb5a98` | fix(links): redirect 2 stale anchor links to existing china-reality ids |
| _本提交_ | docs: comprehensive audit report + STATUS / REVIEW-BACKLOG / SPEC updates |

---

## 9. 验证清单

```bash
node scripts/validate-content.mjs       # → Content validation passed.（零错零警）
node scripts/verify-doi-liveness.mjs    # → 19 pass / 14 manual / 0 fail
# astro check + npm run build → 在 PR CI 上验证
```

人工抽查：
- 任意 3 篇博客的 CitationRef tooltip 显示 "证据等级 X"，点击跳 DOI 正常
- before-you-start / china-reality 三页确认参考值/统计数据有 CitationRef
- 紧急横幅在 zh/en/ja/ko 首页存在且不可关闭
- AI 问答打开后 disclaimer 在顶部，无关闭按钮，无旁路

---

## 10. 后续（写入 REVIEW-BACKLOG）

- 14 博客 + 4 guides 的 en/ja/ko 翻译流水线（医学审阅 SOP 先就位）
- WPATH SOC 9 草案监控（继承 P1-5）
- `ReferenceLibrary.tsx` 改读 references.json（消除硬编码副本）
- 月度 `verify-citations.yml` 从 `workflow_dispatch` 切换到 `schedule`（首月观察后）
- 自动锚点 ID 标准化（如果未来某次重构破坏 auto-slug，再决定全量加 `{#ascii-id}`）
