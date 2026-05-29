# 委派规格：全站中文内容润色（Antigravity / Gemini 3.1 Pro High）

**Date**: 2026-05-26
**Owner**: 委派人 = Claude Code (Opus 4.7) · 执行人 = Antigravity (Gemini 3.1 Pro High)
**Branch**: `chore/zh-polish-by-antigravity`
**Base**: `origin/master @ a96378a`
**SSOT**: 本文件
**Sister doc**: `ANTIGRAVITY-PROMPT-zh-polish.md`（直接喂给 Antigravity 的 prompt）
**关联手册**：playbook §5（三平台委派）· §18（spec-driven）· §26（设计 / 中文 tone 基线源自 editorial-policy.mdx）

---

## 1. 委派理由

| 维度 | 评估 |
|---|---|
| 模型选型 | Gemini 3.1 Pro High 在中文长文写作 / 修辞 / 节奏控制上强于 Claude，符合 CLAUDE.md「浏览器验证 / UI 设计 / 中文打磨 → 委派 Antigravity」分工 |
| 任务性质 | 大规模文本润色（71 个 mdx + 3 个 i18n JSON 的 zh keys），非代码改动 |
| 风险 | 医疗内容触碰 = 用户安全风险 → 必须 PR 双重 review，禁止直接 merge |
| 工作量 | 71 文件 × 平均 200 行 ≈ 14k 行待润色，单 Claude session 容易触上下文上限，外部代理更合适 |

---

## 2. 范围（IN-SCOPE）

### 2.1 主文件清单

**Docs zh（57 个）** — `src/content/docs/zh/**/*.mdx`：
- 根目录文档（13 个）：`about / before-you-start / blood-tests / breast-development / china-reality / controversies-faq / dose-limits / editorial-policy / feedback / index / medical-advisors / methodology / pathway / risks`
- `compare/`（3 个）：`cpa-vs-spironolactone / gel-vs-patch / oral-vs-injection`
- `guides/`（4 个）：`first-injection / switch-antiandrogen / switch-e2-route / index`
- `medications/antiandrogens/`（5 个）：`bicalutamide / cpa / gnrh-agonists / overview / spironolactone`
- `medications/estrogens/`（10 个）：`banned-estrogens / cypionate / enanthate / gel / injection / oral / overview / sublingual / transdermal-patch / undecylate`
- `medications/five-alpha-reductase/`（3 个）：`dutasteride / finasteride / overview`
- `medications/progestogens/`（5 个）：`cautioned-progestins / drospirenone / dydrogesterone / hydroxyprogesterone / overview / progesterone`
- `medications/banned-drugs.mdx`
- `appendix-references.mdx`
- `tools/`（10 个）：`ai-assistant / blood-checker / brand-index / dose-simulator / drug-cards / drug-comparator / hospital-finder / index / injection-calculator / risk-screener`

**Blog zh（14 个）** — `src/content/blog/zh/**/*.mdx`：
`blood-test-timing-after-injection / bujiale-how-to-take / bujiale-sublingual-vs-oral / cpa-dose-safe-range / cpa-meningioma-risk-evidence / cpa-side-effects-guide / cpa-vs-spironolactone / estradiol-gel-how-to / hormone-panel-interpretation / hrt-emergency-symptoms / hrt-monitoring-schedule / hrt-safe-discontinuation / hrt-timeline-effects / oral-vs-patch-safety`

**i18n JSON zh keys（3 个）**：
- `src/i18n/tool-strings.json`（`bloodChecker.zh`）
- `src/data/blood-ranges.json`（zh notes / 解读文本）
- `src/data/drugs.json`（zh 名称 / 简介）

**总计**：71 mdx + 3 JSON = 74 文件

### 2.2 OUT-OF-SCOPE（不要碰）

