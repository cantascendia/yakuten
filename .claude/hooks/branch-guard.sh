#!/usr/bin/env bash
# 铁律 #8：先创建 Git 分支再动手 — PreToolUse(Edit|Write|MultiEdit)
# main / master branch 上直接 Edit → exit 2 阻止
# Opt-out: CTO_MAIN_EDIT_ALLOWED=1（仅 hotfix 紧急场景）
set -uo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/common.sh"

require_jq || exit 0
read_hook_input
maybe_run_override "branch-guard"

# 仅对 file 类工具生效
[ -z "$HOOK_FILE_PATH" ] && exit 0

# 检测当前 git branch
cd "${HOOK_CWD:-.}" 2>/dev/null
BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null)
[ -z "$BRANCH" ] && exit 0  # 不在 git repo 内，跳过

# 危险 branch 名单
case "$BRANCH" in
  main|master|production|prod|release)
    if [ "${CTO_MAIN_EDIT_ALLOWED:-0}" = "1" ]; then
      audit_log "main-edit-allowed-emergency" "branch=$BRANCH file=$HOOK_FILE_PATH"
      exit 0
    fi

    audit_log "main-edit-blocked" "branch=$BRANCH file=$HOOK_FILE_PATH"

    block_with_reason "🛑 铁律 #8 BLOCKED: 当前在 \`$BRANCH\` 分支上直接 Edit

文件：$HOOK_FILE_PATH
分支：$BRANCH （受保护）

直接编辑主分支违反 #8（先创建 Git 分支再动手）。

正确做法：
  git checkout -b feat/<short-name>
  # 或基于已有 PR 的分支：
  git checkout -b fix/<issue-short>

紧急 hotfix 例外（仅在事故响应中使用）：
  export CTO_MAIN_EDIT_ALLOWED=1   # 单次会话 + audit log 永久记录

参考：CLAUDE.md 铁律 #8"
    ;;
esac

exit 0
