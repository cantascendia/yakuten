#!/usr/bin/env bash
# v3.8 hook 公用库 — stdin JSON 解析、降级、enforcement helpers
#
# 关键：Claude Code hook input 是 stdin JSON（不是 env var）
# Windows git-bash 默认无 jq → 用 sed/grep fallback 解析
# 文档：https://code.claude.com/docs/en/hooks
set -uo pipefail

# 检测 jq；不存在用 fallback parser
HAS_JQ=0
command -v jq >/dev/null 2>&1 && HAS_JQ=1

# 用 jq 或 sed/grep 提取 JSON 字段（顶层 OR 嵌套）
# 用法: _json_get "$JSON" "tool_name"  (顶层)
#       _json_get "$JSON" "tool_input.file_path"  (嵌套)
_json_get() {
  local json="$1"
  local path="$2"
  if [ "$HAS_JQ" = "1" ]; then
    echo "$json" | jq -r ".${path} // empty" 2>/dev/null
  else
    # sed fallback：处理 "key": "value" 模式
    # 支持 1 层嵌套：tool_input.file_path → 找 "file_path"
    local key="${path##*.}"  # 取最后一段
    # v3.11 fix（飞轮第 8 轮 architect-critic 链）：处理 JSON 转义引号 \"
    # 旧 regex [^"]* 遇到命令含 \" (如 psql -c "DROP DATABASE") 提前截断 →
    # destructive/forbidden guard 在无 jq(Windows) 环境漏过引号内容。安全 bug。
    # 新 regex (\\.|[^"\\])* 正确吞掉 \" \\ 等转义序列，再还原。
    # v3.12 fix（真 eval executor 抓到 v3.11 regression）：
    # 只还原 \" 和 \\，**保留字面量 \n \t**。之前 s/\\n/ /g 把 \n 转空格，破坏了
    # immutable-guard 对 forbidden-paths.txt 多行 old/new 的比对（红线 3 自己 printf %b
    # 还原 \n→换行；若这里先转空格，还原失效 → 删条目检测失灵，安全 regression）。
    # 命令场景不受影响：destructive-guard 先 tr -d 换行 + heredoc 剥离，字面量 \n 不影响 grep。
    echo "$json" | tr -d '\n' | \
      sed -nE "s/.*\"${key}\"[[:space:]]*:[[:space:]]*\"((\\\\.|[^\"\\\\])*)\".*/\\1/p" | \
      head -1 | \
      sed -E 's/\\"/"/g; s/\\\\/\\/g'
  fi
}

# 读 stdin JSON 提取常用字段
read_hook_input() {
  HOOK_JSON=$(cat 2>/dev/null || echo '{}')
  HOOK_TOOL_NAME=$(_json_get "$HOOK_JSON" "tool_name")
  HOOK_FILE_PATH=$(_json_get "$HOOK_JSON" "tool_input.file_path")
  # v3.11.1（飞轮第 8 轮 architect-critic 发现）：MCP filesystem 工具用 tool_input.path
  # 不是 file_path。不取它 → mcp__filesystem__write_file 改 CLAUDE.md 绕过所有红线。
  # 若 file_path 为空则回退取 path（MCP filesystem）/ source（move 的源）。
  if [ -z "$HOOK_FILE_PATH" ]; then
    HOOK_FILE_PATH=$(_json_get "$HOOK_JSON" "tool_input.path")
  fi
  HOOK_MCP_DEST=$(_json_get "$HOOK_JSON" "tool_input.destination")
  HOOK_BASH_CMD=$(_json_get "$HOOK_JSON" "tool_input.command")
  HOOK_OLD_STRING=$(_json_get "$HOOK_JSON" "tool_input.old_string")
  HOOK_NEW_STRING=$(_json_get "$HOOK_JSON" "tool_input.new_string")
  HOOK_CONTENT=$(_json_get "$HOOK_JSON" "tool_input.content")
  HOOK_PROMPT=$(_json_get "$HOOK_JSON" "prompt")
  HOOK_CWD=$(_json_get "$HOOK_JSON" "cwd")
  HOOK_SESSION_ID=$(_json_get "$HOOK_JSON" "session_id")
  HOOK_EVENT=$(_json_get "$HOOK_JSON" "hook_event_name")
  export HOOK_JSON HOOK_TOOL_NAME HOOK_FILE_PATH HOOK_BASH_CMD \
         HOOK_OLD_STRING HOOK_NEW_STRING HOOK_CONTENT HOOK_PROMPT \
         HOOK_CWD HOOK_SESSION_ID HOOK_EVENT HAS_JQ
}

