# Learned Rule: business-paths.txt 必须覆盖所有业务代码根目录，不可遗漏 api/

**学到的教训**: scripts/business-paths.txt 仅含 `src/ app/ lib/ apps/ packages/` 默认 generic 项目假设时，部署在仓库根目录的 Edge API endpoint（`api/ai-chat.ts`）被 codex-bridge run.sh 第 73-79 行 silent skip → REVIEW-QUEUE.md 对 AI endpoint 改动一直空 → 在事故发生前飞轮看不到攻击面。

## 触发场景

何时这条 rule 应被加载到上下文：
- 文件路径模式：`scripts/business-paths.txt`、`scripts/forbidden-paths.txt`、`.agents/skills/codex-bridge/**`
- 关键词：codex-bridge、cross-review、business-paths、forbidden-paths、SSOT、Edge function、API endpoint
- 任务类型：cross-review 飞轮设置 / 新项目接管 / Edge API 添加 / forbidden 路径调整

## 应该怎么做

具体可执行步骤：

1. **接管新项目第一日**，扫 `scripts/business-paths.txt`，对比项目实际业务代码根目录（grep + Glob）：
   ```bash
   # 找业务代码实际位置
   ls -d */ | head -20
   # 对比 business-paths.txt 是否覆盖
   cat scripts/business-paths.txt | grep -v '^#' | grep -v '^$'
   ```
2. **如有 Edge function 或 serverless API**（Vercel `api/`、Cloudflare Workers `functions/`、Netlify `netlify/functions/` 等），**立即加入 business-paths**。
3. **同时考虑加入 forbidden-paths**：Edge API endpoint 通常是攻击面（含 API key 加载、用户输入处理、Edge 限流），应受 §32 spec-driven + 双签保护。
4. **验证**：跑 `bash .agents/skills/codex-bridge/run.sh HEAD`，看输出是否含 api/ 业务路径。

## 避免什么

反模式 / 已知错误：

- ❌ **盲信 ai-playbook 中央默认值**：business-paths.txt 默认 generic 模板（src/app/lib/apps/packages）不适合所有项目结构（如 aegis-panel 用 dashboard/src/、yakuten 用根 api/）
- ❌ **silent skip 是真红线**：codex-bridge 在 business-paths 不匹配时写 `mode=skipped-non-business` 但 Stop hook 主进程 exit 0 — 看似成功但飞轮失明
- ❌ **只加 business-paths 不加 forbidden-paths**：业务关键代码不在 spec-driven 保护下，未来 AI vibe coding 改 api/ 不会触发硬阻止
- ❌ **改 business-paths 不重审历史 commit**：加上 api/ 后，应该跑 `/cto-cross-review` 对最近触及 api/ 的 commit 做基线审

## 来源

- SELF-AUDIT: docs/ai-cto/STATUS.md Phase 12 阶段 0 接管首日发现
- Cross-review baseline: docs/ai-cto/REVIEW-QUEUE.md sha=e6d76e1 reviewer=codex-gpt5.5 bytes=140278
- Commits:
  - `b759974` chore(enforcement): track scripts SSOT + cover api/ in business + forbidden paths
  - `47f4df6` chore(enforcement): track v3.8 hooks + v3.9 immutable-guard + skills + learned-rules infra
- 三个并行 Explore agent 审计：Agent A 技术架构尽调报告 P0 finding

## 冷却

- 创建日期: 2026-05-19
- 30 天内不重复提议同 pattern
- 月度 retrospective 检查 freshness（看本 rule 是否被 learned-rules-loader skill 触发过）
