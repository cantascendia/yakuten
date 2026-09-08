/**
 * 药物图鉴 v2 — 剂型示意图形状/路径数据
 * 对应 docs/specs/brand-library-v2.md §5.1 / §6（Pictogram 契约）。
 *
 * 全部几何都以 viewBox "0 0 120 90" 的用户单位表达；纯数据 + 纯函数，无副作用、无 DOM 依赖。
 * 视觉纪律：药典线描——单一线宽、精确、克制；不用渐变、不用 emoji。
 */

import type { BrandForm, TabletShape } from './types';

/* ─────────────────────────── 画布与常量 ─────────────────────────── */

/** 组件唯一的 viewBox（宽:高 = 120:90 = 4:3） */
export const VIEWBOX = { width: 120, height: 90 } as const;

/** 缺省主体色（中性纸白，非品牌色） */
export const NEUTRAL_BODY = '#EDE8E0';

/** 缺省液体色（安瓿/西林瓶/预填充注射器的油状溶液） */
export const NEUTRAL_LIQUID = '#F3E6B8';

/** 糖衣高光：白色 35% 透明 */
export const SUGAR_HIGHLIGHT_FILL = '#FFFFFF';
export const SUGAR_HIGHLIGHT_OPACITY = 0.35;

/** 小于该渲染宽度时隐藏细节层（刻度、雾滴、包装纹理、阴影…） */
export const DETAIL_MIN_SIZE = 48;

/** 小于该渲染宽度时不渲染压印文字（契约要求） */
export const IMPRINT_MIN_SIZE = 72;

/* ─────────────────────────── 几何描述类型 ─────────────────────────── */

export interface HighlightEllipse {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  /** 绕自身中心的旋转角（度，SVG 正角为顺时针） */
  rotate?: number;
}

export interface ShadowEllipse {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
}

/** 刻痕线的可用区域（横线 cx±halfW，竖线 cy±halfV） */
export interface ScoreBox {
  cx: number;
  cy: number;
  halfW: number;
  halfV: number;
}

/** 压印文字锚点 */
export interface ImprintAnchor {
  cx: number;
  cy: number;
  /** 可用横向宽度，用于推导字号 */
  maxWidth: number;
}

/** 单个构图的主体几何：主体轮廓 + 包衣/刻痕/压印/阴影的定位锚点 */
export interface ShapeGeometry {
  /** 主体轮廓 path 的 d */
  d: string;
  /** 主体视觉中心（film 包衣外环按此缩放） */
  cx: number;
  cy: number;
  /** 主体包围盒（film 外环偏移量与压印字号据此推导） */
  width: number;
  height: number;
  highlight: HighlightEllipse;
  imprint: ImprintAnchor;
  shadow: ShadowEllipse;
  /** 仅片剂声明：刻痕落点。未声明表示该剂型不渲染刻痕。 */
  score?: ScoreBox;
}

/* ─────────────────────────── 片剂：9 种形状 ─────────────────────────── */

