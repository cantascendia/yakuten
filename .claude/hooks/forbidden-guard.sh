#!/usr/bin/env bash
# v4.0: Node guard engine 优先；node 缺失或 CTO_GUARD_ENGINE=legacy → 下方 legacy 实现
# （v3.15 冻结，零红线真空 — v3.14 verdict Phase-1 硬条件）。引擎：engine/guard.mjs
GUARD_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ "${CTO_GUARD_ENGINE:-engine}" != "legacy" ] && command -v node >/dev/null 2>&1 && [ -f "$GUARD_DIR/engine/guard.mjs" ]; then
  exec node "$GUARD_DIR/engine/guard.mjs" forbidden-guard
fi
# ══ legacy fallback（v3.15 原实现，冻结不再演进）══
# §32.1 Forbidden 路径硬拦截 — PreToolUse(Edit|Write|MultiEdit)
# 触及 auth/payment/secrets/migration/crypto/infra 等路径 → exit 2 阻止
# Opt-out: CTO_DOUBLE_SIGNED=1（需双签 + spec-driven 后单次解锁）
set -uo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/common.sh"

require_jq || exit 0
read_hook_input
maybe_run_override "forbidden-guard"

# 仅对 file 类工具生效
[ -z "$HOOK_FILE_PATH" ] && exit 0

# v3.9.2 fix（飞轮二次实战发现）：Windows 反斜杠路径剥离静默失效（同 immutable-guard 之前的 bug）
# normalize 反斜杠 → 正斜杠，让 grep 模式（用 /）能正确匹配
NORMALIZED_FILE="${HOOK_FILE_PATH//\\/\/}"
NORMALIZED_CWD="${HOOK_CWD//\\/\/}"

# 转项目相对路径（去掉 cwd 前缀以便 grep）
REL_PATH="${NORMALIZED_FILE#${NORMALIZED_CWD}/}"
# 如果剥离失败（不在 cwd 内）→ 用 normalized 绝对路径让 grep 模式匹配
[ "$REL_PATH" = "$NORMALIZED_FILE" ] && REL_PATH="$NORMALIZED_FILE"

# SSOT: scripts/forbidden-paths.txt（v3.6.1 已落地）
SSOT="${NORMALIZED_CWD}/scripts/forbidden-paths.txt"
if [ ! -f "$SSOT" ]; then
  # SSOT 缺失：fallback（v3.13 O7：单源 common.sh，同手册 §32.1）
  PATTERN="$(forbidden_fallback_pattern)"
else
  PATTERN=$(grep -vE '^\s*(#|$)' "$SSOT" | tr '\n' '|' | sed 's/|$//')
fi

[ -z "$PATTERN" ] && exit 0

# 命中 forbidden 路径？
if echo "$REL_PATH" | grep -qE -- "($PATTERN)"; then
  # Opt-out：用户已走 spec-driven + 双签后可临时解锁
  if [ "${CTO_DOUBLE_SIGNED:-0}" = "1" ]; then
    audit_log "forbidden-allowed" "path=$REL_PATH double_signed=true"
    exit 0
  fi

  audit_log "forbidden-blocked" "path=$REL_PATH"

  block_with_reason "🛑 §32.1 BLOCKED: \`$REL_PATH\` 命中 forbidden 路径

此路径禁止 vibe coding（铁律 #13），必须走 spec-driven：
  1. /cto-spec specify — 先写 SPEC 并经人审
  2. 双签：CTO + 第二模型独立审（/cto-review --cross）
  3. PR 打 \`requires-double-review\` 标签

详见 .claude/rules/forbidden-paths.md（handbook §32.1 / §19 / 铁律 #13）
紧急 opt-out（已获双签后）：export CTO_DOUBLE_SIGNED=1   # 仅本会话有效"
fi

exit 0
