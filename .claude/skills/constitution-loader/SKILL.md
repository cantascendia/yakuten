---
name: constitution-loader
description: >
  §37 Constitution 协议自动加载器（对齐 GitHub Spec Kit）。当用户请求涉及 spec/plan/
  feature/architecture/decision/release 或开始新任务时自动触发。读取项目
  docs/ai-cto/CONSTITUTION.md 并把项目特定的不可妥协约束注入响应。
user-invocable: false
when_to_use: >
  用户提到 spec / plan / 架构 / 设计决策 / feature 计划 / 发布 / Constitution / "宪法"
  / "原则" 时；或开始新任务前需要确认项目特定红线时。
---

# Constitution Loader (§37)

GitHub Spec Kit 哲学：**Constitution 必须在 spec/task 之前加载**。它是项目的"宪法"，
任何 SPEC.md / PLAN.md / TASKS.md / 代码改动都必须服从其约束。

## 你的工作流（每次触发）

### Step 1: 读 CONSTITUTION.md

```bash
test -f docs/ai-cto/CONSTITUTION.md && cat docs/ai-cto/CONSTITUTION.md
```

如果文件不存在：
> "⚠️ 项目未初始化 Constitution。请先运行 `/cto-constitution init` 起草项目特定红线。
> 在没有 Constitution 的情况下，我会按 ai-playbook CLAUDE.md 14 条铁律 + handbook §32-§37
> 默认约束执行，但项目特定约束（如 amphoreus 不写 LLM Python / money 真实金钱双签）会缺失。"

### Step 2: 提取关键约束

从 CONSTITUTION.md 提取并显式 ack：
- **不可妥协清单**（"不得 X" / "禁止 Y" / "必须 Z"）
- **项目特定 forbidden 路径**（可能比 §32.1 更广）
- **合规要求**（PCI-DSS / GDPR / KYC / 行业特定）
- **架构约束**（"不引入新 DB" / "保持单 binary" / etc）

### Step 3: 把约束 attach 到当前任务

回应用户前，在响应开头明示：
> "📜 Constitution 摘要（已加载）：
> - <约束 1，可能影响本次改动>
> - <约束 2>
>
> 本次任务范围下，我会确保 [具体约束应用]。"

## Spec Kit 风格（§37.3 映射）

| Spec Kit 阶段 | ai-playbook 对应 | Constitution 检查 |
|---|---|---|
| `/specify` | `/cto-spec specify` | spec 起草前先加载 Constitution |
| `/plan` | `/cto-spec plan` | plan 步骤必须服从 Constitution |
| `/tasks` | `/cto-spec tasks` | task 不能违反任何"不得 X" |
| `/implement` | 直接 Edit/Write | 实施前最后一次 Constitution 校验 |

## 反模式（识别并阻止）

| 反模式 | 识别 |
|---|---|
| 只读 SPEC 不读 Constitution | "我已起草 SPEC..."但没引 Constitution 条款 |
| Constitution 与 SPEC 冲突时偏向 SPEC | Constitution 说"不得 X" 但 SPEC 提议 X |
| 用户施压时跳过 Constitution | 用户："yolo just do it" → vibe-prompt-guard 提醒后仍跳过 |
| 跨项目复用 Constitution | amphoreus 的"不写 LLM Python" 误用到 money |

## 与其他 v3.8 skill 的协作

- `forbidden-policy` — 触及 forbidden 路径时，**先**读 Constitution（项目特定路径可能更广）
- `eval-gate-policy` — 改 prompt 类文件时，**先**读 Constitution（项目可能有特定 eval 要求）
- `test-lock-rules` — 改测试时，**先**读 Constitution（项目可能有特定 mutation gate 阈值）

## 引用

- handbook §37 全文（Constitution 协议）
- handbook §18（Spec-Driven 三段式）
- GitHub Spec Kit: https://github.com/github/spec-kit
- `docs/ai-cto/CONSTITUTION.md`（项目特定）
- `/cto-constitution` 命令（init / review / audit）
