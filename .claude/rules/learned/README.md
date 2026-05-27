# Learned Rules — Bugbot Pattern (Cursor 启发)

每条 learned rule 是一个 markdown 文件，由 `/cto-evolve apply` 写入。
**不**改 CLAUDE.md / system prompt / hooks。Claude 通过 `learned-rules-loader` skill
（paths-trigger）自动加载。

## 业界依据

- **Cursor Bugbot**: 110k repos / 44k learned rules（[blog](https://cursor.com/blog/bugbot-learning)）
- **Cline `.clinerules`**: 显式 markdown，[docs](https://docs.cline.bot/features/memory-bank)
- **共识**：所有商业 agent 都把学到的写显式审计文件，不改 system prompt

## 文件命名

`<YYYY-MM-DD>-<topic-slug>.md`

例：`2026-05-15-codex-windows-sandbox-fallback.md`

## 必填段（模板）

```markdown
# Learned Rule: <一句话总结>

**学到的教训**: <一句话，比如"codex CLI 在 Windows 沙箱里 PowerShell 报 1326，需走 GitHub MCP fallback"

## 触发场景

何时这条 rule 应被加载到上下文：
- 文件路径模式：<glob>
- 关键词：<keyword 1, 2, 3>
- 任务类型：<spec/review/refactor/...>

## 应该怎么做

具体可执行步骤：
1. <step 1>
2. <step 2>
3. <step 3>

## 避免什么

反模式 / 已知错误：
- ❌ <反模式 1>
- ❌ <反模式 2>

## 来源

- SELF-AUDIT: `docs/ai-cto/SELF-AUDIT-<date>.md` Pattern N
- Codex review: REVIEW-QUEUE.md sha=<short-sha> bytes=<N>
- Commit: `<sha>` <date> "<msg>"

## 冷却

- 创建日期: <YYYY-MM-DD>
- 30 天内不重复提议同 pattern
- 月度 retrospective 检查 freshness
```

## 与 v3.9 飞轮组件协作

| 组件 | 职责 |
|---|---|
| `pattern-detector` sub-agent | 提议加哪条 rule（写入 SELF-AUDIT） |
| `/cto-evolve apply` | 实际写 rule 文件到本目录 |
| `learned-rules-loader` skill | 自动加载到上下文（paths-trigger） |
| `immutable-guard.sh` | 守红线 — learned rule 写错也不能突破 |

## 月度归档

每月跑一次（手动或 cron）：
- 看每条 rule 最近 30 天 trigger 次数
- 0 次 trigger → 候选 archive
- 移到 `archived/<year>-<month>/` 子目录
- 主目录保持 ≤ 30 个 active rule（避免过载）

## 红线（写 rule 时必守）

- ❌ rule 与 CLAUDE.md 14 铁律冲突 → 改成"细化铁律实施层"
- ❌ rule 建议绕过 hook（如"在某场景下用 --no-verify"）
- ❌ rule 没引用来源 → 无法追溯
- ❌ rule 太抽象（"代码要好"）→ 必须具体可执行
- ✅ rule 引用具体 commit / SELF-AUDIT / REVIEW-QUEUE 条目
- ✅ rule 含触发场景 + 应做 + 避免，三段齐