export const TABLET_GEOMETRY: Record<TabletShape, ShapeGeometry> = {
  round: {
    d: 'M 39 42 A 21 21 0 1 0 81 42 A 21 21 0 1 0 39 42 Z',
    cx: 60,
    cy: 42,
    width: 42,
    height: 42,
    highlight: { cx: 51, cy: 33, rx: 11, ry: 5.5, rotate: -30 },
    imprint: { cx: 60, cy: 42, maxWidth: 30 },
    shadow: { cx: 60, cy: 72, rx: 20, ry: 3.2 },
    score: { cx: 60, cy: 42, halfW: 15, halfV: 15 },
  },
  oval: {
    d: 'M 35 42 A 25 17 0 1 0 85 42 A 25 17 0 1 0 35 42 Z',
    cx: 60,
    cy: 42,
    width: 50,
    height: 34,
    highlight: { cx: 51, cy: 34, rx: 12, ry: 5, rotate: -18 },
    imprint: { cx: 60, cy: 42, maxWidth: 36 },
    shadow: { cx: 60, cy: 68, rx: 23, ry: 3 },
    score: { cx: 60, cy: 42, halfW: 18, halfV: 12 },
  },
  oblong: {
    d: 'M 38 30 H 82 A 8 8 0 0 1 90 38 V 46 A 8 8 0 0 1 82 54 H 38 A 8 8 0 0 1 30 46 V 38 A 8 8 0 0 1 38 30 Z',
    cx: 60,
    cy: 42,
    width: 60,
    height: 24,
    highlight: { cx: 48, cy: 36, rx: 13, ry: 4, rotate: -6 },
    imprint: { cx: 60, cy: 42, maxWidth: 44 },
    shadow: { cx: 60, cy: 66, rx: 26, ry: 3 },
    score: { cx: 60, cy: 42, halfW: 22, halfV: 8 },
  },
  triangle: {
    d: 'M 64.4 27.9 L 78.6 53.2 Q 83 61 74 61 L 46 61 Q 37 61 41.4 53.2 L 55.6 27.9 Q 60 20 64.4 27.9 Z',
    cx: 60,
    cy: 47,
    width: 46,
    height: 41,
    highlight: { cx: 52, cy: 42, rx: 9, ry: 3.5, rotate: -61 },
    imprint: { cx: 60, cy: 48, maxWidth: 22 },
    shadow: { cx: 60, cy: 70, rx: 22, ry: 3 },
    score: { cx: 60, cy: 47, halfW: 12, halfV: 9 },
  },
  octagon: {
    d: 'M 80.3 50.4 L 68.4 62.3 L 51.6 62.3 L 39.7 50.4 L 39.7 33.6 L 51.6 21.7 L 68.4 21.7 L 80.3 33.6 Z',
    cx: 60,
    cy: 42,
    width: 40.6,
    height: 40.6,
    highlight: { cx: 51, cy: 33, rx: 10, ry: 4.5, rotate: -28 },
    imprint: { cx: 60, cy: 42, maxWidth: 30 },
    shadow: { cx: 60, cy: 70, rx: 20, ry: 3 },
    score: { cx: 60, cy: 42, halfW: 15, halfV: 15 },
  },
  apple: {
    // 苹果形（Proscar 型）：近圆的躯干 + 顶部一道浅凹，不是心形
    // 躯干 = r20 的圆（贝塞尔 k=0.5523），仅在顶部换成「双肩 + 浅凹」
    d: 'M 60 27 C 61.6 24.6 63 23.6 64.8 23.8 C 73 24.9 80 33 80 43 C 80 54.05 71.05 63 60 63 C 48.95 63 40 54.05 40 43 C 40 33 47 24.9 55.2 23.8 C 57 23.6 58.4 24.6 60 27 Z',
    cx: 60,
    cy: 43,
    width: 40,
    height: 40,
    highlight: { cx: 51, cy: 36, rx: 9, ry: 4, rotate: -30 },
    imprint: { cx: 60, cy: 44, maxWidth: 28 },
    shadow: { cx: 60, cy: 71, rx: 20, ry: 3 },
    score: { cx: 60, cy: 44, halfW: 14, halfV: 12 },
  },
  square: {
    d: 'M 46 22 H 74 A 6 6 0 0 1 80 28 V 56 A 6 6 0 0 1 74 62 H 46 A 6 6 0 0 1 40 56 V 28 A 6 6 0 0 1 46 22 Z',
    cx: 60,
    cy: 42,
    width: 40,
    height: 40,
    highlight: { cx: 50, cy: 32, rx: 10, ry: 4.5, rotate: -25 },
    imprint: { cx: 60, cy: 42, maxWidth: 30 },
    shadow: { cx: 60, cy: 70, rx: 20, ry: 3 },
    score: { cx: 60, cy: 42, halfW: 14, halfV: 14 },
  },
  diamond: {
    d: 'M 65.89 25.4 L 78.11 36.6 Q 84 42 78.11 47.4 L 65.89 58.6 Q 60 64 54.11 58.6 L 41.89 47.4 Q 36 42 41.89 36.6 L 54.11 25.4 Q 60 20 65.89 25.4 Z',
    cx: 60,
    cy: 42,
    width: 48,
    height: 44,
    highlight: { cx: 52, cy: 36, rx: 8, ry: 3.5, rotate: -42 },
    imprint: { cx: 60, cy: 42, maxWidth: 26 },
    shadow: { cx: 60, cy: 71, rx: 22, ry: 3 },
    score: { cx: 60, cy: 42, halfW: 14, halfV: 14 },
  },
  capsule: {
    d: 'M 41 29 H 79 A 13 13 0 0 1 79 55 H 41 A 13 13 0 0 1 41 29 Z',
    cx: 60,
    cy: 42,
    width: 64,
    height: 26,
    highlight: { cx: 47, cy: 35, rx: 14, ry: 4.5, rotate: -6 },
    imprint: { cx: 60, cy: 42, maxWidth: 46 },
    shadow: { cx: 60, cy: 68, rx: 27, ry: 3 },
    score: { cx: 60, cy: 42, halfW: 23, halfV: 9 },
  },
};

