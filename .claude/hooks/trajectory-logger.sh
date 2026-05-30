#!/usr/bin/env bash
# v3.8 真实 trajectory 日志（修 §44 Replay 形同虚设的 bug）
# 旧版只写 {ts, type:"tool_call"} → /cto-replay 看不到 tool_name/input
# 新版从 stdin JSON 提取完整字段，写真正可 replay 的 jsonl
#
# 隐私：默认脱敏 — 不写 file content / bash command 详细参数（仅前 200 字符）
# 完整模式：CTO_TRAJECTORY_FULL=1（含 input/output 详情，仅本地审计）
set -uo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/common.sh"

read_hook_input

CWD="${HOOK_CWD:-.}"
LOG_DIR="${CWD}/.claude/agent-logs"
[ ! -d "$LOG_DIR" ] && exit 0  # 目录不存在则跳过

DAY=$(date +%Y-%m-%d 2>/dev/null || echo unknown)
TS=$(date -Iseconds 2>/dev/null || date +%s)
LOG_FILE="${LOG_DIR}/${DAY}.jsonl"

# v3.13 O10（SOTA team 审计）：secret 脱敏 — 写日志前 redact 常见密钥/令牌。
# GitHub 2026 扫描发现 24008 个 MCP 配置相关 secret 泄露；eval verification_command 可能把
# env secret 带进 bash 命令 → 不脱敏会写进 jsonl。在 _escape 前先 redact 原始值。
_redact() {
  echo "$1" | sed -E \
    -e 's/sk-[A-Za-z0-9_-]{16,}/[REDACTED_SK]/g' \
    -e 's/(ghp|gho|ghs|ghr|github_pat)_[A-Za-z0-9_]{20,}/[REDACTED_GH]/g' \
    -e 's/AKIA[A-Z0-9]{16}/[REDACTED_AWS]/g' \
    -e 's/xox[baprs]-[A-Za-z0-9-]{10,}/[REDACTED_SLACK]/g' \
    -e 's/[Bb]earer[[:space:]]+[A-Za-z0-9._+\/=-]{20,}/Bearer [REDACTED]/g' \
    -e 's/(([Aa][Pp][Ii][_-]?[Kk][Ee][Yy]|[Tt][Oo][Kk][Ee][Nn]|[Ss][Ee][Cc][Rr][Ee][Tt]|[Pp][Aa][Ss][Ss][Ww][Oo][Rr][Dd])["'"'"' ]*[:=]["'"'"' ]*)[A-Za-z0-9._+\/=-]{12,}/\1[REDACTED]/g'
}

# 简单 JSON 字符串转义（先 redact 再 escape）
_escape() {
  _redact "$1" | sed 's/\\/\\\\/g; s/"/\\"/g' | tr -d '\n' | head -c 500
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
