#!/usr/bin/env bash
# codex-bridge runner — 被 Stop hook 异步调用
# 作用：跑 codex review（订阅 auth）→ 写 REVIEW-QUEUE.md → 同步到 PR comment
#       + 自动开 PR（如有未推 commits 且无 open PR）
# 文档：手册 §48 + .agents/skills/codex-bridge/SKILL.md
# 哲学：AI-native autopilot — 不询问、不打扰，能自动就自动
set +e

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null)"
[ -z "$REPO_ROOT" ] && exit 0
cd "$REPO_ROOT"

# v3.13 O7：source common.sh 复用 forbidden_fallback_pattern（单源，防本脚本旧版漏 billing/keys/terraform/.github）
# 仅定义函数无副作用；失败则用内联兜底。
# shellcheck disable=SC1091
[ -f .claude/hooks/lib/common.sh ] && source .claude/hooks/lib/common.sh 2>/dev/null || true

# 0. TOCTOU 防护：mkdir 原子锁 + stale lock auto-clear (>60min)
LOCK_DIR="docs/ai-cto/.codex-bridge.lock"
mkdir -p docs/ai-cto

# Stale lock auto-clean（防止前次进程崩溃后永久阻塞）
if [ -d "$LOCK_DIR" ]; then
  LOCK_AGE=$(find "$LOCK_DIR" -maxdepth 0 -mmin +60 2>/dev/null | wc -l)
  if [ "$LOCK_AGE" -gt 0 ]; then
    rmdir "$LOCK_DIR" 2>/dev/null
    echo "$(date -Iseconds 2>/dev/null || date) | sha=$(git rev-parse --short HEAD 2>/dev/null) | mode=lock-stale-cleared | reason=lock_age>60min" \
      >> docs/ai-cto/CODEX-REVIEW-LOG.md
  fi
fi

if ! mkdir "$LOCK_DIR" 2>/dev/null; then
  # 不再 silent skip — 写 audit log（v3.7 反 silent-failure）
  echo "$(date -Iseconds 2>/dev/null || date) | sha=$(git rev-parse --short HEAD 2>/dev/null) | mode=skipped-lock-held | reason=concurrent_run" \
    >> docs/ai-cto/CODEX-REVIEW-LOG.md
  exit 0
fi
trap 'rmdir "$LOCK_DIR" 2>/dev/null' EXIT INT TERM

TARGET="${1:-HEAD}"
SHA=$(git rev-parse "$TARGET" 2>/dev/null)
SHORT_SHA=$(echo "$SHA" | cut -c1-7)

# safe-grep：grep 退出码 0=match, 1=no-match, 2+=real error（避免静默吞错）
SAFE_GREP="$REPO_ROOT/scripts/safe-grep.sh"
[ ! -x "$SAFE_GREP" ] && SAFE_GREP=""

run_grep() {
  if [ -n "$SAFE_GREP" ]; then
    bash "$SAFE_GREP" "$@"
  else
    grep "$@" || true
  fi
}

# 1. Forbidden 路径过滤（SSOT 来自 scripts/forbidden-paths.txt）
SSOT="scripts/forbidden-paths.txt"
if [ -f "$SSOT" ]; then
  PATTERN=$(grep -v '^#' "$SSOT" | grep -v '^$' | tr '\n' '|' | sed 's/|$//')
elif command -v forbidden_fallback_pattern >/dev/null 2>&1; then
  PATTERN="$(forbidden_fallback_pattern)"  # v3.13 O7：单源（修旧版漏 billing/keys/terraform/.github）
else
  PATTERN='auth/|payment/|billing/|secrets/|keys/|migration|crypto/|infra/|terraform/|\.github/workflows/'
fi
FORBIDDEN=$(git diff --name-only "${TARGET}~1" "${TARGET}" 2>/dev/null | run_grep -E "$PATTERN")

if [ -n "$FORBIDDEN" ] && [ "${FORCE:-0}" != "1" ]; then
  echo "$(date -Iseconds 2>/dev/null || date) | sha=${SHORT_SHA} | mode=skipped-forbidden | reason=touched_${FORBIDDEN}" \
    >> docs/ai-cto/CODEX-REVIEW-LOG.md
  exit 0
fi