/** 片剂缺省形状（未给 shape 时） */
export const DEFAULT_TABLET_SHAPE: TabletShape = 'round';

/* ─────────────────────── 非片剂剂型：主体几何 ─────────────────────── */

export const FORM_GEOMETRY: Record<Exclude<BrandForm, 'tablet'>, ShapeGeometry> = {
  capsule: {
    d: 'M 40 30 H 80 A 14 14 0 0 1 80 58 H 40 A 14 14 0 0 1 40 30 Z',
    cx: 60,
    cy: 44,
    width: 68,
    height: 28,
    highlight: { cx: 46, cy: 37, rx: 12, ry: 4.5, rotate: -8 },
    imprint: { cx: 78, cy: 44, maxWidth: 24 },
    shadow: { cx: 60, cy: 72, rx: 30, ry: 3.2 },
  },
  softgel: {
    d: 'M 33 43 A 27 19 0 1 0 87 43 A 27 19 0 1 0 33 43 Z',
    cx: 60,
    cy: 43,
    width: 54,
    height: 38,
    highlight: { cx: 48, cy: 34, rx: 13, ry: 5.5, rotate: -18 },
    imprint: { cx: 60, cy: 44, maxWidth: 38 },
    shadow: { cx: 60, cy: 70, rx: 25, ry: 3 },
  },
  patch: {
    d: 'M 30 20 H 90 A 10 10 0 0 1 100 30 V 60 A 10 10 0 0 1 90 70 H 30 A 10 10 0 0 1 20 60 V 30 A 10 10 0 0 1 30 20 Z',
    cx: 60,
    cy: 45,
    width: 80,
    height: 50,
    highlight: { cx: 40, cy: 32, rx: 16, ry: 5, rotate: -8 },
    imprint: { cx: 60, cy: 45, maxWidth: 52 },
    shadow: { cx: 60, cy: 78, rx: 34, ry: 3 },
  },
  'gel-pump': {
    d: 'M 47 32 H 73 A 5 5 0 0 1 78 37 V 69 A 5 5 0 0 1 73 74 H 47 A 5 5 0 0 1 42 69 V 37 A 5 5 0 0 1 47 32 Z',
    cx: 60,
    cy: 53,
    width: 36,
    height: 42,
    highlight: { cx: 50, cy: 44, rx: 4, ry: 9, rotate: -4 },
    imprint: { cx: 60, cy: 56, maxWidth: 30 },
    shadow: { cx: 60, cy: 78, rx: 21, ry: 3 },
  },
  'gel-sachet': {
    d: 'M 31 16 H 89 A 3 3 0 0 1 92 19 V 71 A 3 3 0 0 1 89 74 H 31 A 3 3 0 0 1 28 71 V 19 A 3 3 0 0 1 31 16 Z',
    cx: 60,
    cy: 45,
    width: 64,
    height: 58,
    highlight: { cx: 41, cy: 40, rx: 5, ry: 11, rotate: -6 },
    imprint: { cx: 60, cy: 50, maxWidth: 46 },
    shadow: { cx: 60, cy: 79, rx: 29, ry: 3 },
  },
  spray: {
    d: 'M 50 30 H 70 A 4 4 0 0 1 74 34 V 70 A 4 4 0 0 1 70 74 H 50 A 4 4 0 0 1 46 70 V 34 A 4 4 0 0 1 50 30 Z',
    cx: 60,
    cy: 52,
    width: 28,
    height: 44,
    highlight: { cx: 52, cy: 44, rx: 3, ry: 10, rotate: -3 },
    imprint: { cx: 60, cy: 58, maxWidth: 22 },
    shadow: { cx: 60, cy: 78, rx: 17, ry: 3 },
  },
  ampoule: {
    d: 'M 48 40 C 48 34 56 33 56 28 V 21 A 4 4 0 0 1 64 21 V 28 C 64 33 72 34 72 40 V 70 A 4 4 0 0 1 68 74 H 52 A 4 4 0 0 1 48 70 Z',
    cx: 60,
    cy: 52,
    width: 24,
    height: 53,
    highlight: { cx: 52.5, cy: 52, rx: 2.6, ry: 9, rotate: -2 },
    imprint: { cx: 60, cy: 60, maxWidth: 19 },
    shadow: { cx: 60, cy: 78, rx: 15, ry: 3 },
  },
  vial: {
    d: 'M 42 41 C 42 34 52 33 52 27 V 24 H 68 V 27 C 68 33 78 34 78 41 V 69 A 5 5 0 0 1 73 74 H 47 A 5 5 0 0 1 42 69 Z',
    cx: 60,
    cy: 52,
    width: 36,
    height: 50,
    highlight: { cx: 49.5, cy: 52, rx: 3.4, ry: 9, rotate: -2 },
    imprint: { cx: 60, cy: 58, maxWidth: 30 },
    shadow: { cx: 60, cy: 78, rx: 21, ry: 3 },
  },
  'powder-vial': {
    d: 'M 42 41 C 42 34 52 33 52 27 V 24 H 68 V 27 C 68 33 78 34 78 41 V 69 A 5 5 0 0 1 73 74 H 47 A 5 5 0 0 1 42 69 Z',
    cx: 60,
    cy: 52,
    width: 36,
    height: 50,
    highlight: { cx: 49.5, cy: 48, rx: 3.4, ry: 8, rotate: -2 },
    imprint: { cx: 60, cy: 50, maxWidth: 30 },
    shadow: { cx: 60, cy: 78, rx: 21, ry: 3 },
  },
  'prefilled-syringe': {
    d: 'M 32 30 H 82 A 2 2 0 0 1 84 32 V 52 A 2 2 0 0 1 82 54 H 32 A 2 2 0 0 1 30 52 V 32 A 2 2 0 0 1 32 30 Z',
    cx: 57,
    cy: 42,
    width: 54,
    height: 24,
    highlight: { cx: 46, cy: 35, rx: 13, ry: 3.5, rotate: -3 },
    imprint: { cx: 57, cy: 42, maxWidth: 40 },
    shadow: { cx: 58, cy: 64, rx: 38, ry: 3 },
  },
  implant: {
    d: 'M 30 36 H 90 A 6 6 0 0 1 90 48 H 30 A 6 6 0 0 1 30 36 Z',
    cx: 60,
    cy: 42,
    width: 72,
    height: 12,
    highlight: { cx: 46, cy: 39.5, rx: 15, ry: 2.1, rotate: 0 },
    imprint: { cx: 60, cy: 42, maxWidth: 52 },
    shadow: { cx: 60, cy: 54, rx: 28, ry: 2.4 },
  },
  'nasal-spray': {
    d: 'M 48 40 H 72 A 4 4 0 0 1 76 44 V 70 A 4 4 0 0 1 72 74 H 48 A 4 4 0 0 1 44 70 V 44 A 4 4 0 0 1 48 40 Z',
    cx: 60,
    cy: 57,
    width: 32,
    height: 34,
    highlight: { cx: 51, cy: 56, rx: 3.6, ry: 8, rotate: -3 },
    imprint: { cx: 60, cy: 60, maxWidth: 26 },
    shadow: { cx: 60, cy: 78, rx: 19, ry: 3 },
  },
  pessary: {
    d: 'M 60 15 C 70 25 75 38 75 50 C 75 64 68 74 60 74 C 52 74 45 64 45 50 C 45 38 50 25 60 15 Z',
    cx: 60,
    cy: 48,
    width: 30,
    height: 59,
    highlight: { cx: 53, cy: 41, rx: 3.8, ry: 10, rotate: 8 },
    imprint: { cx: 60, cy: 56, maxWidth: 22 },
    shadow: { cx: 60, cy: 79, rx: 17, ry: 3 },
  },
};

