#!/usr/bin/env bash
# v4.0: Node guard engine 优先；node 缺失或 CTO_GUARD_ENGINE=legacy → 下方 legacy 实现
# （v3.15 冻结，零红线真空 — v3.14 verdict Phase-1 硬条件）。引擎：engine/guard.mjs
GUARD_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ "${CTO_GUARD_ENGINE:-engine}" != "legacy" ] && command -v node >/dev/null 2>&1 && [ -f "$GUARD_DIR/engine/guard.mjs" ]; then
  exec node "$GUARD_DIR/engine/guard.mjs" test-lock-guard
fi
# ══ legacy fallback（v3.15 原实现，冻结不再演进）══
# §20.3 / 铁律 #14 Test-Lock — PreToolUse(Edit|Write|MultiEdit)
# 编辑测试文件需符合 spec 变更或 bug 修复场景，不得为让测试通过而改测试。
#
# 此 hook 不直接 block（false positive 太多），而是注入 additionalContext
# 强提醒 Claude 必须在响应或 commit message 中显式引用合法理由。
# 真正的 enforcement 在 commit-msg hook（v3.8 Step D2）。
set -uo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/common.sh"

require_jq || exit 0
read_hook_input
maybe_run_override "test-lock-guard"

[ -z "$HOOK_FILE_PATH" ] && exit 0

# 测试文件模式
TEST_PATTERN='/tests?/|/__tests__/|\.test\.[jt]sx?$|\.spec\.[jt]sx?$|_test\.py$|test_[^/]+\.py$|_test\.go$|.*Test\.java$|.*Spec\.scala$'

# v3.11 fix（飞轮第 7 轮 redundancy-hunter 发现）：旧逻辑 ${HOOK_FILE_PATH#$HOOK_CWD/}
# 在 Windows 反斜杠路径下不剥离 → test-lock 在 Windows 静默失效。用统一 normalize_paths。
normalize_paths
REL_PATH="$HOOK_REL"

if echo "$REL_PATH" | grep -qE -- "$TEST_PATTERN"; then
  if [ "${CTO_TEST_LOCK_ACK:-0}" = "1" ]; then
    audit_log "test-lock-ack" "file=$REL_PATH"
    exit 0
  fi

  audit_log "test-lock-warn" "file=$REL_PATH"

  # 注入 additionalContext（jq 优先，fallback 用 stderr 提醒，配合 exit 0）
  REMINDER="🛑 §20.3 Test-Lock 触发（铁律 #14）: $REL_PATH

测试文件锁定：AI 只能改实现，不能改断言迁就实现（作弊式 TDD）。
合法场景（需在 commit message 声明依据）：spec-change / bug-fix / 新增测试 / refactor（不改断言语义）。

如属合法场景请显式说明属于哪类并在 commit message 标注；确认合法：export CTO_TEST_LOCK_ACK=1。
详见 .claude/rules/test-lock.md（handbook §20.3 / 铁律 #14）"

  if [ "$HAS_JQ" = "1" ]; then
    # 用 jq 输出 structured additionalContext
    printf '%s' "$REMINDER" | jq -Rs --arg ev "PreToolUse" \
      '{hookSpecificOutput: {hookEventName: $ev, additionalContext: .}}'
  else
    # 降级：stderr 提醒（Claude 仍能看到）+ exit 0 不阻止
    echo "$REMINDER" >&2
  fi
  exit 0
fi

exit 0
