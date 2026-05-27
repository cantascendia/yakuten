---
name: cto-evolve
description: v3.9 自我进化飞轮入口（detect/propose/apply/status 四段式）。AlphaEvolve evaluator-grounded + Cursor Bugbot learned rules + Sakana DGM lineage + Voyager skill candidate + Constitutional anchor。
argument-hint: "[detect|propose|apply <pattern-id>|status]"
allowed-tools: ["Read", "Write", "Edit", "Glob", "Grep", "Bash(*)", "Agent"]
model: opus
disable-model-invocation: false
---

# CTO Evolve — 自我进化飞轮

## 设计哲学

**Constitution-Anchored**：红线层（CLAUDE.md 14 铁律 / CONSTITUTION / forbidden SSOT / handbook §32-§35）由 immutable-guard.sh 守住，AI 不可碰。本命令仅在**软配置层**（hooks 阈值 / skills 触发词 / learned rules / 新 hook / 新 skill / handbook 新章节）做进化。

**业界对照**：
- AlphaEvolve evaluator-grounded — 我们用 evals/golden-trajectories 当 fitness
- Cursor Bugbot 44k learned rules — 我们用 .claude/rules/learned/
- Sakana DGM lineage archive — 我们 REVIEW-QUEUE 全部保留
- Voyager 技能库 — 我们 SKILL-CANDIDATES.md（不自动入库）
- Reflexion + MAR 多 critic — pattern-detector 输出由 codex 二次审

## 子命令

### `detect` — 跑 pattern detector + 4 auditor + codex

并行调用：

1. **pattern-detector sub-agent**（必须）
   - 输入：trajectory log + REVIEW-QUEUE + CODEX-REVIEW-LOG + git log
   - 输出：`docs/ai-cto/SELF-AUDIT-<YYYY-MM-DD>.md`
2. **harness-auditor**（可选 — 月度跑一次即可）
   - 输出：harness health score + 八条原则 ✅/⚠️/❌
3. **vibe-checker**（可选）
   - 输出：commit / marker / experimental 红线扫描
4. **reliability-auditor**（可选）
   - 输出：SLO / cost cap / fallback 检查
5. **codex 跨模型审最近 7 天 commits**（默认开）
   - 调 `bash .agents/skills/codex-bridge/run.sh HEAD`（已有 PR autopilot）
   - 用 ChatGPT 订阅 auth，不烧 API token

**Cost cap 检查**：
- 月度 codex token 累计 > $20 → 退化为只跑 pattern-detector，不跑 codex
- 显示 `/cto-evolve status` 中

### `propose` — 把 pattern 转成具体 EVOLUTION-PROPOSAL

```
读 docs/ai-cto/SELF-AUDIT-<latest>.md
→ 对每个 pattern 生成 EVOLUTION-PROPOSAL：
  - 标题
  - 改动文件清单（含 immutable check）
  - 改动 diff 预览
  - 是否需要新 eval
  - codex review 摘要
  - ROI / 风险评分
→ 写 docs/ai-cto/EVOLUTION-PROPOSAL-<YYYY-MM-DD>-<slug>.md
→ 报告："已生成 N 个提议 — 用 /cto-evolve apply <pattern-id> 执行某条"
```

**红线检查**（在 propose 阶段先拒，比 immutable-guard 更早）：
- 提议改 CLAUDE.md 14 铁律段 → 拒，改成"加新 learned rule"
- 提议删 forbidden-paths.txt 条目 → 拒
- 提议改 CONSTITUTION → 拒，引导走 /cto-constitution review

### `apply <pattern-id>` — 实际开 PR

```
1. 读 EVOLUTION-PROPOSAL-<id>.md
2. 创建 feature branch: feat/v3.9-evolve-<slug>
3. 写改动（仅软配置层 — immutable-guard 会兜底拦）
4. 跑 evals 验证（先跑相关 eval；若新加 eval 则跑全集）
5. 调 codex-bridge run.sh 跨模型审
6. autopilot 自动开 PR（v3.7 已实现）
7. 写 docs/ai-cto/EVOLUTION-LOG.md：
   - <date> <pattern-id> applied → PR #N
   - 等待用户 merge
8. 报告："PR #N 已开 — codex review 在后台跑，结果见 PR comment"
```

