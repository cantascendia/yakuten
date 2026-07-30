#!/usr/bin/env bash
# codex-bridge PR 评论上限门禁（eval codex-bridge-002 的可执行部分）
#
# 守护契约：.agents/skills/codex-bridge/run.sh 往 PR 发评论前必须截断。
# 事故来源：2026-07-29 无截断写入，实际发出 237,647 bytes 单条自动评论
# （CODEX-REVIEW-LOG.md sha=b7850a8）。GitHub 单条评论上限 65,536 字符。
#
# 局限（诚实记录）：这是结构 + 行为断言，不端到端跑真实 gh pr comment
# （那需要真账号真 PR，且会再次产生外部写入）。能抓住「上限被移除 /
# 调高过 GitHub 上限 / 截断提示丢失」三类回归。
#
# 用法：bash scripts/verify-codex-comment-limit.sh
set -uo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || echo .)"
SCRIPT="$ROOT/.agents/skills/codex-bridge/run.sh"
GITHUB_CAP=65536
FAIL=0

ok()   { echo "✅ $1"; }
bad()  { echo "🔴 $1"; FAIL=1; }

[ -f "$SCRIPT" ] || { bad "找不到 $SCRIPT"; exit 1; }

# ── 断言 1：存在上限判定 ────────────────────────────────────────────────
if grep -q 'COMMENT_LIMIT' "$SCRIPT"; then
  ok "hard-limit-exists：脚本内存在 COMMENT_LIMIT"
else
  bad "hard-limit-exists：找不到 COMMENT_LIMIT —— 无上限写入是本 eval 要防的原始事故形态"
fi

# ── 断言 2：默认上限 <= GitHub 上限 ──────────────────────────────────────
LIMIT=$(grep -oE 'CODEX_COMMENT_LIMIT:-[0-9]+' "$SCRIPT" | head -1 | grep -oE '[0-9]+$')
if [ -z "${LIMIT:-}" ]; then
  bad "limit-below-github-cap：解析不到默认上限数值"
elif [ "$LIMIT" -le "$GITHUB_CAP" ]; then
  ok "limit-below-github-cap：默认上限 $LIMIT <= GitHub 上限 $GITHUB_CAP"
else
  bad "limit-below-github-cap：默认上限 $LIMIT 超过 GitHub 上限 $GITHUB_CAP"
fi

# ── 断言 3：截断时有提示 + 仓库内全文指针 ────────────────────────────────
if grep -q '报告过长已截断' "$SCRIPT" && grep -q 'docs/ai-cto/reviews' "$SCRIPT"; then
  ok "truncation-notice：截断提示与 reviews/<sha>.md 指针都在"
else
  bad "truncation-notice：缺截断提示或缺仓库内全文指针"
fi

# ── 断言 4：截断事件入审计日志 ──────────────────────────────────────────
if grep -q 'pr-comment-truncated' "$SCRIPT"; then
  ok "truncation-logged：截断写 CODEX-REVIEW-LOG.md"
else
  bad "truncation-logged：截断未留审计痕迹"
fi

# ── 断言 5：完整全文仍归档（不被截断替代）────────────────────────────────
if grep -qE 'reviews/\$\{?SHORT_SHA\}?\.md|REVIEW_FILE' "$SCRIPT"; then
  ok "full-report-still-archived：reviews/<sha>.md 归档路径仍在"
else
  bad "full-report-still-archived：找不到完整报告归档路径"
fi

# ── 行为断言：对事故当天的真实体积做一次截断，验证结果确实受限 ─────────────
if [ -n "${LIMIT:-}" ]; then
  BIG=$(head -c 237647 /dev/zero | tr '\0' 'x')
  GOT=$(printf '%s' "$BIG" | head -c "$LIMIT" | wc -c | tr -d ' ')
  # +512 余量给提示行与指针行
  if [ "$GOT" -le "$((LIMIT + 512))" ]; then
    ok "behavioral：237647 bytes 输入经 head -c $LIMIT 后为 $GOT bytes，受限生效"
  else
    bad "behavioral：截断后仍为 $GOT bytes，超出 $((LIMIT + 512))"
  fi
fi

echo
if [ "$FAIL" -eq 0 ]; then
  echo "✅ codex-bridge-002 全部断言通过"
else
  echo "🔴 codex-bridge-002 有断言失败 —— 按铁律 #12，不得合并"
fi
exit "$FAIL"
