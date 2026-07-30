#!/usr/bin/env bash
# 遮盖模块静态门禁（SPEC docs/specs/ai-chat-image-input.md §7.2 的第三层）
#
# 三层刻意冗余：
#   1. 运行时不变量（exportRedacted.ts 里的 assertRedactionInvariants）—— 抓已发生的 bug
#   2. 像素断言（tests/redact-privacy.spec.ts V1）              —— 抓行为回归
#   3. 本脚本                                                   —— 抓正要引入的 PR
#
# 为什么不是 ESLint 规则：仓库 `npm run lint` 当前是坏的（eslint 无 TS parser +
# Windows glob 引号），修它不属于本轮范围。grep 式门禁零依赖、跨平台、失败信息明确。
#
# 用法：npm run verify:redact   /   bash scripts/verify-redact-invariants.sh
set -uo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || echo .)"
DIR="$ROOT/src/components/interactive/redact"
EXPORTER="$DIR/exportRedacted.ts"
GUARD="$DIR/uploadGuard.ts"
HARNESS_DIR="$ROOT/src/pages/dev"
FAIL=0

ok()   { echo "✅ $1"; }
bad()  { echo "❌ $1"; FAIL=1; }

for f in "$EXPORTER" "$GUARD"; do
  if [ ! -f "$f" ]; then bad "缺文件：$f"; fi
done
[ "$FAIL" -eq 1 ] && exit 1

# ── 1. 禁止的构造（R1 六陷阱 + R7a/R7b） ───────────────────────────────────
# 说明：只匹配**代码构造**（赋值 / 调用 / 字面量）。整行注释（以 * // /* 开头）先剔除，
# 否则「绝不用 devicePixelRatio」这类讲解注释会自炸；行尾注释仍会被判定，这是刻意的。
codeonly() {
  grep -n '' "$1" | grep -vE '^[0-9]+:[[:space:]]*(\*|//|/\*)'
}

forbid() {
  local pattern="$1" why="$2" file="$3"
  local hits
  hits="$(codeonly "$file" | grep -E "$pattern" || true)"
  if [ -n "$hits" ]; then
    bad "$(basename "$file")：$why"
    echo "$hits" | sed 's/^/      /'
  else
    ok "$(basename "$file") 无 $why"
  fi
}

# globalAlpha 只允许出现在「与 1 比较」的断言里，禁止任何赋值
forbid 'globalAlpha[[:space:]]*=[^=]' 'globalAlpha 赋值（R1 陷阱 2：半透明可提对比度还原）' "$EXPORTER"
# 合成模式赋值一律禁（只允许读取比较 source-over）
forbid 'globalCompositeOperation[[:space:]]*=[^=]' 'globalCompositeOperation 赋值' "$EXPORTER"
# 带 alpha 的颜色写法
forbid 'rgba\(' 'rgba( 颜色（R1 陷阱 2）' "$EXPORTER"
forbid 'hsla\(' 'hsla( 颜色（R1 陷阱 2）' "$EXPORTER"
# 模糊 / 阴影 / 滤镜（R1 陷阱 3：Depix 对常见字体 70–90% 还原率）
forbid '\.filter[[:space:]]*=[^=]' 'ctx.filter 赋值（R1 陷阱 3）' "$EXPORTER"
forbid 'shadowBlur[[:space:]]*=[^=]' 'shadowBlur 赋值（R1 陷阱 3）' "$EXPORTER"
forbid '(blur|pixelat|mosaic)[[:space:]]*\(' '模糊/马赛克调用（R1 陷阱 3）' "$EXPORTER"
forbid "['\"\`](blur|saturate|opacity)\(" 'CSS 滤镜字符串（R1 陷阱 3）' "$EXPORTER"
# R1 陷阱 4：绝不混用 naturalWidth；R7a-2：绝不乘 devicePixelRatio
forbid 'naturalWidth|naturalHeight' 'naturalWidth/Height（R1 陷阱 4 的根因）' "$EXPORTER"
forbid 'devicePixelRatio' 'devicePixelRatio（R7a-2：乘了会静默导出全黑图）' "$EXPORTER"
# R2：导出源只走 createImageBitmap，全面禁用 <img> + drawImage
forbid "new Image\(|createElement\('img'|createElement\(\"img\"" '<img> 作为导出源（R2 / csswg-drafts#4666）' "$EXPORTER"
# R2 / R7b：不传 imageOrientation、不传 colorSpace
forbid 'imageOrientation[[:space:]]*:' 'imageOrientation 显式传值（R2：默认即 from-image）' "$EXPORTER"
forbid 'colorSpace[[:space:]]*:' 'colorSpace 传值（R7b：display-p3 = 广色域指纹）' "$EXPORTER"
# R7：只许 JPEG
forbid "image/(webp|png|avif)" '非 JPEG 输出类型（R7：Safari canvas 不能编码 WebP）' "$EXPORTER"

# ── 2. 必须存在的构造（防「悄悄删掉保护」） ─────────────────────────────
require() {
  local pattern="$1" why="$2" file="$3"
  if grep -qE "$pattern" "$file"; then
    ok "$(basename "$file") 保留 $why"
  else
    bad "$(basename "$file") 缺少 $why"
  fi
}

