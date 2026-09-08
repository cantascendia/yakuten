/**
 * 药物图鉴 v2 — 剂型示意图（Pictogram）
 *
 * 对应 docs/specs/brand-library-v2.md §5.1「药典鉴别图版」/ §6 组件契约。
 * 纯 inline SVG，零依赖、零副作用、SSR 安全（不触碰 window / document）。
 *
 * 视觉纪律（药典线描）：
 *  - 描边一律 currentColor（父级用 --bl-ink 控制），单一线宽，无渐变滥用；
 *  - 主体填充只用 props 传入的 hex，缺省用中性色，不硬编码任何品牌色；
 *  - 无 emoji、无卡通化、无外部字体、无 CSS 文件（样式全走 inline attribute）。
 *
 * 数据纪律：外观细节由数据驱动，缺省即「不画」，不猜测（spec §4 数据纪律 2）。
 */

import { useId } from 'react';
import type { JSX, SVGProps } from 'react';

import type { BrandForm, Coating, Score, TabletShape } from './types';
import {
  AMPOULE_PARTS,
  CAPSULE_PARTS,
  DEFAULT_TABLET_SHAPE,
  DETAIL_MIN_SIZE,
  FILM_RING_OFFSET,
  FORM_GEOMETRY,
  FORM_LABELS,
  GEL_PUMP_PARTS,
  GEL_SACHET_PARTS,
  IMPLANT_PARTS,
  IMPRINT_MIN_SIZE,
  NASAL_SPRAY_PARTS,
  NEUTRAL_BODY,
  NEUTRAL_LIQUID,
  PATCH_PARTS,
  SHAPE_LABELS,
  SOFTGEL_PARTS,
  SPRAY_PARTS,
  SUGAR_HIGHLIGHT_FILL,
  SUGAR_HIGHLIGHT_OPACITY,
  SYRINGE_PARTS,
  TABLET_GEOMETRY,
  VIAL_PARTS,
  VIEWBOX,
  imprintFontSize,
  scaleAbout,
  strokeWidthFor,
} from './pictogram-shapes';
import type { ShapeGeometry } from './pictogram-shapes';

export { FORM_LABELS, SHAPE_LABELS };
export type { FormLabel } from './pictogram-shapes';

/* ─────────────────────────── Props 契约 ─────────────────────────── */

export interface PictogramProps {
  /** 剂型（14 种），决定构图 */
  form: BrandForm;
  /** 片剂/胶囊形状（9 种）；非固体剂型忽略 */
  shape?: TabletShape;
  /** 主体色 hex；缺省用中性色 #EDE8E0 */
  color?: string;
  /** 次色（双色胶囊、贴片边缘、液体颜色等） */
  secondaryColor?: string;
  /** 包衣：sugar 糖衣高光 / film 薄膜衣外环 / none 无 */
  coating?: Coating;
  /** 刻痕：none / single 单横刻痕 / cross 十字刻痕（仅片剂构图渲染） */
  score?: Score;
  /** 压印文字，size < 72 时不渲染 */
  imprint?: string;
  /** 渲染宽度 px，默认 120；高度按 120:90 比例 */
  size?: number;
  /** <title> 无障碍文本；缺省用剂型英文名 */
  title?: string;
  className?: string;
}

/* ─────────────────────────── 组件 ─────────────────────────── */

