/**
 * redactGeometry —— 遮盖编辑器的**纯**几何层（无 DOM 写入、无 React、无网络）
 *
 * SPEC: docs/specs/ai-chat-image-input.md §3.1 / R1 陷阱 4 / R6
 *
 * ⚠️ 单一坐标空间（本轮最重要的设计决定）
 * 编辑器全程只用**一个**坐标空间：**已摆正整幅图的归一化比例 [0,1]**。
 * crop 和所有遮盖框都存在这个空间里。R1 陷阱 4（「黑框坐标在 CSS 显示像素空间算出，
 * 却画到原分辨率 canvas 上」）的根因是**存在两个空间可供混用** —— 所以：
 *
 *   - 交互层：pointToUnit() 是 CSS 像素唯一的入口，出来就是归一化，之后再不碰像素
 *   - 显示层：舞台永远显示**整幅图**，矩形用 CSS 百分比定位（% 天生就是归一化，零换算）
 *   - 导出层：`toCropSpace()` 是全图空间 → 裁剪空间的**唯一**一次转换，只在导出前调用一次
 *
 * 为什么导出还要转一次：`exportRedacted()` 的 redactions 是相对**裁剪后输出画布**归一化的
 * （见 exportRedacted.ts 里 `r.x * outW`，outW 已经是 crop 之后的宽）。编辑器不把这个
 * 语义泄漏到交互层，代价就是这一个函数 —— 它有单元级的自明性，比"两套坐标散在 UI 各处"
 * 安全得多。
 */

import type { RedactRect } from './exportRedacted';

/** 遮盖框/裁剪框的最小边长（归一化）。太小的框既点不到，也没有遮盖意义。 */
export const MIN_RECT_SIDE = 0.02;
/** 裁剪框最小边长放大一档：裁得过窄等于把图废掉，且 R7 要求裁剪服务于「表格填满取景框」 */
export const MIN_CROP_SIDE = 0.1;

/** 整幅图（未裁剪）。crop 的默认值。 */
export const FULL_RECT: RedactRect = { x: 0, y: 0, w: 1, h: 1 };

export interface UnitPoint {
  x: number;
  y: number;
}

export type RectCorner = 'nw' | 'ne' | 'sw' | 'se';

export type RectEdge = 'x' | 'y' | 'w' | 'h';