/* ─────────────────────── 各剂型的细节层路径 ─────────────────────── */

/** 硬胶囊：先画帽下的体（次色），再画帽（主体色）盖住接缝 */
export const CAPSULE_PARTS = {
  /** 右半（体），被帽覆盖一小段 */
  body: 'M 56 58 H 80 A 14 14 0 0 0 80 30 H 56 Z',
  /** 左半（帽） */
  cap: 'M 62 30 H 40 A 14 14 0 0 0 40 58 H 62 Z',
  /** 体上的细环纹（识别用） */
  ring: 'M 66 32 V 56',
} as const;

/** 软胶囊：始终存在的封合线与底部反光 */
export const SOFTGEL_PARTS = {
  seam: 'M 35 46 C 46 49.5 74 49.5 85 46',
  gloss: 'M 42 33 C 47 28 56 26 63 27',
} as const;

/** 贴片：内层药库（虚线）+ 45° 衬纸角 */
export const PATCH_PARTS = {
  matrix:
    'M 35 29 H 85 A 6 6 0 0 1 91 35 V 55 A 6 6 0 0 1 85 61 H 35 A 6 6 0 0 1 29 55 V 35 A 6 6 0 0 1 35 29 Z',
  liner: 'M 100 48 V 60 A 10 10 0 0 1 90 70 H 78 Z',
  fold: 'M 78 70 L 100 48',
} as const;

