#!/usr/bin/env bash
# v4.0: Node guard engine 优先；node 缺失或 CTO_GUARD_ENGINE=legacy → 下方 legacy 实现
# （v3.15 冻结，零红线真空 — v3.14 verdict Phase-1 硬条件）。引擎：engine/guard.mjs
GUARD_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ "${CTO_GUARD_ENGINE:-engine}" != "legacy" ] && command -v node >/dev/null 2>&1 && [ -f "$GUARD_DIR/engine/guard.mjs" ]; then
  exec node "$GUARD_DIR/engine/guard.mjs" branch-guard
fi
# ══ legacy fallback（v3.15 原实现，冻结不再演进）══
# 铁律 #8：先创建 Git 分支再动手 — PreToolUse(Edit|Write|MultiEdit)
# main / master branch 上直接 Edit → exit 2 阻止
# Opt-out: CTO_MAIN_EDIT_ALLOWED=1（仅 hotfix 紧急场景）
#
# ⚠️ 已知语义差（**设计如此，非 bug** — v4.7 实测澄清，勿误判为 legacy 漏拦）：
#   本层只拦 Edit/Write/MultiEdit（v3.15 冻结面）。**Bash 层的 `git commit/merge/push` 拦截
#   是 v4.0c 新增语义，仅在 engine 实现**（engine/guards.mjs branchGuardBash）。
#   故 node 缺失 / CTO_GUARD_ENGINE=legacy 时，`git commit` 类命令不被本层拦 —— 这是
#   「应急降级保住核心 Edit/Write 红线」的有意取舍，不是 false-negative。
#   v4.7 的跨仓 cd / git -C / 同串 checkout -b 感知同理，engine-only。
set -uo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/common.sh"

require_jq || exit 0
read_hook_input
maybe_run_override "branch-guard"

# v4.0e（codex §48）：路径归一 — 与 engine canonPath 同款（backslash→/、MSYS(/c/)→原生、去尾斜杠、
# Windows 大小写不敏感）。保 engine/legacy parity。
_canon() {
  local p="${1//\\//}"
  local win=0
  case "$(uname -s 2>/dev/null)" in MINGW*|MSYS*|CYGWIN*) win=1 ;; esac
  if [ "$win" = "1" ]; then
    case "$p" in
      /[A-Za-z]/*|/[A-Za-z]) local d="${p:1:1}"; p="${d}:${p:2}" ;;  # /c/foo → c:/foo
    esac
    p="${p,,}"  # Windows FS 大小写不敏感
  fi
  while [ "$p" != "${p%/}" ]; do p="${p%/}"; done  # 剥全部尾斜杠（对齐 engine .replace(/\/+$/,'')）
  printf '%s' "$p"
}

# 仅对 file 类工具生效
[ -z "$HOOK_FILE_PATH" ] && exit 0

# 检测当前 git branch
cd "${HOOK_CWD:-.}" 2>/dev/null
BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null)
[ -z "$BRANCH" ] && exit 0  # 不在 git repo 内，跳过

# 危险 branch 名单
case "$BRANCH" in
  main|master|production|prod|release)
    # v4.0e（修 2026-07-02 误拦 + codex §48 加固×2）：仅拦当前 git 工作树内文件 —
    # 保护分支上写仓库外文件（如 ~/.claude/.../memory/*.md）与本仓 main 无关 → 放行。
    # 工作树根 = 从 cwd 按 git cdup 相对上爬（非 --show-toplevel 的 real 路径 → symlink 别名不漏拦）。
    # 与 engine fileInsideWorktree() 的 cdup 上爬 + canon parity。
    _NF="${HOOK_FILE_PATH//\\//}"
    _INSIDE=1
    case "$_NF" in
      /*|[A-Za-z]:/*)  # 绝对路径 → 需落在工作树根前缀内才算仓库内
        _CDUP=$(git rev-parse --show-cdup 2>/dev/null)  # 已在 cwd 内（上方 cd）；根目录=空
        _ROOT="${HOOK_CWD:-.}"; _ROOT="${_ROOT//\\//}"
        while [ "$_ROOT" != "${_ROOT%/}" ]; do _ROOT="${_ROOT%/}"; done  # 剥全部尾斜杠再上爬（防误吞 '..' 层级，对齐 engine）
        _t="$_CDUP"
        while [ -n "$_t" ]; do  # 每个 '../' 上爬一层（停留在 cwd 空间）
          case "$_t" in
            ../*) _ROOT="${_ROOT%/*}"; _t="${_t#../}" ;;
            *) _t="" ;;
          esac
        done
        _CF=$(_canon "$_NF"); _CB=$(_canon "$_ROOT")
        _INSIDE=0
        case "$_CF" in
          "$_CB"|"$_CB"/*) _INSIDE=1 ;;
        esac
        ;;
    esac
    if [ "$_INSIDE" = "0" ]; then
      audit_log "main-edit-outside-repo-allowed" "branch=$BRANCH file=$HOOK_FILE_PATH"
      exit 0
    fi

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
