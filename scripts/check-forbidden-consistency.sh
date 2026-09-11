#!/usr/bin/env bash
# 校验：scripts/forbidden-paths.txt 中的路径概念在手册 §32.1 中有体现
# 用途：v3.6 起防止 SSOT 漂移（hardcoded vs 手册）
# advisory 模式：warning 但不 exit 1（避免 CI 因小漂移阻塞）
set -e

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null)"
[ -z "$REPO_ROOT" ] && { echo "Not in a git repo"; exit 1; }
cd "$REPO_ROOT"

SSOT="scripts/forbidden-paths.txt"
HANDBOOK="playbook/handbook.md"

[ -f "$SSOT" ] || { echo "Missing $SSOT"; exit 1; }
[ -f "$HANDBOOK" ] || { echo "Missing $HANDBOOK"; exit 1; }

# 提取 §32.1 章节
SECTION=$(awk '/^### 32\.1/,/^### 32\.2/' "$HANDBOOK")

# 路径 → 中英同义词映射（脚本能匹配的关键词）
declare -A SYNONYMS=(
  ["auth"]="认证|auth|OAuth"
  ["crypto"]="加密|crypto|哈希|hash"
  ["payment"]="支付|payment|金额"
  ["billing"]="支付|billing|计费"
  ["secrets"]="secret|密钥|敏感"
  ["keys"]="密钥|key|API key"
  ["migration"]="数据库迁移|migration|DROP|ALTER"
  ["migrations"]="数据库迁移|migration"
  ["infra"]="Infrastructure|infra|资源"
  ["terraform"]="Terraform|terraform"
  ["ansible"]="Ansible|ansible|K8s"
  [".github/workflows"]="workflow|CI|GitHub Actions"
)

WARNINGS=0
PASSED=0
while IFS= read -r path; do
  [ -z "$path" ] && continue
  echo "$path" | grep -q '^#' && continue

  key=${path%/}
  pattern="${SYNONYMS[$key]:-$key}"

  if echo "$SECTION" | grep -qiE "$pattern"; then
    PASSED=$((PASSED + 1))
  else
    echo "warn: $path（同义词：$pattern）在 §32.1 中未匹配"
    WARNINGS=$((WARNINGS + 1))
  fi
done < "$SSOT"

echo ""
if [ $WARNINGS -eq 0 ]; then
  echo "OK: Forbidden SSOT 全部 ($PASSED) 路径在 §32.1 中有体现"
else
  echo "ADVISORY: $PASSED 项匹配 / $WARNINGS 项需在手册 §32.1 中补充说明"
  echo "（不阻断；建议下次手册更新时同步）"
fi

# advisory 模式：始终退出 0
exit 0
