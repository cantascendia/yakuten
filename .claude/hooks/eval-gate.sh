#!/usr/bin/env bash
# v4.0: Node guard engine 优先；node 缺失或 CTO_GUARD_ENGINE=legacy → 下方 legacy 实现
# （v3.15 冻结，零红线真空 — v3.14 verdict Phase-1 硬条件）。引擎：engine/guard.mjs
GUARD_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ "${CTO_GUARD_ENGINE:-engine}" != "legacy" ] && command -v node >/dev/null 2>&1 && [ -f "$GUARD_DIR/engine/guard.mjs" ]; then
  exec node "$GUARD_DIR/engine/guard.mjs" eval-gate
fi
# ══ legacy fallback（v3.15 原实现，冻结不再演进）══
# 铁律 #12: 无 eval 不进 main — PostToolUse(Edit|Write|MultiEdit)
# 检测改 prompt 类文件（.claude/commands/, agents/, skills/, CLAUDE.md, handbook.md）
# 用 additionalContext 强提醒 Claude 必须配套写 eval（不直接 block，因 Edit 是合法操作）
# 真正的硬 block 在 commit 阶段（pre-commit hook，v3.8 D2 backlog）
set -uo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/common.sh"

read_hook_input
maybe_run_override "eval-gate"

[ -z "$HOOK_FILE_PATH" ] && exit 0

# v3.11 fix（飞轮第 7 轮 redundancy-hunter 发现）：旧逻辑 ${HOOK_FILE_PATH#$CWD/}
# 在 Windows 反斜杠路径下不剥离 → eval-gate 在 Windows 静默失效。用统一 normalize_paths。
normalize_paths
REL_PATH="$HOOK_REL"

# Prompt 类文件模式（改这些必须配 eval）
PROMPT_PATTERN='\.claude/commands/|\.claude/agents/|\.claude/skills/|\.agents/skills/|^CLAUDE\.md$|/CLAUDE\.md$|playbook/handbook\.md$|\.claude/output-styles/'

if echo "$REL_PATH" | grep -qE -- "$PROMPT_PATTERN"; then
  audit_log "eval-gate-warn" "file=$REL_PATH"

  # Opt-out
  [ "${CTO_EVAL_GATE_ACK:-0}" = "1" ] && exit 0

  REMINDER="📊 §35 / 铁律 #12 触发: $REL_PATH

刚修改了 prompt 类文件（commands/agents/skills/CLAUDE.md/handbook）。
**无 eval 不进 main**（铁律 #12）。

合并前必须：
  1. evals/golden-trajectories/ 中存在覆盖本改动的 yaml case
  2. 跑 \`/cto-eval run\` 通过
  3. 既有 case 不回归

如本次改动无需 eval（typo / 注释 / 格式调整），请显式说明并 export CTO_EVAL_GATE_ACK=1。

参考：handbook §35 / 铁律 #12 / .claude/rules/eval-gate.md"

  if [ "$HAS_JQ" = "1" ]; then
    printf '%s' "$REMINDER" | jq -Rs --arg ev "PostToolUse" \
      '{hookSpecificOutput: {hookEventName: $ev, additionalContext: .}}'
  else
    echo "$REMINDER" >&2
  fi
fi

exit 0