- ❌ 任何 `.tsx` / `.astro` / `.ts` / `.js` 源代码（i18n 已外化的部分，碰 JSON 即可）
- ❌ `src/content/docs/{en,ja,ko}/` 任何非中文文件
- ❌ `CLAUDE.md` / `docs/ai-cto/CONSTITUTION.md` / `playbook/` / `.claude/`（immutable）
- ❌ `package.json` / `astro.config.mjs` / 任何配置文件
- ❌ `references.json`（学术引用不可润色）
- ❌ `hospitals.json` / `drug-brands.json`（事实数据）

---

## 3. 风格指南（沿用并强化 editorial-policy.mdx）

### 3.1 已有的 4 条原则（必守）

1. **去绝对化**：用"建议 / 通常 / 大多数情况"替代"必须 / 一定 / 永远"
2. **以读者为主语**：写"你可以选择 A 或 B"，而非"患者应该选择 A"
3. **明示不确定性**：证据等级 B/C/X 的结论要附"数据有限"或"专家意见"
4. **去污名**：使用社区自认语汇，避免"变性 / 易性癖"等过时 / 临床化表述

### 3.2 本次润色新增 5 条提升

5. **节奏感**：长短句交错。每段不超过 4 句、不少于 2 句（除非引用块）。避免连续 3 个同样结构的句子。
6. **删冗余副词**：删"非常 / 极其 / 十分 / 相当"等无信息量副词。用具体数字或对比代替。
7. **动词具体化**：把"进行监测" → "查"；"做出选择" → "选"；"产生影响" → "影响"。中文动词宁短勿长。
8. **去翻译腔**：避免"如上所述 / 综上所述 / 值得注意的是 / 不可忽视"。中文母语者不这样开头。
9. **关怀但不滥情**：医疗信息要"冷静的温度" — 提示 + 邀请，不是 caretaking。例如 "如果你担心 X，可以做 Y" 优于 "亲爱的姐妹请一定要 ⋯"。

### 3.3 用户画像（影响 tone）

- **主体**：中国大陆 DIY HRT 跨性别女性，年龄 18-35 居多，受过高等教育（半数大学+），技术 literacy 高，但医学背景缺
- **场景**：紧张地查"我这个数据正常吗"、出门前快速确认"今天能不能吃药"、半夜睡不着翻"会不会得脑膜瘤"
- **不要**：说教 / 训诫 / 把用户当病人 / 假装亲密（"姐妹"高频使用过度）
- **要**：尊重智力 / 给信息 + 给选择 / 让人冷静下来 / 用她自己能复述给医生的语言

### 3.4 术语表（用此规范，不要回退到不规范变体）

| 标准用法 | 不要用 |
|---|---|
| 雌二醇 / E2 | 雌激素（除非泛指）/ 雌孕激素 |
| 睾酮 / T | 雄激素（除非泛指）|
| 抗雄（首次出现写"抗雄激素"再缩写） | 抗男性激素 |
| 跨性别女性 / 跨女 | 变性女性 / MtF（保留学术语境用）|
| HRT / 性别肯定激素治疗 | 变性激素 / 性别重置激素 |
| 色谱龙 / CPA / 醋酸环丙孕酮 | 醋环丙孕酮 / 赛普龙 |
| 螺内酯 / Spiro | 螺旋内酯 / 安体舒通（除非引品牌名）|
| 血栓 / VTE / 深静脉血栓（DVT）/ 肺栓塞（PE） | 血凝块 |
| 脑膜瘤 | 脑瘤（不精确）|
| 泌乳素 / PRL | 催乳素（除非引文献）|
| 经皮 / 透皮 | 皮肤吸收 |
| 性别认同 / 性别表达 | 性向（含义不同）|
| 友好医疗 / trans-friendly | 同志友好（含义不同）/ LGBT 友好 |
| 顺性别 | 普通人 / 正常人（含贬义） |

### 3.5 数字、剂量、化学名 — 不可改