/** 凝胶泵：泵头 + 出液嘴 + 标签带 */
export const GEL_PUMP_PARTS = {
  neck: 'M 54 24 H 66 V 32 H 54 Z',
  head: 'M 51 14 H 69 A 3 3 0 0 1 72 17 V 24 H 48 V 17 A 3 3 0 0 1 51 14 Z',
  nozzle: 'M 72 17 H 84 A 2.5 2.5 0 0 1 84 22 H 72 Z',
  label: 'M 42 50 H 78 M 42 62 H 78',
} as const;

/** 生成锯齿撕口线（纯函数，无副作用） */
export function zigzagPath(
  x1: number,
  x2: number,
  y: number,
  step: number,
  amp: number,
): string {
  const round = (n: number) => Math.round(n * 100) / 100;
  const parts: string[] = [`M ${round(x1)} ${round(y)}`];
  let x = x1;
  let up = true;
  while (x < x2 - 0.01) {
    const nx = Math.min(x + step, x2);
    parts.push(`L ${round(nx)} ${round(up ? y - amp : y + amp)}`);
    up = !up;
    x = nx;
  }
  return parts.join(' ');
}

/** 凝胶小袋：撕口锯齿 + 侧封线 + 撕口缺角 */
export const GEL_SACHET_PARTS = {
  tear: zigzagPath(28, 92, 28, 5.33, 2.4),
  seals: 'M 33 16 V 74 M 87 16 V 74',
  notch: 'M 92 25 L 88 28 L 92 31',
} as const;

/** 喷雾泵瓶：泵头 + 雾滴 */
export const SPRAY_PARTS = {
  neck: 'M 54 22 H 66 V 30 H 54 Z',
  actuator: 'M 51 12 H 69 A 2 2 0 0 1 71 14 V 22 H 49 V 14 A 2 2 0 0 1 51 12 Z',
  level: 'M 46 46 H 74',
  mist: [
    { cx: 78, cy: 9, r: 1.7 },
    { cx: 86, cy: 6, r: 1.2 },
    { cx: 85, cy: 14, r: 1.4 },
    { cx: 93, cy: 10, r: 1 },
  ],
} as const;

/** 鼻喷瓶：颈环 + 斜嘴（已按 28° 预旋转的显式路径，避免运行时 transform） */
export const NASAL_SPRAY_PARTS = {
  collar: 'M 51 32 H 69 V 40 H 51 Z',
  nozzle: 'M 55.7 31.18 L 66.03 11.76 A 6 6 0 0 1 76.63 17.4 L 66.3 36.82 Z',
  level: 'M 44 54 H 76',
  mist: [
    { cx: 84, cy: 11, r: 1.5 },
    { cx: 91, cy: 8, r: 1.1 },
    { cx: 89, cy: 16, r: 1.3 },
  ],
} as const;