### `status` — 飞轮健康仪表盘

输出：
```
v3.9 Evolution Flywheel Status
─────────────────────────────
最近自审: <YYYY-MM-DD>
最近 EVOLUTION-PROPOSAL: <YYYY-MM-DD>-<slug>
最近 apply 的 PR: #N (<date>, status: open/merged/closed)

历史进化（30 天）:
  ✅ N 个 pattern 被采纳
  ⏸ M 个冷却中（< 30 天）
  🔴 K 个连续 3 周未采纳 → 已升级 P0 人审

Cost 月度（<month>）:
  Codex review: $X.YZ / $20 cap (NN%)
  Cron runs: <N> times

Constitution 完整性:
  immutable-guard 阻止次数（30 天）: <N>
  - <date> 试改 CLAUDE.md 铁律段
  - <date> 试删 forbidden-paths.txt 条目
  ✅ 红线全部守住

下次自审: <YYYY-MM-DD>（GH Actions 周一 cron）
```

## 失败 Budget

| 状态 | 升级 |
|---|---|
| 1 周未采纳 | 维持原优先级 |
| 2 周未采纳 | 提升到 P1 + 在 SELF-AUDIT 加红色标记 |
| 3 周未采纳 | 自动升级 P0 + 写 GitHub Issue + 邮件通知 |
| 4 周未采纳 | 标记 superseded（标志该 pattern 不重要 / 用户已默认拒绝） |

## Cost Cap 实施

`docs/ai-cto/.evolve-cost-month.json`（每月 reset）：
```json
{
  "month": "2026-05",
  "codex_token_cents": 1234,
  "cap_cents": 2000,
  "reviews_count": 47,
  "exceeded": false
}
```

每次 codex 调用前 read，超 cap → 退化模式（只 pattern-detector，跳 codex）。

## 红线（必守）

- ❌ 不改 CLAUDE.md 14 铁律段（immutable-guard 拦）
- ❌ 不改 CONSTITUTION.md（immutable-guard 拦）
- ❌ 不删 forbidden-paths.txt 条目（immutable-guard 拦）
- ❌ 不改 handbook §32-§35（immutable-guard 拦）
- ❌ 不改既有 eval（仅加新）
- ❌ 不改 immutable-guard.sh 自己（必须人审）
- ✅ 加新 hook / skill / rule / handbook §50+ 章节 / eval 新条目
- ✅ 改 hooks BYPASS_PATTERNS / paths 阈值（软配置）
- ✅ 写 .claude/rules/learned/* （Bugbot 模式）

## 与 21 项目分发的关系

每个项目独立飞轮 — 各自的 EVOLUTION-LOG / SELF-AUDIT。但：
- 跨项目通用 pattern → ai-playbook 主仓收纳为 v3.X 升级
- 项目特定 pattern → 项目 .claude/rules/learned/ 留下

## 实战例子

假设 codex 连续 4 次审都指出"路径 X 应加 forbidden"（pattern 类型 B：反复同类 bug）：

```
$ /cto-evolve detect
→ pattern-detector 写 SELF-AUDIT-2026-05-15.md：
  Pattern 1: codex 4 次建议加 X 到 forbidden（置信度 95%）

$ /cto-evolve propose
→ EVOLUTION-PROPOSAL-2026-05-15-add-forbidden-X.md：
  改动：scripts/forbidden-paths.txt 加一行 X/
  红线检查：✅ 加（不删）→ immutable-guard 不拦

$ /cto-evolve apply 1
→ feat branch + 改 forbidden-paths.txt + push + PR + codex 二审
→ PR #N 已开

→ 用户 merge
→ EVOLUTION-LOG 记录
```

## 引用

- handbook §50（自我进化飞轮，v3.9 新增）
- AlphaEvolve: https://arxiv.org/abs/2506.13131
- Cursor Bugbot: https://cursor.com/blog/bugbot-learning
- Sakana DGM: https://arxiv.org/abs/2505.22954
- Anthropic CAI: https://arxiv.org/abs/2212.08073
- OWASP Agentic Top 10: https://genai.owasp.org/resource/owasp-top-10-for-agentic-applications-for-2026/