require "globalAlpha !== 1" '半透明不变量断言（§7.2）' "$EXPORTER"
require "globalCompositeOperation !== 'source-over'" 'source-over 不变量断言（§7.2）' "$EXPORTER"
require "fillStyle !== '#000000'" '纯黑不变量断言（§7.2）' "$EXPORTER"
require "shadowBlur !== 0" 'shadowBlur 不变量断言（§7.2）' "$EXPORTER"
require "16777216" '旧 iOS canvas 面积上限（R7a-1）' "$EXPORTER"
require "Math\.sqrt\(MAX_CANVAS_AREA_PX" '按面积开方降尺度（R7a-1）' "$EXPORTER"
require "resizeQuality: 'high'" '一步解码+降采样（R7a-3）' "$EXPORTER"
require "bitmap\.close\(\)" 'bitmap 释放（R7a-4）' "$EXPORTER"
require "canvas\.width = 0" 'canvas backing store 释放（R7a-4）' "$EXPORTER"
require "getImageData" '空白自检（R7a-5）' "$EXPORTER"
require "fillRect" '遮盖烧进像素（R1）' "$EXPORTER"
require "type !== OUT_MIME|type === OUT_MIME" 'blob.type 校验（R7）' "$EXPORTER"
require "0\.92" '自适应质量起点（R7）' "$EXPORTER"
require "WeakSet" 'brand 用 WeakSet 而非可伪造属性（R1a-1）' "$EXPORTER"

require "instanceof File" 'File 运行时拒收（R1a-1）' "$GUARD"
require "isRedactedBlob" 'brand 准入（R1a-2）' "$GUARD"
require "NO_ORIGINAL_FALLBACK" '禁止回落原图的写死条款（R1a-3）' "$GUARD"

# ── 3. 遮盖框必须外扩 4–8px（R1 陷阱 5） ───────────────────────────────
PAD="$(grep -oE 'DEFAULT_PAD_PX = [0-9]+' "$EXPORTER" | grep -oE '[0-9]+$' || echo 0)"
if [ "$PAD" -ge 4 ] && [ "$PAD" -le 8 ]; then
  ok "黑框外扩 ${PAD}px（R1 陷阱 5 要求 4–8）"
else
  bad "黑框外扩 ${PAD}px 不在 4–8 区间（R1 陷阱 5）"
fi

# ── 4. 兜底泄漏形态（R1a-3：最容易被当成健壮性改进写进来） ──────────────
FALLBACK_HITS=""
for f in "$EXPORTER" "$GUARD"; do
  h="$(codeonly "$f" | grep -E 'catch[^{]*\{[^}]*(= *file|send\(file|upload[A-Za-z]*\( *file)' || true)"
  [ -n "$h" ] && FALLBACK_HITS="$FALLBACK_HITS$(basename "$f"): $h"$'\n'
done
if [ -n "$FALLBACK_HITS" ]; then
  bad '出现「失败即用原 file」形态的兜底（R1a-3：宁可失败）'
  echo "$FALLBACK_HITS" | sed 's/^/      /'
else
  ok '无「canvas 失败就传原图」兜底（R1a-3）'
fi

# ── 5. dev 挂载页必须 DEV-guard，且不得进生产产物 ────────────────────────
# ⚠️ 必须**递归**：原版只扫 src/pages/dev 顶层，而 dev/editor/[view].astro 与
# dev/selftest/[view].astro 都在子目录里（`/dev/[harness]` 已占了单段动态路由，同深度
# 再加会撞，所以后来的 dev 页只能进子目录）。只扫顶层等于对它们完全失明。
if [ -d "$HARNESS_DIR" ]; then
  while IFS= read -r f; do
    [ -f "$f" ] || continue
    if grep -q 'import\.meta\.env\.DEV' "$f"; then
      ok "${f#"$ROOT/"} 有 DEV 守卫"
    else
      bad "${f#"$ROOT/"} 无 import.meta.env.DEV 守卫 —— 会进生产产物"
    fi
  done < <(find "$HARNESS_DIR" -type f -name '*.astro' | sort)
fi
if [ -d "$ROOT/dist" ]; then
  if [ -d "$ROOT/dist/dev" ]; then
    bad 'dist/dev 存在 —— 测试挂载页泄漏进生产产物'
  else
    ok 'dist/ 无 dev 挂载页 HTML'
  fi
  # 更阴的一种：HTML 没产出，但 Vite 把挂载页的 <script> 打成孤儿 chunk 塞进 _astro/
  # （第一版实测就是这样，所以挂载页改用 is:inline + 运行时 import）
  ASSET_HITS="$(find "$ROOT/dist" -iname '*harness*' 2>/dev/null || true)"
  GLOBAL_HITS="$(grep -rl '__ykRedact' "$ROOT/dist" 2>/dev/null || true)"
  if [ -n "$ASSET_HITS$GLOBAL_HITS" ]; then
    bad 'dist/ 里有挂载页脚本资产 / __ykRedact 全局'
    echo "$ASSET_HITS$GLOBAL_HITS" | sed 's/^/      /'
  else
    ok 'dist/ 无挂载页脚本资产'
  fi
fi

echo
if [ "$FAIL" -eq 0 ]; then
  echo "verify:redact PASS"
  exit 0
fi
echo "verify:redact FAIL"
exit 1
