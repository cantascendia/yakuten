# Learned Rule: pattern-detector 必须按时间范围过滤数据源，不能读旧 schema

**学到的教训**: pattern-detector 首次跑（2026-05-11）报"全部 trajectory jsonl 字段全空"为 P1 — 但实际是读了 v3.7 时代旧文件（2026-04-29 / 04-30 / 05-06 / 05-09），v3.8 部署后新文件（2026-05-10 / 05-11）147/147 全部 v3.8 schema 真工作。这是 **false positive** — Reflexion 单 critic 幻觉的经典案例。

## 触发场景

- pattern-detector sub-agent 跑时
- 任何用 `Glob .claude/agent-logs/*.jsonl` 然后做整体分析的场景
- 评估"v3.X 修复后是否生效"时

## 应该怎么做

1. **明确数据起点**：在分析前先 `git log --oneline --until=2026-05-11 --since=2026-05-09 .claude/hooks/lib/common.sh` 找出 v3.8 schema 部署的精确时间点
2. **按时间范围过滤**：仅看 v3.X 部署日期 **之后** 的 jsonl 文件
3. **schema 占比 = 信号**：算 `grep -c '"schema":"v3.8"' file` / `wc -l file` 比例；只有 < 50% 才报 issue
4. **跨文件聚合时显式标注 cutoff**：报告里写 "scope: files modified after YYYY-MM-DD"
5. **置信度自降**：单文件 100% 旧 schema 不等于 "修复没生效"，可能是部署前的历史数据

## 避免什么

- ❌ 读所有 `.claude/agent-logs/*.jsonl` 不分时间，全文件整体判断
- ❌ "0/93 是 v3.8 schema"就报 P0 — 必须先看文件 mtime / 创建时间是否在修复前
- ❌ 跨 schema 版本切换的过渡期数据当稳态数据分析
- ❌ 单 critic 直接断言 P0 — 必须 codex 二次审才能升级到真 P0

## 来源

- SELF-AUDIT 2026-05-10：Pattern 2 (P1, 置信度 88%, C 类) — "trajectory logger jsonl 字段全空"
- 人审实测：2026-05-11 jsonl 147/147 全 v3.8 schema → false positive
- EVOLUTION-LOG.md 2026-05-11 飞轮首跑记录

## 冷却

- 创建日期: 2026-05-11
- 30 天内不重复提议同类时间过滤 pattern
- 月度 retrospective 检查 pattern-detector 跑出的 P0/P1 中 false positive 比例
- 目标：FP rate < 30%（参考 SLO.md）

## 适用范围

- pattern-detector sub-agent（必读）
- harness-auditor / reliability-auditor 同类时间序列分析时（参考）
- 任何 trajectory log / audit log 分析任务
