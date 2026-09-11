# Eval Gate 规则（手册 §35 / 铁律 #12）

## 触发条件

修改以下文件时**必须配套 eval**：
- `CLAUDE.md`
- `**/.claude/commands/*.md`
- `**/.claude/agents/*.md`
- `**/.agents/skills/*/SKILL.md`
- `**/.claude/skills/*/SKILL.md`
- `playbook/handbook.md`

## 强制铁律

**铁律 #12：无 eval 的 agent 配置改动不得进 main**。

合并到 main 前必须：
1. ✅ `evals/golden-trajectories/` 中存在覆盖该改动的 yaml case
2. ✅ `/cto-eval run`（或 eval-runner sub-agent）通过
3. ✅ regression 集（既有 case）也通过（无回归）

## Eval 集组织（手册 §35.2）

```
evals/
├── README.md
├── golden-trajectories/
│   ├── 001-add-feature.yaml
│   ├── 002-fix-bug.yaml
│   └── ...
├── regression/      # 历史回归 case
└── capability/      # 能力扩展 case
```

每条 yaml 必填：
- `id`、`description`、`input`
- `expected_steps`（CTO 应该执行的步骤）
- `forbidden_actions`（不该做什么）
- `acceptance_criteria`（可量化验收）
- `priority`（P0/P1/P2）

## 推荐工具

- **Braintrust** — trajectory-level scoring + CI/CD 集成
- **LangSmith** — 节点级评分（用 LangGraph 的项目首选）
- **Promptfoo** — 红队 / prompt injection（OpenAI 2026-03 收购）
- **本地脚本** — 手动跑 yaml 对比（最小可行）

## 触发命令

- `/cto-eval init` — 首次创建 evals/ 结构
- `/cto-eval audit` — 审视现有 eval 集是否需扩充
- `/cto-eval add [任务描述]` — 添加新 trajectory
- `/cto-eval run` — 跑全部 eval 报告 pass/fail

完整定义见手册 §35 Eval-Driven Development。