function clampUnit(v: number): number {
  if (!Number.isFinite(v)) return 0;
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/** 归一化坐标保留 4 位小数：既够精确（2400px 长边上 1 单位 = 0.24px），又不带浮点尘。 */
function round4(v: number): number {
  return Math.round(v * 1e4) / 1e4;
}

/**
 * 把任意矩形夹进 [0,1] 且保证边长 ≥ minSide。
 * 顺序刻意是「先定宽高、再定起点」：这样 `x + w <= 1` 恒成立，
 * 不会撞上 exportRedacted 的 `x + w > 1.0000001` 断言。
 */
export function clampRect(r: RedactRect, minSide = MIN_RECT_SIDE): RedactRect {
  const w = Math.min(1, Math.max(minSide, round4(r.w)));
  const h = Math.min(1, Math.max(minSide, round4(r.h)));
  const x = Math.min(1 - w, Math.max(0, round4(r.x)));
  const y = Math.min(1 - h, Math.max(0, round4(r.y)));
  return { x, y, w, h };
}

/** 两点定矩形（拖拽新建 / 点击-再点击 / 拖角缩放共用）。点的先后顺序无所谓。 */
export function rectFromPoints(a: UnitPoint, b: UnitPoint, minSide = MIN_RECT_SIDE): RedactRect {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return clampRect({ x, y, w: Math.abs(b.x - a.x), h: Math.abs(b.y - a.y) }, minSide);
}

/** 平移（保持尺寸，撞边即停 —— 不允许边长被边界吃掉） */
export function moveRect(r: RedactRect, dx: number, dy: number): RedactRect {
  return {
    x: round4(Math.min(1 - r.w, Math.max(0, r.x + dx))),
    y: round4(Math.min(1 - r.h, Math.max(0, r.y + dy))),
    w: r.w,
    h: r.h,
  };
}

/** 拖某个角到 (nx, ny)，对角固定 */
export function resizeRectCorner(
  r: RedactRect,
  corner: RectCorner,
  nx: number,
  ny: number,
  minSide = MIN_RECT_SIDE,
): RedactRect {
  const west = corner === 'nw' || corner === 'sw';
  const north = corner === 'nw' || corner === 'ne';
  const ax = west ? clampUnit(nx) : r.x;
  const bx = west ? r.x + r.w : clampUnit(nx);
  const ay = north ? clampUnit(ny) : r.y;
  const by = north ? r.y + r.h : clampUnit(ny);
  return rectFromPoints({ x: ax, y: ay }, { x: bx, y: by }, minSide);
}

/**
 * 设单个边（左/上/宽/高）—— 四个 `<input type="range">` 的写入口（R6 / SC 2.5.7）。
 * 值域由调用方按 rangeBoundsFor() 给出，这里再夹一次兜底。
 */
export function setRectEdge(r: RedactRect, edge: RectEdge, value: number, minSide = MIN_RECT_SIDE): RedactRect {
  const v = round4(value);
  switch (edge) {
    case 'x':
      return { ...r, x: Math.min(1 - r.w, Math.max(0, v)) };
    case 'y':
      return { ...r, y: Math.min(1 - r.h, Math.max(0, v)) };
    case 'w':
      return { ...r, w: Math.min(1 - r.x, Math.max(minSide, v)) };
    case 'h':
      return { ...r, h: Math.min(1 - r.y, Math.max(minSide, v)) };
  }
}

/**
 * 某个 range 的 [min, max]（百分比整数域，step 0.5）。
 * 动态 max 而不是「固定 0–100 再在 handler 里夹」：`aria-valuemax` 必须说真话，
 * 否则读屏会播报一个到不了的上限（AT 语义错误比视觉错误更难被发现）。
 */
export function rangeBoundsFor(r: RedactRect, edge: RectEdge, minSide = MIN_RECT_SIDE): [number, number] {
  const min = minSide * 100;
  switch (edge) {
    case 'x':
      return [0, Math.max(0, round4(1 - r.w) * 100)];
    case 'y':
      return [0, Math.max(0, round4(1 - r.h) * 100)];
    case 'w':
      return [min, Math.max(min, round4(1 - r.x) * 100)];
    case 'h':
      return [min, Math.max(min, round4(1 - r.y) * 100)];
  }
}

/** CSS 像素 → 归一化。**整个编辑器里唯一读 getBoundingClientRect 的地方。** */
export function pointToUnit(host: HTMLElement, clientX: number, clientY: number): UnitPoint {
  const box = host.getBoundingClientRect();
  if (box.width <= 0 || box.height <= 0) return { x: 0, y: 0 };
  return {
    x: clampUnit((clientX - box.left) / box.width),
    y: clampUnit((clientY - box.top) / box.height),
  };
}

/**
 * 全图空间 → 裁剪空间。返回 null = 该框完全落在裁剪区外（输出图里根本没有这块内容）。
 *
 * 与裁剪边相交的框会被**裁到边界**：被切掉的那部分不在输出图里，所以这不是"少遮了"。
 * 这是本文件唯一需要正确性论证的函数，因此它保持极短且不做任何取整
 * （取整可能把 x+w 顶过 1，撞上导出管线的断言）。
 */
export function toCropSpace(r: RedactRect, crop: RedactRect): RedactRect | null {
  if (!(crop.w > 0 && crop.h > 0)) return null;
  const x0 = clampUnit((r.x - crop.x) / crop.w);
  const y0 = clampUnit((r.y - crop.y) / crop.h);
  const x1 = clampUnit((r.x + r.w - crop.x) / crop.w);
  const y1 = clampUnit((r.y + r.h - crop.y) / crop.h);
  const w = x1 - x0;
  const h = y1 - y0;
  if (!(w > 0 && h > 0)) return null;
  return { x: x0, y: y0, w, h };
}

export interface PreparedExportGeometry {
  crop: RedactRect;
  redactions: RedactRect[];
  /** 因完全落在裁剪区外而被丢弃的框数 —— UI 必须据此提示，不能静默丢 */
  dropped: number;
}

/** 导出前的唯一一次坐标转换。crop 用更大的 minSide。 */
export function prepareExportGeometry(rects: readonly RedactRect[], crop: RedactRect): PreparedExportGeometry {
  const safeCrop = clampRect(crop, MIN_CROP_SIDE);
  const redactions: RedactRect[] = [];
  let dropped = 0;
  for (const r of rects) {
    const mapped = toCropSpace(clampRect(r), safeCrop);
    if (mapped) redactions.push(mapped);
    else dropped += 1;
  }
  return { crop: safeCrop, redactions, dropped };
}

/** R6a-1 / §3.1：预置「遮盖顶部 N%」。视障用户唯一可靠的一键路径。 */
export function topBandRect(fraction: number): RedactRect {
  return clampRect({ x: 0, y: 0, w: 1, h: fraction });
}

/**
 * 显示用百分比串（整数或一位小数）。
 * ⚠️ 必须**先四舍五入再判整数**：`0.14 * 100 === 14.000000000000002`，
 * 直接 Number.isInteger 会判假 → 播报「左 14.0%」而 slider 显示 14，读屏与视觉不一致。
 */
export function pct(v: number): string {
  const n = Math.round(v * 1000) / 10;
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}
