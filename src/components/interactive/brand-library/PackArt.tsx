/**
 * 药物图鉴 v2.1 — 包装示意图（PackArt）
 * spec: docs/specs/brand-library-v2.1-visual.md §2
 *
 * 无实拍照片时卡片顶部显示的图：左后方一个药盒（微透视）+ 右前方的泡罩板 / 剂型件。
 *
 * 纪律：
 * - 纯 inline SVG，零依赖、零副作用、SSR 安全（不碰 window / document）。
 * - **不模仿任何厂商 logo / 商标图形**：盒面只有品牌名文字、规格与母公司首词。
 * - 颜色全部走 --bl-* 变量（品牌色带按成分类别取 token）；片剂本体色是数据字段，
 *   与 Pictogram 同一条约定，经 props 进入。
 * - 无 emoji；文字用 <text> + var(--font-body)。
 */

import { useId } from 'react';
import type { CSSProperties, JSX } from 'react';

import Pictogram from './Pictogram';
import type { BrandForm, Coating, IngredientCategory, Score, TabletShape } from './types';

export interface PackArtProps {
  /** 盒面品牌名（国际名优先，调用方已做回退） */
  name: string;
  /** 盒面第一行规格，如 '2 mg' */
  strength?: string;
  /** 盒面右上角：母公司 / 厂商首词 */
  maker?: string;
  /** 决定盒顶色带的成分类别 */
  category: IngredientCategory;
  /** 整族不适用于 HRT：色带走灰 */
  banned?: boolean;
  form: BrandForm;
  shape?: TabletShape;
  color?: string;
  secondaryColor?: string;
  coating?: Coating;
  score?: Score;
  /** <title> 无障碍文本（调用方走 i18n 拼「{name} 包装示意图（非实物）」） */
  title: string;
  className?: string;
}

/** 盒面文字：超长缩字号 + 截断，避免溢出盒面 */
function fitName(raw: string): { text: string; size: number } {
  const text = raw.trim();
  if (text.length <= 14) return { text, size: 18 };
  if (text.length <= 20) return { text, size: 15 };
  return { text: `${text.slice(0, 22)}…`, size: 12.5 };
}

