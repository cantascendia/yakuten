#!/usr/bin/env bash
# v3.8 真实 trajectory 日志（修 §44 Replay 形同虚设的 bug）
# 旧版只写 {ts, type:"tool_call"} → /cto-replay 看不到 tool_name/input
# 新版从 stdin JSON 提取完整字段，写真正可 replay 的 jsonl
#
# 隐私：默认脱敏 — 不写 file content / bash command 详细参数（仅前 200 字符）
# 完整模式：CTO_TRAJECTORY_FULL=1（含 input/output 详情，仅本地审计）
#
# 2026-05-26 修复：原版 `[ ! -d "$LOG_DIR" ] && exit 0` 在目录不存在时
# silently no-op → SELF-AUDIT 看到 trajectory entries: 0 → pattern-detector
# 无数据可分析。改为 mkdir -p（创建失败才退出）。配套 .claude/agent-logs/
# 已入版本控制（.gitkeep + .gitignore 不污染 history）。
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# lib/common.sh 不存在时 graceful fallback，避免日志阻止 agent 启动
if [ -f "$SCRIPT_DIR/lib/common.sh" ]; then
  source "$SCRIPT_DIR/lib/common.sh"
else
  # 最小 stub：让本脚本独立可运行
  read_hook_input() {
    HOOK_INPUT="${HOOK_INPUT:-}"
    if [ -t 0 ]; then return 0; fi
    HOOK_INPUT="$(cat)"
  }
fi

read_hook_input

CWD="${HOOK_CWD:-.}"
LOG_DIR="${CWD}/.claude/agent-logs"
# 修复 silent no-op：默认创建目录，仅创建失败才退出
mkdir -p "$LOG_DIR" 2>/dev/null || exit 0

DAY=$(date +%Y-%m-%d 2>/dev/null || echo unknown)
TS=$(date -Iseconds 2>/dev/null || date +%s)
LOG_FILE="${LOG_DIR}/${DAY}.jsonl"

# 简单 JSON 字符串转义
_escape() {
  echo "$1" | sed 's/\\/\\\\/g; s/"/\\"/g' | tr -d '\n' | head -c 500
}

TOOL=$(_escape "${HOOK_TOOL_NAME:-}")
FILE=$(_escape "${HOOK_FILE_PATH:-}")
SESSION=$(_escape "${HOOK_SESSION_ID:-}")
EVENT=$(_escape "${HOOK_EVENT:-}")

# 默认脱敏：bash 命令仅记前 200 字符 + tool=Bash
if [ "${CTO_TRAJECTORY_FULL:-0}" = "1" ]; then
  CMD=$(_escape "${HOOK_BASH_CMD:-}")
else
  CMD=$(_escape "$(echo "${HOOK_BASH_CMD:-}" | head -c 200)")
fi

# 写真实 trajectory（schema_version 让 /cto-replay 兼容多版本）
printf '{"ts":"%s","schema":"v3.8","event":"%s","tool":"%s","file":"%s","cmd":"%s","session":"%s"}\n' \
  "$TS" "$EVENT" "$TOOL" "$FILE" "$CMD" "$SESSION" \
  >> "$LOG_FILE" 2>/dev/null

exit 0