export default function Pictogram({
  form,
  shape,
  color,
  secondaryColor,
  coating = 'none',
  score = 'none',
  imprint,
  size = 120,
  title,
  className,
}: PictogramProps): JSX.Element {
  const uid = useId();
  const titleId = `bl-pictogram-${uid}`;

  const width = Number.isFinite(size) && size > 0 ? size : 120;
  const height = width * (VIEWBOX.height / VIEWBOX.width);
  const sw = strokeWidthFor(width);
  const detail = width >= DETAIL_MIN_SIZE;

  const geo: ShapeGeometry =
    (form === 'tablet'
      ? TABLET_GEOMETRY[shape ?? DEFAULT_TABLET_SHAPE]
      : FORM_GEOMETRY[form]) ?? TABLET_GEOMETRY[DEFAULT_TABLET_SHAPE];

  /* 颜色：只有 props + 中性缺省，无任何硬编码品牌色 */
  const bodyFill = color ?? NEUTRAL_BODY;
  /** 双色胶囊的另一半：未给次色则单色（不猜测） */
  const secondFill = secondaryColor ?? bodyFill;
  /** 安瓿 / 西林瓶 / 预填充注射器内的液体 */
  const liquidFill = secondaryColor ?? NEUTRAL_LIQUID;
  /** 五金件（泵头、铝盖、推杆、衬纸角…）：给了次色用次色，否则用中性的 currentColor 淡染 */
  const hardwareFill = secondaryColor ?? 'currentColor';
  const hardwareOpacity = secondaryColor ? 1 : 0.16;

  /* 描边样式：单一线宽的药典线描 */
  const outline: SVGProps<SVGPathElement> = {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: sw,
    strokeLinejoin: 'round',
    strokeLinecap: 'round',
  };
  const hair: SVGProps<SVGPathElement> = {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: round2(sw * 0.62),
    strokeLinejoin: 'round',
    strokeLinecap: 'round',
    strokeOpacity: 0.55,
  };

  const artwork = renderArtwork({
    form,
    geo,
    detail,
    sw,
    outline,
    hair,
    bodyFill,
    secondFill,
    liquidFill,
    hardwareFill,
    hardwareOpacity,
  });

  /* 包衣：sugar = 白色 35% 柔和高光；film = 主体轮廓外一圈半透明细描边。软胶囊天生有反光。 */
  const showHighlight = coating === 'sugar' || form === 'softgel';
  const filmRing =
    coating === 'film' ? (
      <path
        d={geo.d}
        fill="none"
        stroke="currentColor"
        strokeOpacity={0.4}
        strokeWidth={1}
        transform={scaleAbout(
          geo.cx,
          geo.cy,
          1 + (2 * FILM_RING_OFFSET) / geo.width,
          1 + (2 * FILM_RING_OFFSET) / geo.height,
        )}
        vectorEffect="non-scaling-stroke"
      />
    ) : null;

  /* 刻痕：只有片剂构图声明了 score box（其余剂型无刻痕概念） */
  const sc = geo.score;
  const scored = score !== 'none' && sc !== undefined && detail;

  /* 压印：size < 72 不渲染（契约） */
  const imprintText = (imprint ?? '').trim().slice(0, 10);
  const showImprint = width >= IMPRINT_MIN_SIZE && imprintText.length > 0;
  const imprintY = scored ? geo.imprint.cy - geo.height * 0.2 : geo.imprint.cy;

  const label = title ?? FORM_LABELS[form]?.en ?? FORM_LABELS.tablet.en;

  return (
    <svg
      viewBox={`0 0 ${VIEWBOX.width} ${VIEWBOX.height}`}
      width={width}
      height={height}
      role="img"
      aria-labelledby={titleId}
      className={className}
    >
      <title id={titleId}>{label}</title>

      {detail && (
        <ellipse
          cx={geo.shadow.cx}
          cy={geo.shadow.cy}
          rx={geo.shadow.rx}
          ry={geo.shadow.ry}
          fill="currentColor"
          opacity={0.1}
        />
      )}

      {artwork}

      {showHighlight && (
        <ellipse
          cx={geo.highlight.cx}
          cy={geo.highlight.cy}
          rx={geo.highlight.rx}
          ry={geo.highlight.ry}
          transform={
            geo.highlight.rotate
              ? `rotate(${geo.highlight.rotate} ${geo.highlight.cx} ${geo.highlight.cy})`
              : undefined
          }
          fill={SUGAR_HIGHLIGHT_FILL}
          opacity={SUGAR_HIGHLIGHT_OPACITY}
        />
      )}

      {filmRing}

      {scored && sc && (
        <path
          d={
            score === 'cross'
              ? `M ${sc.cx - sc.halfW} ${sc.cy} H ${sc.cx + sc.halfW} M ${sc.cx} ${sc.cy - sc.halfV} V ${sc.cy + sc.halfV}`
              : `M ${sc.cx - sc.halfW} ${sc.cy} H ${sc.cx + sc.halfW}`
          }
          fill="none"
          stroke="currentColor"
          strokeOpacity={0.4}
          strokeWidth={round2(sw * 0.9)}
          strokeLinecap="round"
        />
      )}

      {showImprint && (
        <text
          x={geo.imprint.cx}
          y={imprintY}
          textAnchor="middle"
          dominantBaseline="central"
          fill="currentColor"
          fillOpacity={0.6}
          fontSize={imprintFontSize(imprintText, geo.imprint.maxWidth)}
          style={{
            fontFamily: 'var(--bl-num, ui-monospace, SFMono-Regular, Menlo, monospace)',
            letterSpacing: '0.06em',
          }}
        >
          {imprintText}
        </text>
      )}
    </svg>
  );
}

/* ─────────────────────────── 各剂型构图 ─────────────────────────── */

interface ArtworkContext {
  form: BrandForm;
  geo: ShapeGeometry;
  detail: boolean;
  sw: number;
  outline: SVGProps<SVGPathElement>;
  hair: SVGProps<SVGPathElement>;
  bodyFill: string;
  secondFill: string;
  liquidFill: string;
  hardwareFill: string;
  hardwareOpacity: number;
}

