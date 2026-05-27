---
name: eval-gate-policy
description: >
  §35 Eval-Driven Development 强制规则（铁律 #12）。当 Claude 编辑 .claude/commands/、
  .claude/agents/、.claude/skills/、.agents/skills/、CLAUDE.md、playbook/handbook.md、
  .claude/output-styles/ 等 prompt/agent 配置类文件时自动加载。
  强制：无 eval 不进 main。配套 eval-gate.sh 注入 PostToolUse 提醒。
user-invocable: false
paths:
  - "**/.claude/commands/**"
  - "**/.claude/agents/**"
  - "**/.claude/skills/**"
  - "**/.agents/skills/**"
  - "**/CLAUDE.md"
  - "**/playbook/handbook.md"
  - "**/.claude/output-styles/**"
---

# Eval Gate 策略 (§35 / 铁律 #12)

你正在改 **prompt 类文件**（commands / agents / skills / CLAUDE.md / handbook）。
这些是 ai-playbook 的"软件"— 改了它们，AI 行为就变。**无 eval 验证就 ship 等于 vibe shipping**。

## 强制门禁

合并到 main 前必须满足：
1. ✅ `evals/golden-trajectories/` 中存在覆盖本改动的 yaml case
2. ✅ `/cto-eval run` 通过
3. ✅ regression 集（既有 case）也通过（无回归）

## 你应如何响应

### 改 commands/agents/skills 后

立即检查（用 Bash）：
```bash
# 看是否已有覆盖此改动的 eval
ls evals/golden-trajectories/ | grep -i "<相关关键词>"
```

**有覆盖** → 跑 `/cto-eval run` 验证不回归
**无覆盖** → 必须先 `/cto-eval add <描述>` 创建 yaml case，再跑

### 改 CLAUDE.md / handbook

更广义影响。检查：
- 是否引入新铁律 / 新流程 / 新 agent 行为
- 如果是 → 至少 1 条新 eval 覆盖新行为
- 如果只是 typo / 注释 / 格式 → 可 export `CTO_EVAL_GATE_ACK=1` 跳过

### Eval yaml 必填字段

```yaml
id: NNN-<short-name>
description: <一句话说明这条 eval 验证什么>
input: |
  <模拟的用户输入或场景>
expected_steps:
  - <CTO 应该执行的步骤 1>
  - <步骤 2>
forbidden_actions:
  - <不该做什么 1>
  - <不该做什么 2>
acceptance_criteria:
  - <可量化验收标准 1>
  - <验收 2>
priority: P0|P1|P2
```

### 当 hook eval-gate.sh 注入提醒时

1. **不要无视**
2. 在响应里 ack：
   > "刚改了 [commands/agents/skill X]，按铁律 #12 我会：
   > - 检查 `evals/golden-trajectories/` 是否有 covering case
   > - 无覆盖则先 /cto-eval add
   > - commit 前 /cto-eval run"
3. 实际去做（不要只是嘴上说）

## 例外（必须明示）

| 改动类型 | 是否需要 eval |
|---|---|
| typo 修复 | ❌ 不需要，但 commit msg 标 `chore:` 或 `docs:` |
| 注释调整 | ❌ |
| 格式化（不改语义） | ❌ |
| 章节顺序调整 | ❌ |
| 新功能/新 hook/新 agent 行为 | ✅ 必须 |
| 改 hook 阈值 / 改 keyword 列表 | ✅ 必须 |
| 删 command/agent | ✅ 必须验证依赖未破 |

跳过时显式说明：
```bash
export CTO_EVAL_GATE_ACK=1   # 本会话 prompt 改动是 typo/格式调整，无行为变化
```

## 反模式

| 反模式 | 识别 |
|---|---|
| 改完 prompt 直接 commit | 没跑 /cto-eval run |
| Eval 仅有 happy path | forbidden_actions 为空 |
| Eval 验收标准不可量化 | "should be good" 而不是具体断言 |
| 删 eval 让其通过 | 等同于改测试让其通过（铁律 #14） |

## 引用

- handbook §35 全文（Eval-Driven Development）
- CLAUDE.md 铁律 #12
- `.claude/hooks/eval-gate.sh`（注入提醒层）
- `.claude/rules/eval-gate.md`（详细规则）
- `evals/golden-trajectories/`（现有 case 集）