# 2. Business 路径过滤（SSOT 来自 scripts/business-paths.txt）
BIZ_SSOT="scripts/business-paths.txt"
if [ -f "$BIZ_SSOT" ]; then
  BIZ_PATTERN=$(grep -v '^#' "$BIZ_SSOT" | grep -v '^$' | sed 's|^|^|' | tr '\n' '|' | sed 's/|$//')
else
  BIZ_PATTERN='^(src|app|lib|apps|packages)/'
fi
DIFF_FILES=$(git diff --name-only "${TARGET}~1" "${TARGET}" 2>/dev/null)
BUSINESS=$(echo "$DIFF_FILES" | run_grep -E "$BIZ_PATTERN")

# v3.13 O4（SOTA team 审计）：安全/enforcement 相关改动必审，绝不当"non-business"跳过。
# 旧 bug：BIZ_PATTERN 只认 src/app/lib，把 .claude/hooks（红线 guard）判 non-business →
# v3.10–v3.12 全部安全改动自 2026-05-12 起零跨模型审 18 天。系统最核心的"跨模型防盲区"在
# 最高风险改动上空转。修：SECURITY_PATTERN 命中即视为 review-worthy（business OR security）。
SECURITY_PATTERN='^\.claude/hooks/|^\.claude/commands/|^\.claude/skills/|^\.agents/skills/|^scripts/|^CLAUDE\.md$|^playbook/handbook\.md$|^docs/ai-cto/CONSTITUTION\.md$|^\.claude/settings\.json$'
SECURITY=$(echo "$DIFF_FILES" | run_grep -E "$SECURITY_PATTERN")

if [ -z "$BUSINESS" ] && [ -z "$SECURITY" ] && [ "${FORCE:-0}" != "1" ]; then
  echo "$(date -Iseconds 2>/dev/null || date) | sha=${SHORT_SHA} | mode=skipped-non-business | reason=docs_or_config_only_no_security" \
    >> docs/ai-cto/CODEX-REVIEW-LOG.md
  exit 0
fi
# 记录触发原因（business / security / both）便于审计
[ -n "$SECURITY" ] && echo "$(date -Iseconds 2>/dev/null || date) | sha=${SHORT_SHA} | mode=review-triggered | reason=security_relevant_change" \
  >> docs/ai-cto/CODEX-REVIEW-LOG.md

# 3. Debounce：同 commit 不重复 review
# PR #11 重放（2026-07-10）：任何「成功落 review」的模式都算已审 —— codex 成功(success) /
# claude 补位(claude-only / fallback-to-claude)。只认 success 时 codex 配额耗尽走 fallback 后
# 同 SHA 会被反复重审（实证：CODEX-REVIEW-LOG 里 ba74d2a 记了 16 次）。
# 边界：codex-failed+claude-failed **不算**已审（没落 review，应允许下次重试）。
if [ -f docs/ai-cto/CODEX-REVIEW-LOG.md ] && \
   grep -qE "sha=${SHORT_SHA}\b.*mode=(success|claude-only|fallback-to-claude|agy-only|fallback-to-agy)" docs/ai-cto/CODEX-REVIEW-LOG.md 2>/dev/null; then
  echo "$(date -Iseconds 2>/dev/null || date) | sha=${SHORT_SHA} | mode=skipped-debounce | reason=already_reviewed" \
    >> docs/ai-cto/CODEX-REVIEW-LOG.md
  exit 0
fi

# 4. 检测 codex / agy / claude / gh 可用性
HAS_CODEX=0
HAS_AGY=0
HAS_CLAUDE=0
HAS_GH=0
command -v codex >/dev/null 2>&1 && HAS_CODEX=1
# agy PATH 兜底（v4.6）：winget 装到 WinGet\Links，父进程在安装前启动时 PATH 里没有 →
# command -v 找不到但二进制真实存在。兜底探测 Links 目录（LOCALAPPDATA 仅 Windows 有，POSIX 下跳过）。
AGY_BIN="agy"
if command -v agy >/dev/null 2>&1; then
  HAS_AGY=1
elif [ -n "${LOCALAPPDATA:-}" ]; then
  for cand in "$LOCALAPPDATA/Microsoft/WinGet/Links/agy.exe" "$LOCALAPPDATA/Microsoft/WinGet/Links/agy"; do
    [ -x "$cand" ] && AGY_BIN="$cand" && HAS_AGY=1 && break
  done
fi
command -v claude >/dev/null 2>&1 && HAS_CLAUDE=1
command -v gh >/dev/null 2>&1 && HAS_GH=1

