#!/usr/bin/env bash
# CTO 状态栏 — 显示 SPEC 阶段 + Forbidden 路径触及计数 + git 分支

set -e

# 当前 git 分支
BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "no-git")

# SPEC 阶段
PHASE="—"
if [ -f docs/ai-cto/TASKS.md ]; then
  PHASE="TASKS"
elif [ -f docs/ai-cto/PLAN.md ]; then
  PHASE="PLAN"
elif [ -f docs/ai-cto/SPEC.md ]; then
  PHASE="SPEC"
fi

# 当前 SPEC 标题（如果存在）
SPEC_TITLE=""
if [ -f docs/ai-cto/SPEC.md ]; then
  SPEC_TITLE=$(head -1 docs/ai-cto/SPEC.md | sed 's/^# //' | head -c 30)
fi

# Forbidden 路径触及计数（git diff 中 staged/unstaged 改动）
FORBIDDEN=$(git diff --name-only HEAD 2>/dev/null | grep -cE '(auth|payment|secrets|migration|crypto)/' 2>/dev/null)
[ -z "$FORBIDDEN" ] && FORBIDDEN=0

# Constitution 状态
CONST=""
if [ -f docs/ai-cto/CONSTITUTION.md ]; then
  CONST=" 📜"
fi

# 输出（精简）
if [ -n "$SPEC_TITLE" ]; then
  echo "🌿 $BRANCH | 📋 $PHASE: $SPEC_TITLE$CONST | 🛑 Forbidden: $FORBIDDEN"
else
  echo "🌿 $BRANCH | 📋 $PHASE$CONST | 🛑 Forbidden: $FORBIDDEN"
fi
