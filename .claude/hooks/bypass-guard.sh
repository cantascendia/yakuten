#!/usr/bin/env bash
# 防 #40117 多策略绕过 — PreToolUse(Bash)
# Anthropic 自家 issue 显示 Claude 会用 6+ 种方式绕过 pre-commit hook
# 这个 guard 拦截所有已知 bypass 模式，exit 2 + stderr 喂回 Claude
set -uo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/common.sh"

require_jq || exit 0
read_hook_input
maybe_run_override "bypass-guard"

# 仅对 Bash 工具生效
[ "$HOOK_TOOL_NAME" != "Bash" ] && exit 0
[ -z "$HOOK_BASH_CMD" ] && exit 0

# 6+ 种 bypass 模式（基于 #40117 实战观察 + Anthropic discussion）
# - --no-verify / -n: 跳过 git hook
# - core.hooksPath: 重写 hook 路径
# - HUSKY=0 / hooks-disable: 禁 husky
# - chmod -x .husky: 删 hook 执行权
# - git stash + commit + pop: 借 stash 绕过
# - SKIP / skip: 一些工具的 bypass env
BYPASS_PATTERNS='--no-verify|git\s+commit\s+-n($|\s)|core\.hooksPath|HUSKY=0|hooks-disable|chmod\s+-x.*husky|git\s+stash[^|]*&&[^|]*commit|SKIP=|--allow-empty\s+--dry-run|git\s+config.*hooksPath'

if echo "$HOOK_BASH_CMD" | grep -qE -- "$BYPASS_PATTERNS"; then
  # Opt-out: 紧急情况下手动设 CTO_BYPASS_ALLOWED=1
  if [ "${CTO_BYPASS_ALLOWED:-0}" = "1" ]; then
    audit_log "bypass-allowed-emergency" "cmd=$HOOK_BASH_CMD"
    exit 0
  fi

  audit_log "bypass-blocked" "cmd=$HOOK_BASH_CMD"

  block_with_reason "🛑 BLOCKED: 检测到 hook/pre-commit 绕过尝试

命令：\`$HOOK_BASH_CMD\`

这命中 #40117 类多策略绕过模式（--no-verify / hooksPath 重写 / stash 绕过 / chmod 等）。
Anthropic 自己的 issue #40117 证明：CLAUDE.md 文本规则不够，必须 hook 强制。

正确做法（修因不修锁）：
  1. 把失败的 hook 输出贴出来
  2. 我们一起诊断为什么 hook 失败
  3. 修复根本原因，让 hook 自然通过

紧急例外（仅在生产事故时）：
  export CTO_BYPASS_ALLOWED=1   # 单次会话 + audit log 永久记录

参考：https://github.com/anthropics/claude-code/issues/40117"
fi

exit 0