/** 玻璃安瓿：液体 + 断点色环 */
export const AMPOULE_PARTS = {
  liquid: 'M 48 48 H 72 V 70 A 4 4 0 0 1 68 74 H 52 A 4 4 0 0 1 48 70 Z',
  breakRing: 'M 55.4 29.5 H 64.6',
  neckLine: 'M 56 24 H 64',
} as const;

/** 西林瓶：铝盖 + 压边纹 + 液体 / 冻干粉 */
export const VIAL_PARTS = {
  cap: 'M 49 12 H 71 A 2 2 0 0 1 73 14 V 22 A 2 2 0 0 1 71 24 H 49 A 2 2 0 0 1 47 22 V 14 A 2 2 0 0 1 49 12 Z',
  capRibs: 'M 53 14.5 V 21.5 M 58 14.5 V 21.5 M 63 14.5 V 21.5 M 68 14.5 V 21.5',
  liquid: 'M 42 50 H 78 V 69 A 5 5 0 0 1 73 74 H 47 A 5 5 0 0 1 42 69 Z',
  powder:
    'M 43 63 C 49 58 55 63 61 60 C 67 57 73 62 77 63 V 69 A 5 5 0 0 1 72 74 H 48 A 5 5 0 0 1 43 69 Z',
  /** 粉末堆的上表面：单独描一道细线，避免近白粉末在浅色玻璃里看不见 */
  powderSurface: 'M 43 63 C 49 58 55 63 61 60 C 67 57 73 62 77 63',
  powderMotes: [
    { cx: 52, cy: 55, r: 0.9 },
    { cx: 63, cy: 52, r: 0.8 },
    { cx: 70, cy: 56, r: 0.9 },
  ],
} as const;

/** 预填充注射器：拇指压板 → 推杆 → 指托 → 筒身/液体/刻度 → 鲁尔锥 → 针 */
export const SYRINGE_PARTS = {
  thumb: 'M 10 30 H 12 A 2 2 0 0 1 14 32 V 52 A 2 2 0 0 1 12 54 H 10 A 2 2 0 0 1 8 52 V 32 A 2 2 0 0 1 10 30 Z',
  rod: 'M 14 39.5 H 30 V 44.5 H 14 Z',
  flange:
    'M 28.5 24 H 30.5 A 1.5 1.5 0 0 1 32 25.5 V 58.5 A 1.5 1.5 0 0 1 30.5 60 H 28.5 A 1.5 1.5 0 0 1 27 58.5 V 25.5 A 1.5 1.5 0 0 1 28.5 24 Z',
  liquid: 'M 36 33 H 80 V 51 H 36 Z',
  graduations: 'M 44 30 V 35 M 52 30 V 34 M 60 30 V 35 M 68 30 V 34 M 76 30 V 35',
  luer: 'M 84 36 L 91 38.5 V 45.5 L 84 48 Z',
  needle: 'M 91 40.6 H 106 L 115 42 L 106 43.4 Z',
} as const;

/** 皮下植入棒：尺寸标注（尺寸感） */
export const IMPLANT_PARTS = {
  sheen: 'M 36 39.5 H 84',
  dimension: 'M 24 60 V 68 M 96 60 V 68 M 24 64 H 96',
  arrows: 'M 28 62 L 24 64 L 28 66 M 92 62 L 96 64 L 92 66',
} as const;

/* ─────────────────────────── 纯几何工具 ─────────────────────────── */

const r3 = (n: number) => Math.round(n * 1000) / 1000;

/**
 * 以 (cx, cy) 为中心的非等比缩放 transform 字符串。
 * 用于 film 包衣：在主体轮廓外套一圈等距（用户单位）的半透明描边。
 */
export function scaleAbout(cx: number, cy: number, kx: number, ky: number): string {
  return `translate(${r3(cx * (1 - kx))} ${r3(cy * (1 - ky))}) scale(${r3(kx)} ${r3(ky)})`;
}

