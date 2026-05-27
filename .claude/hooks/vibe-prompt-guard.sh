#!/usr/bin/env bash
# §33 Vibe 关键词检测 — UserPromptSubmit
# 用户输入含 yolo/accept all/--no-verify 等 → 注入 additionalContext 提醒走 spec
set -uo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/common.sh"

read_hook_input

[ -z "$HOOK_PROMPT" ] && exit 0

VIBE_PATTERNS='\byolo\b|\baccept all\b|\bvibe ship\b|--no-verify|\bskip tests\b|\bjust do it\b|\bno spec\b|\b强行\b'

if echo "$HOOK_PROMPT" | grep -iqE -- "$VIBE_PATTERNS"; then
  audit_log "vibe-keyword" "$(echo "$HOOK_PROMPT" | head -c 100)"

  REMINDER="⚠️ §33 红线提醒：检测到 vibe 关键词

Forbidden 路径（auth/支付/secrets/migration/crypto/infra）禁止 vibe coding（铁律 #13）。
建议：
  - 确实需要 vibe？仅在 sandbox / experimental 目录可
  - 触及业务代码？请用 /cto-spec specify 启动 spec-driven 流程
  - 触及 forbidden 路径？.claude/hooks/forbidden-guard.sh 会硬阻止 Edit

参考：handbook §33 / 铁律 #13"

  if [ "$HAS_JQ" = "1" ]; then
    printf '%s' "$REMINDER" | jq -Rs --arg ev "UserPromptSubmit" \
      '{hookSpecificOutput: {hookEventName: $ev, additionalContext: .}}'
  else
    echo "$REMINDER" >&2
  fi
fi

exit 0