任何形如以下的内容**不得修改**：
- 剂量数字：`5 mg/日` / `100 µg` / `200 mg`
- 范围：`E2 100-200 pg/mL`
- 时间：`每 3-6 个月` / `Q2W` / `Q4W`
- 学名 / 化学品名：`estradiol valerate` / `medroxyprogesterone acetate`
- 数据来源数字：`<0.5% (年度)` / `OR=2.4`
- 引用编号：`<CitationRef id="canonico-2018" num={3} ... />` 整个组件原样保留
- 化学结构 / 通路：`GnRH → LH/FSH → 睾酮`
- 检验单位：`mg/dL` / `pg/mL` / `IU/L` / `µg/L`

修润色周围措辞时，**镶嵌**这些不可改 token，不要重写。

---

## 4. 技术红线（不可破坏）

### 4.1 MDX 结构

- **frontmatter 字段**：
  - `title` 可润色但 ≤ 60 字符（SEO 限制）
  - `description` 可润色但 ≤ 160 字符（SEO 限制），必须包含关键词
  - 其它字段（`evidenceLevel / lastReviewed / references / faqs / category / targetKeyword` 等）**不动**
- **import 语句**：完全不动
- **JSX 组件**：
  - 组件名、prop 名、prop 值（数字 / id / level / num）**不动**
  - 仅可润色 children 文本（在 `<Component>...</Component>` 之间的中文）
  - 自闭合组件（`<CitationRef ... />`）整个不动
- **Markdown**：
  - 标题层级（`#` / `##` / `###`）不变
  - 列表结构（`- ` / `1. `）不变
  - 锚点 ID（如果手写）不变
  - 内部链接 `[文字](/zh/xxx/)` 路径不变，仅可润色"文字"
  - 外部链接同上

### 4.2 i18n JSON

- 键名（`bloodChecker / sections / inputTitle` 等）**不动**
- 仅润色 value（字符串）
- 保留 emoji / 标点 / 换行 / Markdown 内联

### 4.3 SEO

- frontmatter `title` 不能丢首要关键词（如药物名 / 工具名）
- `description` 必须含至少 1 个 target keyword
- 不引入新的关键词堆砌

### 4.4 链接 / 锚点

- 不要新建链接
- 不要删现有链接
- 锚点 ID（`#section-1`）保留

### 4.5 build 必须通过

提交前自测：
```bash
npm run build       # 必须 exit 0
npx astro check     # 必须 0 errors
```

如有 build error，**修复后再提交**，不要带着 broken state push。

---

## 5. 工作流

### 5.1 分支与起点

- 基线分支：`chore/zh-polish-by-antigravity`（已从 `origin/master @ a96378a` 创建并推送）
- Antigravity 在此分支上工作，不要切其它分支
- 不要 rebase / merge master（保持线性历史）

### 5.2 提交节奏

建议按文件**类别**分 commit（避免单一 mega-commit 难 review）：

| Commit | 范围 | 估计文件数 |
|---|---|---|
| 1 | `polish(zh): 核心安全文档（根目录 14 个）` | 13 |
| 2 | `polish(zh): 药物详解（estrogens 10 + antiandrogens 5）` | 15 |
| 3 | `polish(zh): 药物详解（progestogens 5 + 5α 3 + banned）` | 9 |
| 4 | `polish(zh): compare + guides + tools（17）` | 17 |
| 5 | `polish(zh): blog（14）` | 14 |
| 6 | `polish(zh): i18n JSON zh keys` | 3 |

每个 commit message 必须含：`Per DELEGATION-2026-05-26-zh-content-polish.md §X`

每个 commit 前**先跑 build**，确保不破坏。

### 5.3 PR 创建

**全部 commit 完成后**，创建 PR：

