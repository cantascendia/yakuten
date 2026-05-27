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
    # 简化 regex：匹配 "key":"value" 不处理转义引号（足够 99% 场景）
    echo "$json" | tr -d '\n' | \
      sed -nE "s/.*\"${key}\"[[:space:]]*:[[:space:]]*\"([^\"]*)\".*/\\1/p" | \
      head -1
  fi
}

# 读 stdin JSON 提取常用字段
read_hook_input() {
  HOOK_JSON=$(cat 2>/dev/null || echo '{}')
  HOOK_TOOL_NAME=$(_json_get "$HOOK_JSON" "tool_name")
  HOOK_FILE_PATH=$(_json_get "$HOOK_JSON" "tool_input.file_path")
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
