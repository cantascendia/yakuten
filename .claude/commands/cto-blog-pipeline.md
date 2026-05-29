---
name: cto-blog-pipeline
description: SEO 医疗博客生产线（§39 Manager-Worker + §34 planner/generator/evaluator 分离）— 多域选题讨论（含可循证性硬门槛）→ 主控决策 → 写作 → 多域评审辩论 → 主控逐条复核 → 定稿。产出一篇可发布的 zh 博客 mdx。
argument-hint: "[选题方向 | 留空=从博客缺口里选]"
allowed-tools: ["Agent", "TeamCreate", "SendMessage", "TeamDelete", "TaskCreate", "TaskUpdate", "Read", "Write", "Edit", "Glob", "Grep", "Bash(git*)", "Bash(node*)", "Bash(npm run build*)", "Bash(npx astro check*)"]
model: opus
disable-model-invocation: false
---
# SEO 医疗博客生产线

为 yakuten（HRT药典）产出一篇**可发布、可循证、SEO 友好**的中文博客。$ARGUMENTS（留空 = 从博客缺口里挑选题）。

## 角色（§34 planner / generator / evaluator 分离）

| 阶段 | 角色 | agentType |
|---|---|---|
| Planner | 选题策划（主控）+ SEO 策略 | 主控 + `seo-content-strategist` |
| Generator | 博客写作 | `medical-blog-writer` |
| Evaluator | 多域评审 | `clinical-safety` / `editorial-evidence` / `zh-linguistics` / `persona-young-diy`（+ `persona-friendly-clinician` 医疗内容必到） |

## 流程

### 1. 选题讨论（多域互相讨论）
并行起 4 域给候选选题排序、互辩、预判分歧：
- `seo-content-strategist` — 长尾量/竞争/缺口/内链
- `persona-young-diy` — 真实搜索意图
- `clinical-safety` — 医学优先级/减害价值
- `editorial-evidence` — **可循证性（references.json 能否支撑核心声明）**

### 2. 主控决策（硬门槛优先）
主控综合四域，按**优先级**裁决：
1. **可循证性是硬门槛**（不可妥协）：references.json 支撑不足的选题，无论 SEO/临床多热都**不写**（否则违反「无 citation = 无 content」）。
2. 在可循证的选题里，取 SEO × 临床价值 × 用户需求最优者（各域均不垫底）。
3. 输出：选定 selma + targetKeyword + 大纲 + 可挂引用 ID 清单（先 `node -e` 核对这些 id 真实存在）。

### 3. 写作（generator）
`medical-blog-writer` 按选题写 `src/content/blog/zh/<slug>.mdx`：
- 数字只来自仓库（`src/data/*.json` + docs），`git grep`/Read 核对，不杜撰。
- 每条医学声明挂已核实 CitationRef；authors/year **与 references.json 一字一致**；量化结论如实写（OR/RR 不泛化）。
- 结构：结论→对比表→详解→怎么选→安全红线→监测→内链；frontmatter description **≤160 字符**；faqs 做 AEO。
- `npm run build` 自检编译 + 引用 id 存在性。

### 4. 多域评审辩论（evaluator）
并行起评审域审单文件，互相讨论：
- `clinical-safety` — 数字与 docs 一致性、安全红线（峰值/VTE、急症具体路径）、无个人化处方
- `editorial-evidence` — 无裸声明、引用-声明吻合、authors 与 json 一致
- `zh-linguistics` — 自然度/术语/信息密度/无错字
- `persona-young-diy`（+ `persona-friendly-clinician`）— 能否看懂照做、货源现实（**不得加购药渠道**，改链 china-reality）、最低配血检、低出柜急诊话术

### 5. 主控逐条复核（不可省的门）
对每条评审发现**亲自核对**：`git grep`/Read 验证位置与字符串真实存在、`node -e` 核对 references.json 的 authors/year、数字与 docs 比对。**经验：评审 agent 会幻觉、会标错文件、会误报 authors**——必须验证后才采纳。区分"真缺陷=改" vs "项目红线限制（如购药渠道禁止）=不改"。

### 6. 定稿
应用确认的修订 → `npm run build` 通过 → `draft: false`。产出可发布博客。

## 不可妥协约束

- 可循证性硬门槛；每条医学声明挂 CitationRef + DOI；无绝对语（安全红线/禁忌/急症除外）。
- 绝不：个人化处方、**购药渠道/商业链接**、弱化危险警告、杜撰数字/引用。
- 中文优先；面向大陆 DIY 受众；预算/出柜/就医三重障碍纳入考量。
- 医疗内容：主控复核 = 签字门；重大医学判断仍可上报人类。

## 选题目标

$ARGUMENTS
