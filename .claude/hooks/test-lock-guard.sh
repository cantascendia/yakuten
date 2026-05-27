#!/usr/bin/env bash
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

REL_PATH="$HOOK_FILE_PATH"
if [ -n "$HOOK_CWD" ]; then
  REL_PATH="${HOOK_FILE_PATH#$HOOK_CWD/}"
fi

if echo "$REL_PATH" | grep -qE -- "$TEST_PATTERN"; then
  if [ "${CTO_TEST_LOCK_ACK:-0}" = "1" ]; then
    audit_log "test-lock-ack" "file=$REL_PATH"
    exit 0
  fi

  audit_log "test-lock-warn" "file=$REL_PATH"

  # 注入 additionalContext（jq 优先，fallback 用 stderr 提醒，配合 exit 0）
  REMINDER="🛑 §20.3 Test-Lock 触发（铁律 #14）: $REL_PATH

编辑测试文件必须符合下列合法场景之一：
  ✅ Spec 变更 → commit message 含 \`spec-change:\`
  ✅ Bug 修复 → commit message 含 \`bug-fix:\` 或 \`fix:\`
  ✅ 新增测试 → 仅添加 test case，不修改既有断言
  ✅ Refactor → 测试结构调整但断言语义不变

禁止：
  ❌ 实现失败时改测试让其通过（作弊式 TDD）
  ❌ AI 不理解期望行为时改断言迁就实现
  ❌ 删除\"麻烦的\"测试

如本次确属合法场景，请在响应中显式说明属于哪类，并在 commit message 中标注。

临时静默：export CTO_TEST_LOCK_ACK=1"

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
