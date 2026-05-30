#!/usr/bin/env bash
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

此路径属于高风险范畴（auth/payment/secrets/migration/crypto/infra），
不能直接 vibe-code。必须走 spec-driven 流程（铁律 #13）：

  步骤：
  1. 起草规范：/cto-spec specify
  2. 第二模型 review：/cto-review
  3. PR 加 \`requires-double-review\` 标签
  4. commit message 显式引用 SPEC（如 'Per SPEC.md §3.2 ...'）

  紧急临时解锁（已 double-sign 后）：
    export CTO_DOUBLE_SIGNED=1   # 仅本会话有效

参考：handbook §32.1 / §19 / 铁律 #13"
fi

exit 0
