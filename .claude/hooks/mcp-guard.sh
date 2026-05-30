#!/usr/bin/env bash
# v3.11 红线层：MCP 工具 destructive 防护（飞轮第 8 轮 architect-critic + sota OWASP ASI 发现）
#
# 问题：destructive-action-guard / bypass-guard 只 match Bash，看不到 mcp__ 工具。
# 但删库最可能的通道恰是 MCP：
#   mcp__*__execute_sql (DROP/DELETE) / delete_branch / delete_project /
#   deploy_to_vercel / r2_bucket_delete / kv_namespace_delete / move_file / 等
# 威胁模型（防 PocketOS 类删库）若不覆盖 MCP = 形同虚设。
# OWASP Agentic Top 10 (2026) ASI04(供应链) + ASI06(memory) + Least-Agency 原则。
#
# 接线：settings.json PreToolUse matcher "mcp__.*"（match 所有 MCP 工具）
#
# v3.13 A4（PoC 否决）：**不**在此扫"MCP 工具 description 投毒"。PreToolUse stdin 只含
# tool_input（调用参数），不含工具注册时的 description 元数据 → hook 层扫描是 no-op = 虚假安全。
# description 投毒须在 注册/manifest 层（签名校验）或外部 mcp-scan 防御。
# 详见 .claude/rules/learned/2026-05-30-mcp-description-poison-not-in-hook-stdin.md
set -uo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/common.sh"

read_hook_input
maybe_run_override "mcp-guard"

# 仅对 mcp__ 工具生效
case "$HOOK_TOOL_NAME" in
  mcp__*) ;;
  *) exit 0 ;;
esac

# 1. destructive MCP 工具名模式（按操作语义，跨 server）
# 注意：execute_sql / query 等通用工具不在此列 — 它们靠 SQL 内容（步骤 2）判断，
# 否则 SELECT 也会被误拦（飞轮第 8 轮验证发现）。
DESTRUCTIVE_MCP_TOOL='_(delete|drop|destroy|purge|wipe)($|_)|_delete_|delete_(branch|project|database|namespace|bucket|file|table|deployment|secret)|apply_migration|reset_branch'

# 2. execute_sql 类工具：检查 query 参数是否含 destructive SQL
HOOK_MCP_QUERY=$(_json_get "$HOOK_JSON" "tool_input.query")
HOOK_MCP_SQL=$(_json_get "$HOOK_JSON" "tool_input.sql")
SQL_TEXT="${HOOK_MCP_QUERY}${HOOK_MCP_SQL}"
# v3.13 O7：SQL 核心从 common.sh 单源 + 本 guard 的 UPDATE-no-WHERE 扩展（execute_sql 参数场景）
DESTRUCTIVE_SQL="$(destructive_sql_core)|\bUPDATE\s+[a-z_]+\s+SET\b.*(;|$)"

BLOCKED=0
REASON=""

# 工具名命中 destructive 语义
if echo "$HOOK_TOOL_NAME" | grep -qiE -- "$DESTRUCTIVE_MCP_TOOL"; then
  BLOCKED=1
  REASON="MCP 工具名命中 destructive 语义: $HOOK_TOOL_NAME"
fi

# SQL 参数含 destructive 操作（无 WHERE 的 DELETE / DROP / TRUNCATE）
if [ -n "$SQL_TEXT" ] && echo "$SQL_TEXT" | grep -qiE -- "$DESTRUCTIVE_SQL"; then
  # DELETE/UPDATE 含 WHERE 放行（精确操作）
  if echo "$SQL_TEXT" | grep -qiE 'DELETE\s+FROM.*\bWHERE\b|UPDATE\s+.*\bWHERE\b' \
     && ! echo "$SQL_TEXT" | grep -qiE '\bDROP\b|\bTRUNCATE\b'; then
    : # 含 WHERE 的 DELETE/UPDATE 且无 DROP/TRUNCATE → 放行
  else
    BLOCKED=1
    REASON="MCP SQL 含 destructive 操作: $(echo "$SQL_TEXT" | head -c 150)"
  fi
