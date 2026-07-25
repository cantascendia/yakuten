#!/usr/bin/env bash
# v4.0: Node guard engine 优先；node 缺失或 CTO_GUARD_ENGINE=legacy → 下方 legacy 实现
# （v3.15 冻结，零红线真空 — v3.14 verdict Phase-1 硬条件）。引擎：engine/guard.mjs
GUARD_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ "${CTO_GUARD_ENGINE:-engine}" != "legacy" ] && command -v node >/dev/null 2>&1 && [ -f "$GUARD_DIR/engine/guard.mjs" ]; then
  exec node "$GUARD_DIR/engine/guard.mjs" destructive-action-guard
fi
# ══ legacy fallback（v3.15 原实现，冻结不再演进）══
# v3.10.1 红线层：destructive action gate
# OWASP Agentic Top 10 2026 — ASI01 (Agent Goal Hijacking) 头号风险
# 教训：PocketOS 2026-04-25 — Cursor+Claude Opus 4.6 agent 9 秒删生产库 + 全部备份
#       (https://www.theregister.com/2026/04/27/cursoropus_agent_snuffs_out_pocketos/)
# 根因：overprivileged token + 共享 backup volume + 缺 destructive-action gate
#
# 拦截：任何不可逆 destructive 命令（删库 / drop / rm -rf 重要目录 / 撤销服务 etc）
set -uo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/common.sh"

read_hook_input
maybe_run_override "destructive-action-guard"

# 仅对 Bash 工具生效
[ "$HOOK_TOOL_NAME" != "Bash" ] && exit 0
[ -z "$HOOK_BASH_CMD" ] && exit 0

# v3.11 fix（飞轮第 8 轮 — architect-critic 发现 v3.10.2 引入安全回归）：
# v3.10.2 整段剥离引号内容 → psql -c "DROP DATABASE" / rm -rf "$HOME" 逃逸（false NEGATIVE，安全回归）
# 修：只剥 heredoc body（写文档主场景）；引号内容**保留检测**（命令参数会执行）。
# 纯输出场景（echo/printf 开头 + 无 shell 操作符）才整体放行 — 兼顾 false positive 与安全。
SCAN_CMD=$(printf '%s' "$HOOK_BASH_CMD" | sed -E "s/<<-?'?[A-Za-z_]+'?.*//")

# 纯 echo/printf 输出（无 && || ; | $() 操作符）→ 内容是给人看的文本，非执行 → 放行
if echo "$SCAN_CMD" | grep -qE '^[[:space:]]*(echo|printf)[[:space:]]' \
   && ! echo "$SCAN_CMD" | grep -qE '&&|\|\||;|\$\(|\|[[:space:]]'; then
  exit 0
fi

# Destructive 模式列表（保守 — 宁误拦也不漏）
# 分 3 类：
#   A. 文件系统级灾难：rm -rf / / rm -rf ~ / find -delete
#   B. 数据库级灾难：DROP TABLE / DROP DATABASE / TRUNCATE / DELETE FROM (无 WHERE)
#   C. 云服务/平台级：terraform destroy / vercel rm / railway destroy / supabase project delete / aws s3 rb / gh repo delete

# A. 文件系统（v3.11: 路径前加 ["']? 容忍引号包裹，因 v3.11 不再剥引号）
FS_PATTERNS='rm\s+-rf\s+["'"'"']?/($|\s|["'"'"'])|rm\s+-rf\s+["'"'"']?~($|\s|["'"'"'])|rm\s+-rf\s+["'"'"']?[$]HOME|rm\s+-rf\s+["'"'"']?\.\s|rm\s+-rf\s+["'"'"']?\*($|\s)|find\s+/?\s.*-delete|>\s*/dev/sda|mkfs|dd\s+if=.*of=/dev/'

# B. 数据库（v3.13 O7：SQL 核心从 common.sh 单源 + 本 guard 的 shell 外壳扩展）
DB_PATTERNS="$(destructive_sql_core)|psql.*-c.*DROP|mongo.*dropDatabase|redis-cli.*FLUSHALL"

# C. 云服务 destructive（v3.11: 关键资源前加 ["']? 容忍引号）
CLOUD_PATTERNS='terraform\s+destroy|vercel\s+rm\s.*--yes|railway\s+(down|destroy)|supabase\s+project\s+delete|aws\s+s3\s+rb\s+["'"'"']?s3://.*--force|aws\s+rds\s+delete-db-instance|aws\s+ec2\s+terminate-instances.*--force|gh\s+repo\s+delete|gh\s+secret\s+remove|firebase\s+(use\s+.*&&.*deploy|projects:delete)|heroku\s+apps:destroy|fly\s+apps\s+destroy|kubectl\s+delete\s+(ns|namespace|cluster|all)|docker\s+system\s+prune\s+--all\s+--volumes'

# 复合 destructive（不可逆 + 大规模）
COMBINED_DESTRUCTIVE="${FS_PATTERNS}|${DB_PATTERNS}|${CLOUD_PATTERNS}"

if echo "$SCAN_CMD" | grep -qiE -- "$COMBINED_DESTRUCTIVE"; then
  # Opt-out: 极端情况（如真要清理测试环境）需 explicit 解锁
  if [ "${CTO_DESTRUCTIVE_CONFIRMED:-0}" = "1" ]; then
    audit_log "destructive-action-allowed" "cmd=$(echo "$HOOK_BASH_CMD" | head -c 200) env=1"
    exit 0
  fi

  audit_log "destructive-action-blocked" "cmd=$(echo "$HOOK_BASH_CMD" | head -c 200)"

  deny_with_reason "🛑 v3.10.1 DESTRUCTIVE ACTION BLOCKED

命令：\`$(echo "$HOOK_BASH_CMD" | head -c 300)\`

命中不可逆 destructive 模式（rm -rf / DROP TABLE / terraform destroy / etc）。

参考：
- OWASP Agentic Top 10 (2026) ASI01: Agent Goal Hijacking — 头号风险
- PocketOS 9 秒灾难（2026-04-25）: Cursor+Claude 删生产库 + 备份
  https://www.theregister.com/2026/04/27/cursoropus_agent_snuffs_out_pocketos/

正确做法：
  1. 先用 \`echo\` 或 \`--dry-run\` 模拟一遍看影响范围
  2. 如生产环境 → 让人审 + 走 spec-driven
  3. 如测试 / 临时环境 → 用更精确的命令（避免 -rf / / -rf \$HOME 等灾难性广度）
  4. 数据库操作必须含 WHERE / LIMIT

紧急确认（仅 in-test-env 且已备份）：
  export CTO_DESTRUCTIVE_CONFIRMED=1   # 单次会话 + audit 永久记录
  # 然后重跑该命令"
fi

exit 0
