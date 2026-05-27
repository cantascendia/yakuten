---
name: learned-rules-loader
description: >
  v3.9 Bugbot-style learned rules 自动加载器（Cursor 启发，44k learned rules 验证）。
  当 Claude 触及 .claude/rules/learned/ 目录或被 /cto-evolve apply 写入新 learned rule
  时自动加载。把项目历次自审 / cross-review / commit 沉淀的具体教训注入上下文，
  避免重复犯同类错。
user-invocable: false
paths:
  - "**/.claude/rules/learned/**"
  - "**/.claude/rules/learned/*.md"
---

# Learned Rules Loader (v3.9)

你正在触及项目的 **learned rules archive**（Cursor Bugbot 启发模式）。这些是从历次
自审 / codex cross-review / commit pattern 沉淀的**具体教训**，不是 system prompt 改写。

## 这个 archive 是什么

`docs/.claude/rules/learned/` 目录下的每个 markdown 文件是**一条具体的"我们已经犯过的错"**：

```
.claude/rules/learned/
├── README.md                                          # 写规则的格式约定
├── 2026-05-15-codex-windows-sandbox-fallback.md     # 例：codex 在 Windows 沙箱报 1326，要走 GitHub MCP fallback
├── 2026-05-20-paths-yaml-list-vs-string.md          # 例：SKILL.md paths 字段必须 YAML list 不能 quoted scalar
└── archived/                                          # 月度归档：低频 / 已 superseded 的 rule
```

## 你的工作

### 当被自动 trigger（paths 命中）时

1. **Read** 该目录下**所有** markdown（最多 30 个，超过则按 frequency 排序取 30）
2. 把这些 rules 注入当前任务上下文
3. 在响应里**显式 ack** 哪条 learned rule 对当前任务相关
4. 如果当前任务正在重复某条 learned rule 已警告过的错 → 立即停止 + 引用具体规则

### 当 /cto-evolve apply 调用时

1. 读 SELF-AUDIT 提议
2. 决定是否加新 learned rule（软配置层 — 不改 system prompt）
3. 文件命名 `<YYYY-MM-DD>-<topic-slug>.md`
4. 必填段（按 README.md 格式约定）：
   - 学到的教训：一句话
   - 触发场景：何时该被加载
   - 应该怎么做：具体行为
   - 避免什么：反模式
   - 来源：commit sha / SELF-AUDIT 文件
   - 冷却：30 天内不重复提议同 pattern

## 为什么不直接改 CLAUDE.md / hooks

业界共识（详见 [The Autonomy Dial](https://tao-hpu.medium.com/the-autonomy-dial-why-every-ai-agent-builder-landed-on-the-same-design-trick-e795cc9ae713)）：

> 所有商业 agent（Cursor / Cline / Aider / Devin）都把学到的东西写进**显式审计文件**，
> **绝不**改 system prompt。原因：
> 1. **可审计** — 用户能看到 AI 学到了什么
> 2. **可回滚** — 单个 rule 文件 git 历史，可独立恢复
> 3. **不放大攻击面** — 不破坏 system prompt 完整性
> 4. **可累积**（44k Cursor rules 验证）

## 反模式（你必须识别）

| 反模式 | 应当 |
|---|---|
| ❌ 把新 rule 直接 Edit 进 CLAUDE.md | ✅ 写到 .claude/rules/learned/<date>-<topic>.md |
| ❌ 把新 rule 写成 hook 脚本（破坏 immutable-guard 边界） | ✅ 写 markdown，由 paths-trigger 自动加载 |
| ❌ rule 写得太抽象（"代码要好"） | ✅ 具体可执行（"避免 X 时用 Y"） |
| ❌ rule 没引用来源（无法追溯） | ✅ 含 commit sha / SELF-AUDIT 路径 |
| ❌ rule 与 CLAUDE.md 14 铁律冲突 | ✅ 仅细化铁律实施层（不挑战铁律本身） |

## 与其他 v3.9 组件协作

- `pattern-detector` — 提议加哪条 rule
- `/cto-evolve apply` — 实际写 rule 文件
- `immutable-guard.sh` — 守红线，learned rule 写错也不能突破
- `cto-doctor` — 检查 learned rules 数量 / 月度 freshness

## 引用

- handbook §50 自我进化飞轮（v3.9 新增）
- Cursor Bugbot: https://cursor.com/blog/bugbot-learning
- Cline `.clinerules` docs: https://docs.cline.bot/features/memory-bank
- The Autonomy Dial: https://tao-hpu.medium.com/the-autonomy-dial-why-every-ai-agent-builder-landed-on-the-same-design-trick-e795cc9ae713