fi

# 3. v3.11.1（飞轮第 8 轮）：MCP filesystem 写类工具绕过 file-path 红线体系
# mcp__filesystem__write_file/edit_file/move_file/create_file 可改 CLAUDE.md /
# CONSTITUTION / forbidden-paths.txt / 锁定测试，完全不触发 immutable/forbidden/test-lock guard
# （那些只 match Edit|Write|MultiEdit 内置工具）。这里对 MCP 写类重跑红线判断。
if echo "$HOOK_TOOL_NAME" | grep -qiE '__(write_file|edit_file|move_file|create_file|create_directory)$' \
   && [ -n "$HOOK_FILE_PATH" ]; then
  normalize_paths
  # 红线 A: immutable（CLAUDE.md 铁律段在 ai-playbook 自身 / CONSTITUTION / forbidden SSOT）
  if echo "$HOOK_REL $HOOK_NORM_FILE" | grep -qE "docs/ai-cto/CONSTITUTION\.md|scripts/forbidden-paths\.txt"; then
    BLOCKED=1; REASON="MCP filesystem 写 immutable 文件: $HOOK_REL（绕过 immutable-guard）"
  fi
  # 红线 B: forbidden 路径（复用 SSOT；缺失时 hardcoded fallback 同 forbidden-guard）
  if [ "$BLOCKED" = "0" ]; then
    SSOT="${HOOK_NORM_CWD}/scripts/forbidden-paths.txt"
    if [ -f "$SSOT" ]; then
      FP=$(grep -vE '^\s*(#|$)' "$SSOT" | tr '\n' '|' | sed 's/|$//')
    else
      FP="$(forbidden_fallback_pattern)"  # v3.13 O7：单源
    fi
    if [ -n "$FP" ] && echo "$HOOK_REL" | grep -qE -- "($FP)"; then
      [ "${CTO_DOUBLE_SIGNED:-0}" != "1" ] && { BLOCKED=1; REASON="MCP filesystem 写 forbidden 路径: $HOOK_REL（绕过 forbidden-guard）"; }
    fi
  fi
  # 红线 C: 测试文件
  if [ "$BLOCKED" = "0" ] && [ "${CTO_TEST_LOCK_ACK:-0}" != "1" ]; then
    if echo "$HOOK_REL" | grep -qE -- '/tests?/|/__tests__/|\.test\.[jt]sx?$|\.spec\.[jt]sx?$|_test\.py$|test_[^/]+\.py$|_test\.go$'; then
      BLOCKED=1; REASON="MCP filesystem 写测试文件: $HOOK_REL（绕过 test-lock-guard，§20.3）"
    fi
  fi
fi

if [ "$BLOCKED" = "1" ]; then
  if [ "${CTO_MCP_DESTRUCTIVE_CONFIRMED:-0}" = "1" ]; then
    audit_log "mcp-destructive-allowed" "tool=$HOOK_TOOL_NAME env=1"
    exit 0
  fi
  audit_log "mcp-destructive-blocked" "tool=$HOOK_TOOL_NAME reason=$REASON"
  block_with_reason "🛑 v3.11 MCP DESTRUCTIVE BLOCKED

$REASON

参考：
- OWASP Agentic Top 10 (2026) ASI04 供应链 + Least-Agency 原则
- 威胁模型：防 agent 经 MCP 通道删生产库/项目（destructive-action-guard 只管 Bash 不够）

正确做法：
  1. 数据操作必须含 WHERE / LIMIT（SQL）
  2. 删库/删项目/删分支 → 人审 + 走 spec-driven
  3. 先用只读 MCP 工具（list/get/query）确认影响范围

紧急确认（仅 in-test-env 且已备份）：
  export CTO_MCP_DESTRUCTIVE_CONFIRMED=1   # 单次会话 + audit 永久记录"
fi

exit 0