# 4a. Codex 配额冷却
COOLDOWN_FILE="docs/ai-cto/.codex-quota-cooldown"
SKIP_CODEX=0
if [ -f "$COOLDOWN_FILE" ]; then
  COOLDOWN_TS=$(cat "$COOLDOWN_FILE" 2>/dev/null || echo 0)
  NOW=$(date +%s 2>/dev/null || echo 0)
  if [ "$NOW" -gt 0 ] && [ "$COOLDOWN_TS" -gt 0 ] && [ $((NOW - COOLDOWN_TS)) -lt 3600 ]; then
    SKIP_CODEX=1
  fi
fi

if [ "$HAS_CODEX" = "0" ] && [ "$HAS_AGY" = "0" ] && [ "$HAS_CLAUDE" = "0" ]; then
  echo "$(date -Iseconds 2>/dev/null || date) | sha=${SHORT_SHA} | mode=ci_pending | reason=no_local_reviewer" \
    >> docs/ai-cto/CODEX-REVIEW-LOG.md
  exit 0
fi

# 5. 异步跑 review + PR sync
{
  TS=$(date -Iseconds 2>/dev/null || date)
  REVIEWER=""
  MODE=""
  FAIL_CHAIN=""   # v4.4d FIX4: 保留 codex/agy 真实失败链（fallback 时不丢，防"claude-only 假诊断"掩盖复发 bug）
  OUTPUT=""
  STATUS=1

  # 5a. 主路径：codex review
  # v4.6 模型固定：不再吃 ~/.codex/config.toml 默认（桌面端会把它改成 terra 等其他档）——
  # review 档位显式钉死 gpt-5.6-sol（可 env 覆盖），REVIEWER 标签取实际模型（不再硬编码假标签）。
  CODEX_REVIEW_MODEL="${CODEX_REVIEW_MODEL:-gpt-5.6-sol}"
  if [ "$HAS_CODEX" = "1" ] && [ "$SKIP_CODEX" = "0" ]; then
    OUTPUT=$(codex review -c model="$CODEX_REVIEW_MODEL" --commit "$SHA" --title "ai-playbook §48 cross-model review" 2>&1)
    STATUS=$?
    if [ $STATUS -eq 0 ]; then
      REVIEWER="codex-${CODEX_REVIEW_MODEL}"   # v4.6: 标签=实际调用模型（cost gate 用 codex- 前缀匹配，不受影响）
      MODE="success"
    elif echo "$OUTPUT" | grep -qiE "(rate.?limit|quota|exceeded|insufficient|usage.?limit|429|402)"; then
      echo "$(date +%s 2>/dev/null || echo 0)" > "$COOLDOWN_FILE"
      MODE="codex-quota-exhausted"
      STATUS=99
    else
      MODE="codex-failed"
    fi
  fi

  # 5a2. Fallback 到 Antigravity CLI（agy · Gemini）— v4.4：跨模型价值保留档
  # codex(GPT) 不可用时先走 agy(Gemini) 再走 claude —— Gemini ≠ GPT ≠ Claude，
  # agy 补位仍是跨模型审；claude 补位才是「失去跨模型价值」的最后档。
  # 自包含 prompt（diff 直接贴入）：print 模式无交互授权，不能让 agent 自己跑 git。
  # v4.6 模型固定：默认 gemini-3.6-flash-high（dash 形式 ID，agy 1.1.5 实测有效；
  # 空格形式 "Gemini 3.1 Pro (High)" 会被拒绝）。加 --print-timeout 防 print 模式无限挂起。
  AGY_REVIEW_MODEL="${AGY_REVIEW_MODEL:-gemini-3.6-flash-high}"
  if [ -z "$REVIEWER" ] && [ "$HAS_AGY" = "1" ]; then
    DIFF_CONTENT=$(git show --stat --patch "$SHA" 2>/dev/null | head -c 60000)
    AGY_PROMPT="你是跨模型代码审阅者。按八维（架构/代码质量/性能/安全/测试/DX/功能完整性/UX）逐条 ✅⚠️🔴 + 文件:行号 评审以下 commit ${SHORT_SHA} 的 diff。仅输出 markdown 报告，不要调用任何工具、不要读文件。
报告**最后单独一行**输出机器可解析的严重度汇总（n 为你本次实际判定的各级问题数，非格式范例）：
SEVERITY_SUMMARY: P0=<n> P1=<n> P2=<n>

${DIFF_CONTENT}"
    AGY_OUTPUT=$("$AGY_BIN" -p "$AGY_PROMPT" --model "$AGY_REVIEW_MODEL" --print-timeout "${AGY_PRINT_TIMEOUT:-5m}" </dev/null 2>&1)
    AGY_STATUS=$?
    if [ $AGY_STATUS -eq 0 ] && [ -n "$AGY_OUTPUT" ]; then
      OUTPUT="$AGY_OUTPUT"
      REVIEWER="agy-gemini"
      if [ "$MODE" = "codex-quota-exhausted" ] || [ "$SKIP_CODEX" = "1" ]; then
        MODE="fallback-to-agy"
      else
        MODE="agy-only"
      fi
      STATUS=0
    else
      MODE="${MODE:+${MODE}+}agy-failed"
    fi
  fi

  # 5b. Fallback 到 Claude
  if [ -z "$REVIEWER" ] && [ "$HAS_CLAUDE" = "1" ]; then
    PROMPT="按手册 §10.5 八维评审 commit ${SHORT_SHA} 的改动。先用 Bash 跑 'git show ${SHA}' 看 diff，再按八维（架构/代码质量/性能/安全/测试/DX/功能/UX）逐条 ✅⚠️🔴 + 行号。仅输出 markdown 报告，不修改任何文件。报告最后单独一行输出机器可解析的严重度汇总（n 为你实际判定的各级问题数）：SEVERITY_SUMMARY: P0=<n> P1=<n> P2=<n>"
    CLAUDE_OUTPUT=$(claude -p "$PROMPT" --max-turns 5 2>&1)
    CLAUDE_STATUS=$?
    if [ $CLAUDE_STATUS -eq 0 ]; then
      OUTPUT="$CLAUDE_OUTPUT"
      REVIEWER="claude-fallback-opus"
      # v4.4d FIX4: codex/agy **真报错**也算 fallback（不只配额）——旧逻辑只认 quota/SKIP，
      # codex-failed / agy-failed 一律落 claude-only → PR comment 输出"codex 未装"假诊断掩盖复发 bug。
      # 放宽判定：MODE 含 codex-quota-exhausted / codex-failed / agy-failed 或 SKIP_CODEX=1 → fallback-to-claude。
      # 保留原始失败链到 FAIL_CHAIN（另存变量，不污染 MODE，避免破坏下游 [ "$MODE" = "fallback-to-claude" ] 等值判定）。
      if echo "$MODE" | grep -qE "codex-quota-exhausted|codex-failed|agy-failed" || [ "$SKIP_CODEX" = "1" ]; then
        FAIL_CHAIN="$MODE"
        MODE="fallback-to-claude"
      else
        MODE="claude-only"   # 真·从未试 codex/agy（都未装/未登录）—— 唯一诚实的 claude-only
      fi
      STATUS=0
    else
      MODE="${MODE}+claude-failed"
    fi
  fi

  # 6. 写 review（仅成功）—— v4.4c 防膨胀：全文 → reviews/<sha>.md（lineage 保全），
  #    REVIEW-QUEUE.md 只留摘要 + 严重度计数 + 指针（原实现每次 append 全量八维报告，
  #    单 PR 曾 +2683 行 → 341KB，SessionStart 注入/人工审阅/pattern-detector 扫描全受累）。
  if [ $STATUS -eq 0 ] && [ -n "$OUTPUT" ]; then
    mkdir -p docs/ai-cto/reviews
    REVIEW_FILE="docs/ai-cto/reviews/${SHORT_SHA}.md"
    {
      echo "# §48 跨模型 Review — $SHORT_SHA"
      echo "**$TS** · Reviewer: $REVIEWER · Mode: $MODE"
      echo ""
      echo "$OUTPUT"
    } > "$REVIEW_FILE"
    git add "$REVIEW_FILE" 2>/dev/null || true   # v4.4d FIX2: 入 git，否则 reviews/<sha>.md 永远 untracked → Sakana lineage 断链（软失败，非 git 仓/无权限不阻断）
    # 严重度计数（v4.4d FIX1 反污染）：从 reviewer 输出的机器可解析 SEVERITY_SUMMARY 行解析，
    # **不再扫全文 emoji** —— 旧 bug：codex transcript 把 SKILL.md/handbook 里的 ✅⚠️🔴 格式范例原样回显，
    # 全文 grep 计出 🔴51 等虚高危（29b4932 实证：写 🔴51/🟠43/🟡42，codex 真结论仅 4×P1+12×P2 零 Critical）。
    # 取**最后一条** SEVERITY_SUMMARY（reviewer 终判，非文中范例）。
    SEV_LINE=$(printf '%s' "$OUTPUT" | grep -oE 'SEVERITY_SUMMARY:[[:space:]]*P0=[0-9]+[[:space:]]+P1=[0-9]+[[:space:]]+P2=[0-9]+' | tail -1)
    if [ -n "$SEV_LINE" ]; then
      # sed 捕获组只取 =后的值（不能用 grep -oE '[0-9]+'：会连 P0/P1/P2 标签里的 0/1/2 一起抓 → 多行污染）
      R_CRIT=$(printf '%s' "$SEV_LINE" | sed -nE 's/.*P0=([0-9]+).*/\1/p')   # P0→🔴
      R_MAJ=$(printf '%s' "$SEV_LINE" | sed -nE 's/.*P1=([0-9]+).*/\1/p')    # P1→🟠
      R_MIN=$(printf '%s' "$SEV_LINE" | sed -nE 's/.*P2=([0-9]+).*/\1/p')    # P2→🟡
      SEV_NOTE=""
    else
      # 缺行（codex 主路径用自带 rubric / reviewer 没照做）：诚实标"未知"，绝不回退扫全文 emoji（那正是污染源）
      R_CRIT="?"; R_MAJ="?"; R_MIN="?"; SEV_NOTE="（见全文）"
    fi
    {
      echo ""
      echo "## $TS — Review for $SHORT_SHA"
      echo "**Reviewer**: $REVIEWER | **Mode**: $MODE | **判定**: 🔴 ${R_CRIT} / 🟠 ${R_MAJ} / 🟡 ${R_MIN}${SEV_NOTE}"
      if [ "$MODE" = "fallback-to-claude" ]; then
        echo "> ⚠️ 跨模型补位链未成功（\`${FAIL_CHAIN:-codex 不可用}\`），本次由 Claude 自审补位。**失去跨模型价值**（Claude 自审有相同认知偏差）。若 failchain 非额度耗尽，可能是复发 bug 需排查。"
      elif [ "$MODE" = "fallback-to-agy" ] || [ "$MODE" = "agy-only" ]; then
        echo "> ℹ️ 本次由 Antigravity CLI（Gemini）补位完成。**跨模型价值保留**（Gemini ≠ GPT ≠ Claude）。"
      fi
      echo "全文 → [reviews/${SHORT_SHA}.md](reviews/${SHORT_SHA}.md)（Sakana lineage 保全；pattern-detector / cto-evolve 扫 reviews/ 目录）"
      echo ""
      echo "---"
    } >> docs/ai-cto/REVIEW-QUEUE.md
    echo "$TS | sha=${SHORT_SHA} | mode=$MODE | reviewer=$REVIEWER | bytes=${#OUTPUT}${FAIL_CHAIN:+ | failchain=$FAIL_CHAIN}" \
      >> docs/ai-cto/CODEX-REVIEW-LOG.md

    # v3.10.1 fix: 计量回写 .evolve-cost-month.json（飞轮发现 cost counter 死）
    # v4.4: 仅 codex 主路径入账 codex_token_cents —— agy/claude 补位不烧 codex 配额，
    #       混入会虚增月度 cost cap（宪法 $20/月）触发过早降级。
    COST_FILE="docs/ai-cto/.evolve-cost-month.json"
    # v4.5: 前缀匹配（codex-*）替代精确模型名 —— 模型升级只改上面的赋值，不再 4 处联动
    if [ "$REVIEWER" != "${REVIEWER#codex-}" ]; then
      # v4.4d FIX3: bootstrap 计量文件 —— 主工作区 .gitignore 排除该文件 → 从不存在 →
      # 旧 `[ -f "$COST_FILE" ]` 守卫使写回从不触发 → cost cap（宪法 $20/月）静默失效 32+ 天。
      # 缺则先建当月零账本（放 codex reviewer 分支内，非 codex 路径不建 —— 它们不烧 codex 配额）。
      [ -f "$COST_FILE" ] || printf '{"month":"%s","codex_token_cents":0,"cap_cents":2000,"reviews_count":0,"exceeded":false,"schema":"v3.10.1"}\n' "$(date +%Y-%m 2>/dev/null || echo unknown)" > "$COST_FILE"
      MONTH=$(date +%Y-%m 2>/dev/null || echo unknown)
      # bytes → cents: 估算 $0.01/KB（gpt-5.6 Sol output $30/M token ≈ $0.0075/KB @4字节/token，取整保守）
      ADD_CENTS=$(( ${#OUTPUT} / 100 ))
      [ "$ADD_CENTS" -lt 1 ] && ADD_CENTS=1  # 至少 1 cent/次

      # 读现状（用 sed，避免 jq 依赖）— 月度 reset 检查
      CUR_MONTH=$(sed -nE 's/.*"month"[[:space:]]*:[[:space:]]*"([^"]*)".*/\1/p' "$COST_FILE" | head -1)
      if [ "$CUR_MONTH" != "$MONTH" ]; then
        # 月份变了 → reset
        printf '{"month":"%s","codex_token_cents":%d,"cap_cents":2000,"reviews_count":1,"exceeded":false,"schema":"v3.10.1"}\n' \
          "$MONTH" "$ADD_CENTS" > "$COST_FILE"
      else
        CUR_CENTS=$(sed -nE 's/.*"codex_token_cents"[[:space:]]*:[[:space:]]*([0-9]+).*/\1/p' "$COST_FILE" | head -1)
        CUR_COUNT=$(sed -nE 's/.*"reviews_count"[[:space:]]*:[[:space:]]*([0-9]+).*/\1/p' "$COST_FILE" | head -1)
        CAP=$(sed -nE 's/.*"cap_cents"[[:space:]]*:[[:space:]]*([0-9]+).*/\1/p' "$COST_FILE" | head -1)
        NEW_CENTS=$((${CUR_CENTS:-0} + ADD_CENTS))
        NEW_COUNT=$((${CUR_COUNT:-0} + 1))
        EXCEEDED=$([ "$NEW_CENTS" -gt "${CAP:-2000}" ] && echo true || echo false)
        printf '{"month":"%s","codex_token_cents":%d,"cap_cents":%d,"reviews_count":%d,"exceeded":%s,"schema":"v3.10.1"}\n' \
          "$MONTH" "$NEW_CENTS" "${CAP:-2000}" "$NEW_COUNT" "$EXCEEDED" > "$COST_FILE"
      fi
    fi
  else
    echo "$TS | sha=${SHORT_SHA} | mode=${MODE:-no-reviewer-available} | reviewer=none" \
      >> docs/ai-cto/CODEX-REVIEW-LOG.md
    exit 0  # 没 review 结果 → 后续 PR 同步无意义
  fi

  # ============================================================
  # 7. 🆕 PR autopilot — 不需要 reviewer 介入也能自动跑
  # ============================================================
  # 触发条件（全部满足）：
  #   - gh CLI 可用 + gh auth 已登录
  #   - 当前 branch 非 main/master
  #   - 至少有 1 个 commit ahead of base
  # 行为：
  #   - 若无 open PR → 自动 push + gh pr create（auto-generated title/body）
  #   - 若有 open PR → 跳过创建
  #   - 用 sha marker 防止重复 comment
  # 关闭：在 settings.local.json 关闭 Stop hook，或设 NO_PR_AUTOPILOT=1
  if [ "$HAS_GH" = "1" ] && [ "${NO_PR_AUTOPILOT:-0}" != "1" ]; then
    BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null)
    if [ -n "$BRANCH" ] && [ "$BRANCH" != "main" ] && [ "$BRANCH" != "master" ] && [ "$BRANCH" != "HEAD" ]; then

      # 7a. 检测 PR 是否存在
      PR_NUMBER=$(gh pr view --json number -q .number 2>/dev/null)

      # 7b. 不存在则自动开 PR（先 push）
      if [ -z "$PR_NUMBER" ]; then
        # 推 branch（首次或更新）
        git push -u origin "$BRANCH" 2>&1 | tail -3 >> docs/ai-cto/CODEX-REVIEW-LOG.md

        # 自动生成 title（从最近 commit message）+ body（从最近 commits）
        AUTO_TITLE=$(git log -1 --format=%s)
        AUTO_BODY=$(printf "## Summary\n\n%s\n\n## Recent commits\n\n%s\n\n---\n\n_由 codex-bridge autopilot 自动开启。codex review 见下方 comment。_" \
          "$(git log -1 --format=%b | head -20)" \
          "$(git log --format='- %h %s' main..HEAD 2>/dev/null | head -10 || git log --format='- %h %s' HEAD~5..HEAD)")

        gh pr create --title "$AUTO_TITLE" --body "$AUTO_BODY" 2>&1 | tail -3 >> docs/ai-cto/CODEX-REVIEW-LOG.md
        PR_NUMBER=$(gh pr view --json number -q .number 2>/dev/null)
        if [ -n "$PR_NUMBER" ]; then
          echo "$TS | sha=${SHORT_SHA} | mode=pr-autopilot-created | pr=#${PR_NUMBER}" \
            >> docs/ai-cto/CODEX-REVIEW-LOG.md
        fi
      fi

      # 7c. 同步 review 到 PR comment（按 sha 去重，v3.8 加调试日志）
      if [ -n "$PR_NUMBER" ]; then
        MARKER="<!-- codex-bridge:${SHORT_SHA} -->"
        echo "$TS | sha=${SHORT_SHA} | step=pr-comment-check | pr=#${PR_NUMBER} | marker=$MARKER" \
          >> docs/ai-cto/CODEX-REVIEW-LOG.md

        # 查重：用 gh api 看 comments，找 marker
        # 注意：grep -c 返回非零时 || echo 0 兜底
        EXISTING=$(gh api "repos/{owner}/{repo}/issues/${PR_NUMBER}/comments" --jq ".[].body" 2>/dev/null | grep -c "$MARKER" 2>/dev/null)
        EXISTING="${EXISTING:-0}"
        echo "$TS | sha=${SHORT_SHA} | step=existing-check | found=$EXISTING" \
          >> docs/ai-cto/CODEX-REVIEW-LOG.md

        if [ "$EXISTING" = "0" ]; then
          # 写到临时文件再 post（避免 stdin pipe 在 disown 后台环境下失效）
          COMMENT_FILE="/tmp/codex-comment-${SHORT_SHA}.md"
          {
            echo "$MARKER"
            echo "## 🤖 Codex Cross-Model Review (\`$SHORT_SHA\`)"
            echo ""
            echo "**Reviewer**: \`$REVIEWER\` | **Mode**: \`$MODE\` | $TS"
            if [ "$MODE" = "fallback-to-claude" ]; then
              echo ""
              echo "> ⚠️ codex/agy 均报错（\`${FAIL_CHAIN:-codex 不可用}\`），本次由 Claude 补位。失去跨模型价值（同模型自审）；若非额度耗尽，可能是复发问题需排查。"
            elif [ "$MODE" = "fallback-to-agy" ] || [ "$MODE" = "agy-only" ]; then
              echo ""
              echo "> ℹ️ 本次由 Antigravity CLI（Gemini）补位完成。跨模型价值保留（Gemini ≠ GPT ≠ Claude）。"
            elif [ "$MODE" = "claude-only" ]; then
              echo ""
              echo "> ℹ️ codex 未装/未登录（从未尝试 codex/agy），本次由 Claude 完成。"
            fi
            echo ""
            echo "$OUTPUT"
            echo ""
            echo "---"
            echo "_由 \`.agents/skills/codex-bridge/run.sh\` 本地跑（订阅 auth），非 CI。autopilot 自动同步。_"
          } > "$COMMENT_FILE"

          # 用文件路径调 gh pr comment（更稳定）
          POST_OUT=$(gh pr comment "$PR_NUMBER" --body-file "$COMMENT_FILE" 2>&1)
          POST_STATUS=$?

          echo "$TS | sha=${SHORT_SHA} | step=pr-comment-post | status=$POST_STATUS | out=$(echo "$POST_OUT" | tr '\n' ' ' | head -c 200)" \
            >> docs/ai-cto/CODEX-REVIEW-LOG.md

          if [ $POST_STATUS -eq 0 ]; then
            echo "$TS | sha=${SHORT_SHA} | mode=pr-comment-posted | pr=#${PR_NUMBER}" \
              >> docs/ai-cto/CODEX-REVIEW-LOG.md
            rm -f "$COMMENT_FILE"
          else
            # 失败保留临时文件供人工排查
            echo "$TS | sha=${SHORT_SHA} | mode=pr-comment-failed | file=$COMMENT_FILE" \
              >> docs/ai-cto/CODEX-REVIEW-LOG.md
          fi
        fi
      fi
    fi
  fi
} &

disown 2>/dev/null
exit 0