# v3.11（飞轮第 7 轮 team 迭代）：统一路径 normalize helper
# 解决 Windows 反斜杠路径剥离静默失效（learned rule 2026-05-12 警告的同源 bug）
# v3.9.1/.2 修了 forbidden/immutable，但 test-lock/eval-gate 漏 sweep — 本 helper 统一
#
# 用法：read_hook_input 后调 normalize_paths，得到：
#   HOOK_NORM_FILE — 反斜杠转正斜杠的绝对路径
#   HOOK_NORM_CWD  — 同上 cwd
#   HOOK_REL       — 相对路径（剥离 cwd 前缀；剥离失败用 basename）
#   HOOK_BASENAME  — 文件名
normalize_paths() {
  HOOK_NORM_FILE="${HOOK_FILE_PATH//\\//}"
  local cwd="${HOOK_CWD:-.}"
  HOOK_NORM_CWD="${cwd//\\//}"
  HOOK_REL="${HOOK_NORM_FILE#${HOOK_NORM_CWD}/}"
  # 剥离失败（不在 cwd 内 / 绝对路径残留）→ basename 兜底
  case "$HOOK_REL" in
    /*|[A-Za-z]:/*) HOOK_REL=$(basename "$HOOK_NORM_FILE") ;;
  esac
  HOOK_BASENAME=$(basename "$HOOK_NORM_FILE")
  export HOOK_NORM_FILE HOOK_NORM_CWD HOOK_REL HOOK_BASENAME
}

# 硬阻止：exit 2 + stderr（Claude 会读 stderr 当作错误反馈）
block_with_reason() {
  local reason="$1"
  echo "$reason" >&2
  exit 2
}

# 软提醒：用 additionalContext JSON 输出（Claude 看到但不阻止）
# 需要 jq；缺失则降级为 stdout warning
soft_remind() {
  local context="$1"
  local event="${HOOK_EVENT:-PostToolUse}"
  if [ "$HAS_JQ" = "1" ]; then
    jq -n --arg ctx "$context" --arg ev "$event" \
      '{hookSpecificOutput: {hookEventName: $ev, additionalContext: $ctx}}'
  else
    # 降级：echo 到 stdout（Claude 可能看到，但非结构化）
    echo "[$event additionalContext]"
    echo "$context"
  fi
  exit 0
}

# 检测项目级 override hook
maybe_run_override() {
  local hook_name="$1"
  local cwd="${HOOK_CWD:-.}"
  local override="${cwd}/.claude/hooks-overrides/${hook_name}.sh"
  if [ -f "$override" ]; then
    # 把 stdin JSON 透传给 override
    echo "$HOOK_JSON" | exec bash "$override"
  fi
}

# Audit log
audit_log() {
  local event="$1"
  local details="${2:-}"
  local cwd="${HOOK_CWD:-.}"
  if [ -d "${cwd}/.claude/agent-logs" ]; then
    local day=$(date +%Y-%m-%d 2>/dev/null || echo unknown)
    local ts=$(date -Iseconds 2>/dev/null || date)
    # 简单 JSON 转义：去掉双引号
    local safe_details="${details//\"/\\\"}"
    printf '{"ts":"%s","hook":"%s","event":"%s","details":"%s","session":"%s"}\n' \
      "$ts" "${0##*/}" "$event" "$safe_details" "${HOOK_SESSION_ID:-}" \
      >> "${cwd}/.claude/agent-logs/${day}.jsonl" 2>/dev/null
  fi
}

# 兼容旧 API（保留以免破现有 hook）
require_jq() {
  return 0  # v3.8 不再依赖 jq，总是 OK（用 fallback parser）
}

# ─── v3.13 O7：单源正则（防多 guard 各写一份漂移 — learned rule 2026-05-12）───

# forbidden 路径 fallback pattern（SSOT 缺失时用）。canonical 唯一源。
# 此前 forbidden-guard / mcp-guard / codex-bridge 三处各写，codex-bridge 那份还缺
# billing/keys/terraform/.github/workflows → 漂移。统一到这里。
forbidden_fallback_pattern() {
  echo 'auth/|payment/|billing/|secrets/|keys/|migration|crypto/|infra/|terraform/|\.github/workflows/'
}

# destructive SQL 共享核心（DROP/TRUNCATE/无 WHERE 的 DELETE）。
# 各 guard 在此核心上 compose 自己的上下文扩展：
#   - destructive-action-guard（扫 Bash 命令）：core + 外壳包装（psql/mongo/redis）
#   - mcp-guard（扫 execute_sql query 参数）：core + UPDATE-no-WHERE
# 单源核心防两边 DROP/TRUNCATE 定义漂移。
destructive_sql_core() {
  echo '\bDROP\s+(TABLE|DATABASE|SCHEMA|INDEX)\b|\bTRUNCATE\b|DELETE\s+FROM\s+[a-z_]+\s*(;|$)'
}
