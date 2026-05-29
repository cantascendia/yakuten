---
name: cto-review-team
description: 跨领域评审 agent team（§19 跨域版）— 起一个持久团队（临床/编辑/中文/前端 4 专家 + DIY用户/友好医师/社区 3 用户代表 + 边界安全/无障碍 2 条件域），对 PR/内容多域辩论（原生 SendMessage 互相讨论）→ 主控逐条复核 → 输出共识 MUST/SHOULD/LATER。补足 codex 跨模型飞轮（§48）之外的"跨领域"层。
argument-hint: "[PR号 | 分支 | 文件路径 | HEAD]"
allowed-tools: ["TeamCreate", "SendMessage", "TeamDelete", "TaskCreate", "TaskUpdate", "Agent", "Read", "Glob", "Grep", "Bash(git diff*)", "Bash(git show*)", "Bash(git grep*)", "Bash(git log*)", "Bash(npm run build*)", "Bash(npx astro check*)"]
model: opus
disable-model-invocation: false
---
# 跨领域评审团队

对 `$ARGUMENTS`（默认当前 `master...HEAD`）做多领域并行评审 + 原生互辩。本命令是 **cross-domain** 层，与 codex-bridge（§48 cross-model）互补、不替代。

## 何时用本命令 vs 一次性 sub-agent

- **用本命令**：医疗内容 / AI 委派润色 PR / 需要多域互相辩论或多轮、需要用户代表视角时。
- **用一次性 Agent（更省）**：单一维度的小改、明确范围的快速检查。

## 角色 roster 与激活规则（按改动面激活子集，控成本）

| 成员（agentType） | 默认激活条件 |
|---|---|
| `clinical-safety` | 医疗内容（medications/dose-limits/risks/blood-tests/emergency/drugs.json/blood-ranges.json） |
| `editorial-evidence` | 任何内容 mdx |
| `zh-linguistics` | 任何 zh 内容 |
| `frontend-data` | 触及 `src/components`、`src/data`、构建、frontmatter |
| `persona-young-diy` | 内容 / 工具变更（面向用户的页面） |
| `persona-friendly-clinician` | 医疗内容 |
| `boundary-security` | **条件**：触及 `api/`、auth、secrets、系统提示、forbidden 路径 |
| `a11y-i18n` | **条件**：触及 UI 组件、i18n、医疗警告四语同步 |
| `persona-community-org` | **条件**：重大内容/政策/定位类改动 |

> 默认核心 6 人（前 6 行）；后 3 行按改动面唤醒。纯文档/配置改动可不起团，直接 sub-agent。

## 执行流程（主控 = 你）

1. **建团**：`TeamCreate({team_name: "yakuten-review", agent_type: "review-lead", description: ...})`。
2. **建共享任务**：每个激活成员一个"立场"任务 + 主控一个"综合复核"任务（`TaskCreate`，自动入团队列表）。
3. **Round 1 独立立场**：用 `Agent({team_name, name, subagent_type: <agentType>})` 起激活成员（agentType 取上表 name，定义在 `.claude/agents/`）。各成员读 `git diff master...HEAD -- <聚焦路径>`，写立场任务，`SendMessage` 摘要给 `team-lead`。
4. **Round 2 互相辩论**：主控提取跨域争议（典型：安全语气软化 vs 无绝对语规则；软化=减害 vs 松绑就医），**指示相关成员彼此直接 DM**（如 clinical-safety ↔ editorial-evidence、persona-young-diy ↔ persona-friendly-clinician）收敛，结果报主控。
5. **主控逐条复核（不可省的门）**：对每条发现用 `git diff master...HEAD`、`git grep -nF '<原文片段>'`、读源码 / dist 核对。**经验：成员常把发现标错文件（diff 流行号 ≠ 文件行号），且会幻觉**——必须验证文件归属与字符串真实存在后才采纳。
6. **输出共识**：MUST（安全/准确/一致性）/ SHOULD（证据精度/可见缺陷）/ LATER（可读性迭代）/ WATCH（可接受）/ DISCARDED（核对判为幻觉，注明）。
7. **落地**：仅在用户批准后由主控应用修复；read-only 成员不动文件；**人类医疗签字不可替代**（CPA/螺内酯/注射页）。
8. **收尾**：`SendMessage({type:"shutdown_request"})` 逐个关停成员 → 待全部终止 → `TeamDelete`。

## 不可妥协约束

- 评审员 read-only，不 merge；医疗红线 agent 不可突破（immutable-guard 兜底）；forbidden 路径改动仍走 spec + 双签。
- 主控必复核：单 agent 会幻觉，结论须主控独立验证（同 §19、memory「PR 审查用 agent team」）。
- 中文优先。

## 三档语气原则（评审医疗文案软化时的团队标尺）

「**对药狠，对人柔，对急症快**」+「**语气可软，动作不可虚**」。A 档事实禁忌=绝对语气（针对药/行为）；B 档急症停药=短祈使+具体就医路径；C 档对人引导=不评判，但把"建议咨询医生"换成低出柜风险的具体动作。

## 评审目标

$ARGUMENTS