/** film 包衣外环相对主体轮廓的外扩量（用户单位） */
export const FILM_RING_OFFSET = 2.5;

/**
 * 线宽：让描边在任何 size 下都约等于 2 个设备像素（下限 2、上限 4 用户单位），
 * 使 size=32 的小图标仍然清晰，size=120 时保持 stroke-width 2 的药典线描。
 */
export function strokeWidthFor(size: number): number {
  if (!Number.isFinite(size) || size <= 0) return 2;
  const raw = (2 * VIEWBOX.width) / size;
  return Math.round(Math.min(4, Math.max(2, raw)) * 100) / 100;
}

/** 压印字号：按锚点可用宽度与字符数推导，夹在 5–9 之间 */
export function imprintFontSize(text: string, maxWidth: number): number {
  const len = Math.max(text.length, 1);
  const fs = (maxWidth * 1.5) / len;
  return Math.round(Math.min(9, Math.max(5, fs)) * 10) / 10;
}

/* ─────────────────────────── 四语文案 ─────────────────────────── */

export interface FormLabel {
  zh: string;
  en: string;
  ja: string;
  ko: string;
}

export const FORM_LABELS: Record<BrandForm, FormLabel> = {
  tablet: { zh: '片剂', en: 'Tablet', ja: '錠剤', ko: '정제' },
  capsule: { zh: '胶囊', en: 'Capsule', ja: 'カプセル', ko: '캡슐' },
  softgel: { zh: '软胶囊', en: 'Softgel capsule', ja: 'ソフトカプセル', ko: '연질캡슐' },
  patch: { zh: '贴片', en: 'Transdermal patch', ja: '貼付剤', ko: '패치' },
  'gel-pump': { zh: '凝胶泵', en: 'Gel pump', ja: 'ジェルポンプ', ko: '젤 펌프' },
  'gel-sachet': { zh: '凝胶小袋', en: 'Gel sachet', ja: 'ジェル分包', ko: '젤 사셰' },
  spray: { zh: '喷雾', en: 'Transdermal spray', ja: 'スプレー', ko: '스프레이' },
  ampoule: { zh: '安瓿', en: 'Ampoule', ja: 'アンプル', ko: '앰플' },
  vial: { zh: '西林瓶', en: 'Vial', ja: 'バイアル', ko: '바이알' },
  'prefilled-syringe': {
    zh: '预填充注射器',
    en: 'Prefilled syringe',
    ja: 'プレフィルドシリンジ',
    ko: '프리필드 시린지',
  },
  implant: { zh: '皮下植入', en: 'Subdermal implant', ja: '皮下インプラント', ko: '피하 임플란트' },
  'nasal-spray': { zh: '鼻喷', en: 'Nasal spray', ja: '点鼻スプレー', ko: '비강 스프레이' },
  pessary: { zh: '阴道栓', en: 'Pessary', ja: '腟坐剤', ko: '질정' },
  'powder-vial': {
    zh: '冻干粉瓶',
    en: 'Lyophilised powder vial',
    ja: '凍結乾燥粉末バイアル',
    ko: '동결건조 분말 바이알',
  },
};

export const SHAPE_LABELS: Record<TabletShape, FormLabel> = {
  round: { zh: '圆形', en: 'Round', ja: '円形', ko: '원형' },
  oval: { zh: '椭圆形', en: 'Oval', ja: '楕円形', ko: '타원형' },
  oblong: { zh: '长圆形', en: 'Oblong', ja: '長円形', ko: '장방형' },
  triangle: { zh: '三角形', en: 'Triangle', ja: '三角形', ko: '삼각형' },
  octagon: { zh: '八角形', en: 'Octagon', ja: '八角形', ko: '팔각형' },
  apple: { zh: '苹果形', en: 'Apple-shaped', ja: 'りんご形', ko: '사과형' },
  square: { zh: '方形', en: 'Square', ja: '四角形', ko: '사각형' },
  diamond: { zh: '菱形', en: 'Diamond', ja: 'ひし形', ko: '마름모형' },
  capsule: { zh: '胶囊形', en: 'Capsule-shaped', ja: 'カプセル形', ko: '캡슐형' },
};