function renderArtwork(ctx: ArtworkContext): JSX.Element {
  const {
    form,
    geo,
    detail,
    sw,
    outline,
    hair,
    bodyFill,
    secondFill,
    liquidFill,
    hardwareFill,
    hardwareOpacity,
  } = ctx;

  /** 五金件（泵头 / 铝盖 / 推杆 / 衬纸角）统一样式 */
  const hardware = (d: string, key: string) => (
    <path key={key} d={d} {...outline} fill={hardwareFill} fillOpacity={hardwareOpacity} />
  );

  switch (form) {
    /* 片剂：正面主体（阴影/高光/刻痕/压印由组件层统一叠加） */
    case 'tablet':
      return <path d={geo.d} {...outline} fill={bodyFill} />;

    /* 硬胶囊：水平放置，先画体（次色）再盖帽（主体色），帽的右缘即接缝 */
    case 'capsule':
      return (
        <>
          <path d={CAPSULE_PARTS.body} {...outline} fill={secondFill} />
          <path d={CAPSULE_PARTS.cap} {...outline} fill={bodyFill} />
          {detail && <path d={CAPSULE_PARTS.ring} {...hair} strokeOpacity={0.35} />}
        </>
      );

    /* 软胶囊：椭圆本体（略透明）+ 封合线 + 反光（高光在组件层统一渲染） */
    case 'softgel':
      return (
        <>
          <path d={geo.d} {...outline} fill={bodyFill} fillOpacity={0.92} />
          {detail && (
            <>
              <path d={SOFTGEL_PARTS.seam} {...hair} strokeOpacity={0.4} />
              <path
                d={SOFTGEL_PARTS.gloss}
                {...hair}
                stroke={SUGAR_HIGHLIGHT_FILL}
                strokeOpacity={0.45}
              />
            </>
          )}
        </>
      );

    /* 贴片：半透明圆角矩形 + 虚线药库层 + 45° 衬纸角 */
    case 'patch':
      return (
        <>
          <path d={geo.d} {...outline} fill={bodyFill} fillOpacity={0.28} />
          {detail && (
            <path
              d={PATCH_PARTS.matrix}
              fill="none"
              stroke={hardwareFill}
              strokeOpacity={hardwareOpacity === 1 ? 0.85 : 0.45}
              strokeWidth={round2(sw * 0.6)}
              strokeDasharray={`${round2(sw * 1.7)} ${round2(sw * 1.4)}`}
              strokeLinecap="round"
            />
          )}
          <path
            d={PATCH_PARTS.liner}
            {...outline}
            fill={hardwareFill}
            fillOpacity={hardwareOpacity === 1 ? 0.3 : 0.14}
          />
        </>
      );

    /* 凝胶泵：泵头 + 出液嘴 + 瓶身 + 标签带 */
    case 'gel-pump':
      return (
        <>
          {hardware(GEL_PUMP_PARTS.nozzle, 'nozzle')}
          {hardware(GEL_PUMP_PARTS.head, 'head')}
          {hardware(GEL_PUMP_PARTS.neck, 'neck')}
          <path d={geo.d} {...outline} fill={bodyFill} />
          {detail && <path d={GEL_PUMP_PARTS.label} {...hair} strokeOpacity={0.35} />}
        </>
      );

    /* 凝胶小袋：单剂量袋 + 锯齿撕口 + 侧封线 + 撕口缺角 */
    case 'gel-sachet':
      return (
        <>
          <path d={geo.d} {...outline} fill={bodyFill} />
          {detail && (
            <>
              <path d={GEL_SACHET_PARTS.seals} {...hair} strokeOpacity={0.3} />
              <path d={GEL_SACHET_PARTS.tear} {...hair} strokeOpacity={0.7} />
              <path d={GEL_SACHET_PARTS.notch} {...hair} strokeOpacity={0.7} />
            </>
          )}
        </>
      );

    /* 喷雾泵瓶（雌二醇喷雾） */
    case 'spray':
      return (
        <>
          {detail &&
            SPRAY_PARTS.mist.map((m) => (
              <circle
                key={`mist-${m.cx}-${m.cy}`}
                cx={m.cx}
                cy={m.cy}
                r={m.r}
                fill="currentColor"
                opacity={0.32}
              />
            ))}
          {hardware(SPRAY_PARTS.actuator, 'actuator')}
          {hardware(SPRAY_PARTS.neck, 'neck')}
          <path d={geo.d} {...outline} fill={bodyFill} />
          {detail && <path d={SPRAY_PARTS.level} {...hair} strokeOpacity={0.3} />}
        </>
      );

    /* 鼻喷瓶：更短的瓶身 + 斜嘴 */
    case 'nasal-spray':
      return (
        <>
          {detail &&
            NASAL_SPRAY_PARTS.mist.map((m) => (
              <circle
                key={`mist-${m.cx}-${m.cy}`}
                cx={m.cx}
                cy={m.cy}
                r={m.r}
                fill="currentColor"
                opacity={0.32}
              />
            ))}
          {hardware(NASAL_SPRAY_PARTS.nozzle, 'nozzle')}
          {hardware(NASAL_SPRAY_PARTS.collar, 'collar')}
          <path d={geo.d} {...outline} fill={bodyFill} />
          {detail && <path d={NASAL_SPRAY_PARTS.level} {...hair} strokeOpacity={0.3} />}
        </>
      );

    /* 玻璃安瓿：玻璃淡染 + 液体 + 颈部断点色环 */
    case 'ampoule':
      return (
        <>
          <path d={geo.d} fill={bodyFill} fillOpacity={0.35} stroke="none" />
          <path d={AMPOULE_PARTS.liquid} fill={liquidFill} stroke="none" />
          <path d={geo.d} {...outline} />
          {detail && <path d={AMPOULE_PARTS.neckLine} {...hair} strokeOpacity={0.3} />}
          <path
            d={AMPOULE_PARTS.breakRing}
            fill="none"
            stroke={bodyFill}
            strokeWidth={round2(sw * 1.7)}
            strokeLinecap="butt"
          />
          <path d={AMPOULE_PARTS.breakRing} {...hair} strokeOpacity={0.45} strokeLinecap="butt" />
        </>
      );

    /* 西林瓶：玻璃 + 液体 + 铝盖（压边纹） */
    case 'vial':
      return (
        <>
          <path d={geo.d} fill={bodyFill} fillOpacity={0.35} stroke="none" />
          <path d={VIAL_PARTS.liquid} fill={liquidFill} stroke="none" />
          <path d={geo.d} {...outline} />
          {hardware(VIAL_PARTS.cap, 'cap')}
          {detail && <path d={VIAL_PARTS.capRibs} {...hair} strokeOpacity={0.4} />}
        </>
      );

    /* 冻干粉瓶：瓶内粉末堆（主体色即粉末色，缺省为近白） */
    case 'powder-vial':
      return (
        <>
          <path d={geo.d} fill="currentColor" fillOpacity={0.05} stroke="none" />
          <path d={VIAL_PARTS.powder} fill={bodyFill} stroke="none" />
          <path d={VIAL_PARTS.powderSurface} {...hair} strokeOpacity={0.45} />
          <path d={geo.d} {...outline} />
          {detail &&
            VIAL_PARTS.powderMotes.map((m) => (
              <circle
                key={`mote-${m.cx}-${m.cy}`}
                cx={m.cx}
                cy={m.cy}
                r={m.r}
                fill={bodyFill}
                opacity={0.75}
              />
            ))}
          {hardware(VIAL_PARTS.cap, 'cap')}
          {detail && <path d={VIAL_PARTS.capRibs} {...hair} strokeOpacity={0.4} />}
        </>
      );

    /* 预填充注射器：拇指压板 → 推杆 → 指托 → 筒身/液体/刻度 → 鲁尔锥 → 针 */
    case 'prefilled-syringe':
      return (
        <>
          {hardware(SYRINGE_PARTS.thumb, 'thumb')}
          {hardware(SYRINGE_PARTS.rod, 'rod')}
          {hardware(SYRINGE_PARTS.flange, 'flange')}
          <path d={geo.d} fill={bodyFill} fillOpacity={0.3} stroke="none" />
          <path d={SYRINGE_PARTS.liquid} fill={liquidFill} stroke="none" />
          <path d={geo.d} {...outline} />
          {detail && <path d={SYRINGE_PARTS.graduations} {...hair} strokeOpacity={0.45} />}
          {hardware(SYRINGE_PARTS.luer, 'luer')}
          <path d={SYRINGE_PARTS.needle} fill="currentColor" fillOpacity={0.75} stroke="none" />
        </>
      );

    /* 皮下植入棒：细短杆 + 尺寸标注（尺寸感） */
    case 'implant':
      return (
        <>
          <path d={geo.d} {...outline} fill={bodyFill} />
          {detail && (
            <>
              <path d={IMPLANT_PARTS.dimension} {...hair} strokeOpacity={0.45} />
              <path d={IMPLANT_PARTS.arrows} {...hair} strokeOpacity={0.45} />
            </>
          )}
        </>
      );

    /* 阴道栓：子弹形 */
    case 'pessary':
      return <path d={geo.d} {...outline} fill={bodyFill} />;

    /* 数据越界时退回主体轮廓，绝不抛错（数据驱动组件的容错） */
    default:
      return <path d={geo.d} {...outline} fill={bodyFill} />;
  }
}

/* ─────────────────────────── 工具 ─────────────────────────── */

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