/** 厂商首词（不画 logo，只放一个中性小字） */
function firstWord(raw: string | undefined): string {
  const value = (raw ?? '').trim();
  if (!value) return '';
  const word = value.split(/[\s/·（(]/)[0] ?? value;
  return word.slice(0, 12);
}

/** 泡罩板里的一枚药：形状按 shape 简化为圆 / 椭圆 / 三角 */
function pocketShape(
  shape: TabletShape | undefined,
  cx: number,
  cy: number,
  fill: string,
  stroke: string,
): JSX.Element {
  if (shape === 'triangle') {
    return (
      <path
        d={`M ${cx} ${cy - 12} L ${cx + 12} ${cy + 9} L ${cx - 12} ${cy + 9} Z`}
        fill={fill}
        stroke={stroke}
        strokeWidth={1}
        strokeLinejoin="round"
      />
    );
  }
  if (shape === 'oval' || shape === 'oblong' || shape === 'capsule') {
    return <ellipse cx={cx} cy={cy} rx={15} ry={9} fill={fill} stroke={stroke} strokeWidth={1} />;
  }
  return <circle cx={cx} cy={cy} r={11.5} fill={fill} stroke={stroke} strokeWidth={1} />;
}

const BLISTER_FORMS: ReadonlySet<BrandForm> = new Set<BrandForm>(['tablet', 'capsule', 'softgel']);

export default function PackArt({
  name,
  strength,
  maker,
  category,
  banned = false,
  form,
  shape,
  color,
  secondaryColor,
  coating,
  score,
  title,
  className,
}: PackArtProps): JSX.Element {
  const uid = useId();
  const titleId = `bl-packart-${uid}`;
  const clipId = `bl-packclip-${uid}`;

  const band = banned ? 'var(--bl-pack-banned)' : `var(--bl-pack-${category})`;
  const line = 'var(--bl-pack-line)';
  const face = 'var(--bl-pack-face)';
  const faceTop = 'var(--bl-pack-face-top)';
  const faceSide = 'var(--bl-pack-face-side)';
  const foil = 'var(--bl-pack-foil)';
  const pill = color ?? 'var(--bl-pack-pill)';

  const fitted = fitName(name);
  const makerWord = firstWord(maker);
  const blister = BLISTER_FORMS.has(form);

  const textStyle: CSSProperties = { fontFamily: 'var(--font-body)' };

  return (
    <svg
      className={className ? `bl-packart ${className}` : 'bl-packart'}
      viewBox="0 0 400 300"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-labelledby={titleId}
    >
      <title id={titleId}>{title}</title>

      <defs>
        <clipPath id={clipId}>
          <rect x="34" y="98" width="220" height="150" rx="6" />
        </clipPath>
      </defs>

      {/* 盒子落影（纯装饰） */}
      <ellipse cx="200" cy="272" rx="150" ry="12" fill="var(--bl-ink)" opacity="0.06" />

      {/* 顶面 / 右侧面：微透视 */}
      <path d="M34 98 L58 80 L278 80 L254 98 Z" fill={faceTop} stroke={line} strokeWidth="1.5" strokeLinejoin="round" />
      <path
        d="M254 98 L278 80 L278 230 L254 248 Z"
        fill={faceSide}
        stroke={line}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />

      {/* 正面 */}
      <rect x="34" y="98" width="220" height="150" rx="6" fill={face} stroke={line} strokeWidth="1.5" />
      <g clipPath={`url(#${clipId})`}>
        <rect x="34" y="98" width="220" height="22" fill={band} />
      </g>
      <line x1="34" y1="120" x2="254" y2="120" stroke={line} strokeWidth="1" />

      {/* 盒面文字：品牌名 + 规格 + 厂商首词（不画商标图形） */}
      <text
        x="50"
        y="160"
        style={textStyle}
        fontSize={fitted.size}
        fontWeight="700"
        fill="var(--bl-ink)"
      >
        {fitted.text}
      </text>
      {strength ? (
        <text x="50" y="184" style={textStyle} fontSize="13" fill="var(--bl-ink-2)">
          {strength}
        </text>
      ) : null}
      {makerWord ? (
        <text x="238" y="140" style={textStyle} fontSize="10" fill="var(--bl-ink-3)" textAnchor="end">
          {makerWord}
        </text>
      ) : null}
      {/* 盒面下部两条中性排版线（示意说明文字，不含可读文本） */}
      <line x1="50" y1="212" x2="176" y2="212" stroke={line} strokeWidth="4" strokeLinecap="round" opacity="0.5" />
      <line x1="50" y1="226" x2="140" y2="226" stroke={line} strokeWidth="4" strokeLinecap="round" opacity="0.35" />

      {blister ? (
        <g>
          {/* 泡罩板：铝箔底 + 2×5 pocket */}
          <rect x="150" y="168" width="214" height="114" rx="10" fill={foil} stroke={line} strokeWidth="1.5" />
          {[0, 1].map((row) =>
            [0, 1, 2, 3, 4].map((col) => {
              const cx = 150 + 17 + col * 36 + 18;
              const cy = 168 + 14 + row * 43 + 21;
              return (
                <g key={`${row}-${col}`}>
                  <rect
                    x={cx - 17}
                    y={cy - 19}
                    width="34"
                    height="38"
                    rx="12"
                    fill="var(--bl-pack-pocket)"
                    stroke={line}
                    strokeWidth="0.75"
                  />
                  {pocketShape(shape, cx, cy, pill, line)}
                </g>
              );
            }),
          )}
        </g>
      ) : (
        /* 非片剂：复用 v2 的 Pictogram（贴片 / 凝胶泵 / 安瓿 / 注射器…） */
        <g transform="translate(196 158)">
          <Pictogram
            form={form}
            shape={shape}
            color={color}
            secondaryColor={secondaryColor}
            coating={coating}
            score={score}
            size={168}
          />
        </g>
      )}
    </svg>
  );
}
