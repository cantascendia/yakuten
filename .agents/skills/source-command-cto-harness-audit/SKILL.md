---
name: "source-command-cto-harness-audit"
description: "Harness 设计自审（§34 八条原则）— 评分 AGENTS.md / settings / commands / hooks / skills / memory，输出 health score"
---

# source-command-cto-harness-audit

Use this skill when the user asks to run the migrated source command `cto-harness-audit`.

## Command Template

# Harness 设计自审（手册 §34 八条原则）

对当前项目的 AI agent harness 配置（AGENTS.md / settings.json / commands / hooks / skills / 记忆文件）做一次完整体检。

## 执行步骤

### 1. 收集 Harness 组件清单

读取并报告：
- `AGENTS.md`（行数、字节数、是否超 8KB / 16KB 警戒线）
- `docs/ai-cto/CONSTITUTION.md`（若存在）
- `.Codex/settings.json` 的 `permissions` / `mcpServers` / `hooks`
- `.Codex/commands/*.md`（数量 + 列表）
- `.Codex/agents/*.md`（若存在，子代理定义）
- `.agents/skills/*/SKILL.md`（数量 + 名称）
- `docs/ai-cto/HARNESS-CHANGELOG.md`（若存在）

### 2. 按 §34.1 八条原则逐条审计

输出表格，每条评分（✅ / ⚠️ / ❌）+ 证据 + 改进建议：

| # | 原则 | 评分 | 证据 | 改进建议 |
|---|---|---|---|---|
| 1 | Context Engineering > Prompt Engineering | | AGENTS.md 大小、是否引用 docs/ai-cto/ 而非塞入 | |
| 2 | Lazy Tool Loading | | settings.json 是否预启用所有 MCP / 是否依赖 ToolSearch | |
| 3 | Self-contained, Non-overlapping Tools | | 是否有功能重叠的命令 / Skills | |
| 4 | Token-efficient Tool Outputs | | 是否有工具输出未裁剪噪音 | |
| 5 | Minimal Necessary Intervention | | hooks 是否过度使用（用 hooks 当 prompt） | |
| 6 | Fail-Fast + Recovery Path | | 是否有重试 / 回退路径 | |
| 7 | Multi-Agent Separation | | planner / generator / evaluator 是否分离 | |
| 8 | Durable State + Validation Gates | | docs/ai-cto/ 是否完整 / 关键节点有 eval/test gate | |

### 3. 三 Agent 模式映射检查

对照 §34.2 Anthropic 三 Agent Harness 模式：

```
Planner（规划层）：使用什么模型 + 模式？
  ├── 推荐：Codex Plan mode + /cto-spec
  └── 实际：[扫描结果]

Generator（生成层）：使用什么 sub-agent / Worktree？
  ├── 推荐：Codex 主线 + sub-agents 并行 + Codex 隔离
  └── 实际：[扫描结果]

Evaluator（评估层）：是否启用 /cto-review + Browser Subagent？
  ├── 推荐：每个关键 PR 走 §19 交叉审核
  └── 实际：[扫描结果]

Validator（验证层）：CI/CD 是否覆盖 §23 进阶项？
  ├── 推荐：Lint + Test + SAST + SBOM + AI Review
  └── 实际：[扫描结果]
```

### 4. 计算 harness 健康分

按以下加权评分（满分 100）：

- 八条原则平均分（40 分）
- 三 Agent 完整度（20 分）
- HARNESS-CHANGELOG 维护程度（15 分）
- Eval 集存在性（§35）（15 分）
- 反模式规避（§32.5）（10 分）

### 5. 输出报告

```markdown
## 🔧 Harness 设计自审报告

### 总分：X / 100

### 八条原则评分
[完整表格]

### 三 Agent 模式映射
[planner / generator / evaluator / validator 现状]

### 关键改进项（按 ROI 排序）
1. [问题 + 建议方案 + 预计改进多少分]
2. ...

### 立即可执行的 5 项（每项 ≤ 30 分钟）
- [ ] ...

### 需写入记忆
- `docs/ai-cto/HARNESS-CHANGELOG.md` 加本次审计结果
- `docs/ai-cto/STATUS.md` 更新 harness 健康分
```

## 注意

- 这是审计而非修改，不要直接改 AGENTS.md / settings.json
- 改进建议要具体（"改 settings.json 第 X 行"），不要笼统
- 优先级看 ROI，不要追求满分