```bash
gh pr create \
  --base master \
  --title "polish(zh): full-site Chinese content polish by Gemini 3.1 Pro" \
  --body "$(cat <<'EOF'
## Summary

按 `docs/ai-cto/DELEGATION-2026-05-26-zh-content-polish.md` 全量润色 71 个 zh mdx + 3 个 i18n JSON。

- 委派模型：Antigravity (Gemini 3.1 Pro High)
- 风格基线：editorial-policy.mdx + DELEGATION §3
- 红线：DELEGATION §3.5（数字 / 剂量 / 化学名 / 引用 ID 不动） + §4（MDX 结构 / SEO / 链接不破坏）

## 修改范围

- 57 docs/zh mdx
- 14 blog/zh mdx
- 3 i18n JSON（zh keys only）

## Test plan

- [x] `npm run build` 通过
- [x] `npx astro check` 0 errors
- [ ] 人工逐文件 review（**禁止一键 merge**）
- [ ] 关键药物页 medical reviewer 签字（CPA / spironolactone / 注射类）
- [ ] 抽样 5 篇博客读音流畅度盲测
- [ ] frontmatter title/description 不超字符限制（脚本检查）

## ⚠️ 禁止合并条件

- 任何剂量数字 / 引用 ID / 化学名被改动
- 任何 frontmatter 字段除 title/description 被改
- 任何 import / JSX 组件 props 被改
- 任何医疗警告（DVT / 肝损 / 脑膜瘤）的安全语义被弱化

Co-Authored-By: Antigravity Gemini-3.1-Pro <noreply@anthropic.com>
EOF
)" \
  --label needs-medical-review \
  --label requires-double-review \
  --label content-polish
```

如标签不存在：`gh label create needs-medical-review --color FFD700` 同理。

---

## 6. 验收标准（Reviewer 用）

### 6.1 自动检查（PR CI）

- [ ] `npm run build` exit 0
- [ ] `npx astro check` 0 errors
- [ ] frontmatter title ≤ 60 字符（脚本）
- [ ] frontmatter description ≤ 160 字符（脚本）
- [ ] 引用编号数量 unchanged（grep `<CitationRef` count diff = 0）
- [ ] 链接数量 unchanged 或新增（不能减少）

### 6.2 人工抽样检查（至少 10% 文件）

- [ ] 高风险页 100% review：`risks.mdx` / `dose-limits.mdx` / `breast-development.mdx` / `blood-tests.mdx` / `medications/antiandrogens/cpa.mdx` / `medications/estrogens/injection.mdx`
- [ ] 随机抽 3 篇博客读流畅度
- [ ] 抽 3 个药物详解检术语表合规
- [ ] 检查至少 2 个 i18n JSON 中文 value

### 6.3 reject 触发条件

任何一条 → 直接 close PR 重做：
- 改动剂量数字 / 化学名 / 引用 ID
- frontmatter 非 title/description 字段被动
- 引入新的医学声明（无 CitationRef）
- 弱化任何紧急警告
- 删除 EmergencyBanner / CrisisHotline / DangerBox 等关键组件
- 引入新链接到外部购药 / 个人化处方 / 未审核内容

---

## 7. 回滚方案

- 任何阶段：close PR → 分支保留作历史
- 已发现错误但 PR 已合并：`git revert <merge-sha>` 创建 revert PR
- 仅个别文件需回退：`git checkout master -- <file>` 在新 fix PR 中处理

---

## 8. 后续

- PR 合并后，跑 `/cto-cross-review` 让 Codex 对差异做八维评审
- 如效果好，把本 DELEGATION 升级为可重复模板（`docs/ai-cto/templates/delegation-content-polish.md`）
- 考虑同样流程对 en/ja/ko 各做一轮（用对应母语强势模型）

---

## 9. 联系 / 反馈

- 委派人意图说明：本 doc
- Antigravity 执行 prompt：`docs/ai-cto/ANTIGRAVITY-PROMPT-zh-polish.md`
- 任何对范围 / 红线 / 验收的修改 → 先改本 doc，commit message 引用，再让 Antigravity 重读
