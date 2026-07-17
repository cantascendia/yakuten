/**
 * Yakuten v2 Primitives — 绯英 手账 · 文具少女 · 粉彩 pastel
 *
 * 移植自 design_handoff_site_full/design_files/ui_kits/yakuten/primitives.jsx (543 行)
 * Visual grammar: 樱粉+蜜桃+薄荷+奶油 · 手账贴纸 · 胶带 · 回形针 · 网点 · 书法标题
 * Never: 霓虹燃烧红 · 刀剑 · 硬核战斗感
 *
 * ── 移植说明 ────────────────────────────────────────────────────────────
 * 1) 原型用 `Object.assign(window, {...})` 挂全局；此处改标准 ESM export。
 * 2) 原型导出 29 个组件，本文件只移植【实际被 13 屏使用的 20 个】。
 *    刻意不移植的 8 个（全站 grep 实测 0 处引用）：
 *      · RarityStars —— 星级标注医学信息，DESIGN_SYSTEM「🚫 Never」明令禁止
 *      · BoomLabel   —— 爆炸贴纸包装危险警告，同属 Never 清单
 *      · NeonSign    —— 切角 clip-path + 霓虹感，双踩 Never 清单
 *      · GlassCard / ParticleBg / CLIP / StickerLabel / MangaPanel —— 死代码
 *    DESIGN_SYSTEM.md:63 说这些 legacy 别名存在的唯一意义是「不破坏旧 import」；
 *    v2 是全新代码，没有旧 import 要保 → 不移植，红线天然干净。
 * 3) 所有组件均为纯函数组件（无 useState/useEffect）→ Astro 可在构建期渲染出
 *    HTML 且不加 client: 指令 = 零 JS。InkCard 的 hover 因此必须走 CSS（见下）。
 * ───────────────────────────────────────────────────────────────────────
 */
import type { CSSProperties, ReactNode } from 'react';

/* =========================================================================
   ICON — 2px line icons
   ========================================================================= */
const ICON_PATHS: Record<string, string> = {
  arrow: '<line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>',
  check: '<polyline points="20 6 9 17 4 12"/>',
  x: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
  alert: '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
  heart: '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>',
  star: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
  sparkles: '<path d="M12 3l1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8L12 3z"/><path d="M19 14l.9 2.1L22 17l-2.1.9L19 20l-.9-2.1L16 17l2.1-.9L19 14z"/><path d="M5 14l.9 2.1L8 17l-2.1.9L5 20l-.9-2.1L2 17l2.1-.9L5 14z"/>',
  moon: '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>',
  bunny: '<path d="M7 2c-1 2-1 5 0 7 M17 2c1 2 1 5 0 7"/><path d="M4 12c0-3 3-5 8-5s8 2 8 5c0 4-3 7-8 7s-8-3-8-7z"/><circle cx="10" cy="14" r="0.5"/><circle cx="14" cy="14" r="0.5"/>',
  file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/>',
  pin: '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>',
  pill: '<path d="M10.5 20.5l10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7z"/><line x1="8.5" y1="8.5" x2="15.5" y2="15.5"/>',
  drop: '<path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>',
  route: '<circle cx="6" cy="19" r="3"/><path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15"/><circle cx="18" cy="5" r="3"/>',
  chevron: '<polyline points="9 18 15 12 9 6"/>',
  clip: '<path d="M21 11l-9 9a5 5 0 0 1-7-7l9-9a3.5 3.5 0 0 1 5 5l-9 9a2 2 0 0 1-3-3l8-8"/>',
  scissors: '<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/><line x1="8.12" y1="8.12" x2="12" y2="12"/>',
  book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
  stamp: '<path d="M5 22h14"/><path d="M19 17H5v-2a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/><path d="M9 13V8a3 3 0 1 1 6 0v5"/>',
  clipboard: '<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>',
  lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  ribbon: '<path d="M12 2v20"/><path d="M5 6c5 2 14 2 14 0"/><path d="M5 12c5 2 14 2 14 0"/>',
  flower: '<circle cx="12" cy="12" r="2"/><path d="M12 3a3 3 0 0 1 0 6 3 3 0 0 1 0-6z"/><path d="M12 15a3 3 0 0 1 0 6 3 3 0 0 1 0-6z"/><path d="M3 12a3 3 0 0 1 6 0 3 3 0 0 1-6 0z"/><path d="M15 12a3 3 0 0 1 6 0 3 3 0 0 1-6 0z"/>',
  tape: '<rect x="3" y="8" width="18" height="8" rx="1"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="3" y1="14" x2="21" y2="14"/>',
};

export type IconName = keyof typeof ICON_PATHS;

/**
 * dangerouslySetInnerHTML 在此是安全的：注入内容全部来自上方的编译期常量字典，
 * 无任何用户输入路径。仓库已有先例（AIAssistant.tsx 同样用法）。
 */
export const Icon = ({
  name,
  size = 20,
  color = 'currentColor',
  strokeWidth = 2.2,
}: {
  name: IconName | string;
  size?: number;
  color?: string;
  strokeWidth?: number;
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    dangerouslySetInnerHTML={{ __html: ICON_PATHS[name] || '' }}
  />
);

/* =========================================================================
   HIBISCUS MARK — 绯英 signature（站点品牌花印）
   ========================================================================= */
/**
 * 原型写的是 aria-label="bloom"：既无 role="img"（label 对 <svg> 不生效），
 * 又是一个对中文读屏用户毫无意义的英文词。品牌标记是纯装饰（旁边永远有
 * 「HRT药典」文字），正确做法是 aria-hidden。
 */
export const HibiscusMark = ({ size = 48 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
    {/* Pure flat: 5-petal bloom, solid pastel, no stroke, no shading */}
    <g transform="translate(32 32)">
      <circle cx="0" cy="-18" r="11" fill="#FFA8C5" />
      <circle cx="0" cy="-18" r="11" fill="#FFA8C5" transform="rotate(72)" />
      <circle cx="0" cy="-18" r="11" fill="#FFA8C5" transform="rotate(144)" />
      <circle cx="0" cy="-18" r="11" fill="#FFA8C5" transform="rotate(216)" />
      <circle cx="0" cy="-18" r="11" fill="#FFA8C5" transform="rotate(288)" />
      <circle cx="0" cy="0" r="8" fill="#F5C842" />
    </g>
  </svg>
);

/* =========================================================================
   FOX TEACHER MARK — 狐狸老师（会判读、会提示的老师）
   ========================================================================= */
/** 同 HibiscusMark：装饰性头像，旁边恒有「狐狸老师」文字 → aria-hidden。 */
export const FoxTeacherMark = ({ size = 48 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
    {/* 耳朵 */}
    <polygon points="13,30 17,7 31,21" fill="#F5B347" />
    <polygon points="51,30 47,7 33,21" fill="#F5B347" />
    <polygon points="17.5,26 19.5,13 27.5,21" fill="#FFF5E0" />
    <polygon points="46.5,26 44.5,13 36.5,21" fill="#FFF5E0" />
    {/* 头 + 口鼻 */}
    <circle cx="32" cy="38" r="20" fill="#F5B347" />
    <ellipse cx="32" cy="46" rx="11" ry="9" fill="#FFFAF0" />
    <circle cx="32" cy="43" r="2.4" fill="#4A2838" />
    {/* 老师的眼镜 */}
    <circle cx="23.5" cy="35" r="6" fill="rgba(255,255,255,0.55)" stroke="#4A2838" strokeWidth="2.4" />
    <circle cx="40.5" cy="35" r="6" fill="rgba(255,255,255,0.55)" stroke="#4A2838" strokeWidth="2.4" />
    <line x1="29.5" y1="35" x2="34.5" y2="35" stroke="#4A2838" strokeWidth="2.4" />
    <circle cx="23.5" cy="35" r="1.6" fill="#4A2838" />
    <circle cx="40.5" cy="35" r="1.6" fill="#4A2838" />
  </svg>
);

/* =========================================================================
   SEAL STAMP — 裁定印章（判读 = 盖章，取代抽卡风 chip）
   ========================================================================= */
export const SealStamp = ({
  children,
  color = 'var(--danger)',
  rotate = -5,
  size = 'md',
  style = {},
}: {
  children: ReactNode;
  color?: string;
  rotate?: number;
  size?: 'md' | 'lg';
  style?: CSSProperties;
}) => (
  <span
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: size === 'lg' ? '10px 16px' : '4px 11px',
      border: `2.5px solid ${color}`,
      borderRadius: 6,
      color,
      fontFamily: 'var(--font-heading)',
      fontWeight: 700,
      fontSize: size === 'lg' ? 17 : 12,
      letterSpacing: '0.16em',
      textIndent: '0.16em',
      transform: `rotate(${rotate}deg)`,
      whiteSpace: 'nowrap',
      background: 'transparent',
      ...style,
    }}
  >
    {children}
  </span>
);

/* =========================================================================
   CARDS
   ========================================================================= */
export type InkCardVariant =
  | 'default' | 'cream' | 'pink' | 'flame' | 'gold'
  | 'mint' | 'sky' | 'lavender' | 'paper';

const INK_CARD_VARIANTS: Record<InkCardVariant, CSSProperties> = {
  default: { background: 'var(--bg-3)', color: 'var(--fg-1)' },
  cream: { background: 'var(--cream)', color: 'var(--fg-1)' },
  pink: { background: 'var(--sakura-blush)', color: 'var(--fg-1)' },
  /* AA 修正：原型是 linear-gradient(135deg, var(--sakura-pink), var(--coral)) + #fff，
     白字落浅樱粉→珊瑚 ≈1.80–2.23:1。这是 inline style，CSS 层的 .btn-flame 覆盖
     够不到它 → 必须在此处改。渐变与 origin/master PR #36 的既定修法一致，
     实测白字全程 5.39 → 5.10，两端皆过 AA。 */
  flame: { background: 'linear-gradient(135deg, var(--sakura-pink-aa), var(--danger-deep))', color: '#fff' },
  gold: { background: 'var(--butter)', color: 'var(--fg-1)' },
  mint: { background: 'var(--mint)', color: 'var(--fg-1)' },
  sky: { background: 'var(--sky)', color: 'var(--fg-1)' },
  lavender: { background: 'var(--lavender)', color: 'var(--fg-1)' },
  paper: { background: 'var(--ivory)', color: 'var(--fg-1)' },
};

/**
 * InkCard — 全站最高频组件（13/13 屏都在用）
 *
 * 相对原型的两处结构性改动（视觉零差异，理由见 v2-overrides.css §2/§3）：
 * 1) hover 从 useState 迁到 CSS 类 .yk-inkcard--lift
 *    → 让 home/urgent/drugs/drug-detail/tools 五屏（24 页）真正零 JS
 * 2) 新增 href：有 href 渲染 <a>，有 onClick 渲染 <button>，都没有渲染 <div>
 *    → 原型用 <div onClick> 做导航，不可 Tab 聚焦、读屏不播报为链接、
 *      无法中键新开。真实路径路由下必须还原为语义元素。
 */
export const InkCard = ({
  children,
  style = {},
  variant = 'default',
  href,
  onClick,
  hoverLift = true,
  ariaLabel,
}: {
  children: ReactNode;
  style?: CSSProperties;
  variant?: InkCardVariant;
  href?: string;
  onClick?: () => void;
  hoverLift?: boolean;
  ariaLabel?: string;
}) => {
  const interactive = Boolean(href || onClick);
  const className = [
    'yk-paper',
    'yk-inkcard',
    hoverLift ? 'yk-inkcard--lift' : '',
    interactive ? 'yk-inkcard--clickable' : '',
  ].filter(Boolean).join(' ');

  /* border / radius / padding / box-shadow / transform / transition 全部由
     .yk-inkcard 类提供（见 v2-overrides.css），此处只留 variant 配色 + 调用方覆盖。
     inline 优先级高于类 → 调用方传的 style 依然能盖掉，与原型行为一致。 */
  const inlineStyle: CSSProperties = { ...INK_CARD_VARIANTS[variant], ...style };

  if (href) {
    return (
      <a href={href} className={className} data-paper="true" style={inlineStyle} aria-label={ariaLabel}>
        {children}
      </a>
    );
  }
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className} data-paper="true"
        style={{ textAlign: 'inherit', font: 'inherit', ...inlineStyle }} aria-label={ariaLabel}>
        {children}
      </button>
    );
  }
  return (
    <div className={className} data-paper="true" style={inlineStyle}>
      {children}
    </div>
  );
};

/* =========================================================================
   WASHI TAPE — 胶带贴片 (decorative strip)
   ========================================================================= */
export const WashiTape = ({
  color = 'var(--sakura-pink)',
  pattern = 'solid',
  width = 100,
  rotation = -3,
  style = {},
}: {
  color?: string;
  pattern?: 'solid' | 'dots' | 'stripes' | 'grid';
  width?: number;
  rotation?: number;
  style?: CSSProperties;
}) => {
  const patterns: Record<string, string> = {
    solid: color,
    dots: `radial-gradient(circle at 4px 4px, rgba(74,40,56,0.3) 1px, transparent 1.5px), ${color}`,
    stripes: `repeating-linear-gradient(45deg, ${color} 0 6px, rgba(255,255,255,0.4) 6px 12px)`,
    grid: `linear-gradient(rgba(74,40,56,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(74,40,56,0.2) 1px, transparent 1px), ${color}`,
  };
  return (
    <div
      aria-hidden="true"
      style={{
        display: 'inline-block',
        width,
        height: 22,
        background: patterns[pattern],
        backgroundSize:
          pattern === 'dots' ? '8px 8px, 100%'
          : pattern === 'grid' ? '10px 10px, 10px 10px, 100%'
          : '100%',
        border: '1px dashed rgba(74,40,56,0.3)',
        transform: `rotate(${rotation}deg)`,
        opacity: 0.92,
        ...style,
      }}
    />
  );
};

/* =========================================================================
   PAPERCLIP — 回形针装饰
   ========================================================================= */
export const Paperclip = ({
  size = 30,
  color = 'var(--honey)',
  rotation = -15,
  style = {},
}: {
  size?: number;
  color?: string;
  rotation?: number;
  style?: CSSProperties;
}) => (
  <svg width={size} height={size * 1.4} viewBox="0 0 30 42" aria-hidden="true"
    style={{ transform: `rotate(${rotation}deg)`, ...style }}>
    <path d="M10 4 Q10 2 15 2 Q20 2 20 4 L20 28 Q20 38 12 38 Q4 38 4 28 L4 12"
      fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

/* =========================================================================
   SPEECH BUBBLE
   ========================================================================= */
const BUBBLE_TONES: Record<string, { background: string; color: string }> = {
  paper: { background: 'var(--ivory)', color: 'var(--fg-1)' },
  pink: { background: 'var(--sakura-blush)', color: 'var(--fg-1)' },
  /* 原型 flame tone 是 #fff on --sakura-pink(#FFA8C5) = 1.80:1，正文气泡不可读。
     换 --sakura-pink-aa 底（白字 5.39:1）。这是狐狸老师的说话气泡，
     属正文级内容，必须过 AA。 */
  flame: { background: 'var(--sakura-pink-aa)', color: '#fff' },
  mint: { background: 'var(--mint)', color: 'var(--fg-1)' },
};

export const SpeechBubble = ({
  children,
  tail = 'bottom-left',
  tone = 'paper',
  style = {},
}: {
  children: ReactNode;
  tail?: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right';
  tone?: 'paper' | 'pink' | 'flame' | 'mint';
  style?: CSSProperties;
}) => {
  const t = BUBBLE_TONES[tone];
  return (
    <div className="yk-paper" data-paper="true" style={{ position: 'relative', display: 'inline-block', ...style }}>
      <div style={{
        ...t,
        border: '2px solid var(--ink)',
        borderRadius: 18,
        padding: '10px 16px',
        fontFamily: 'var(--font-body)',
        fontWeight: 500,
        boxShadow: '3px 3px 0 var(--ink)',
      }}>{children}</div>
      <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" style={{
        position: 'absolute',
        [tail.includes('bottom') ? 'bottom' : 'top']: -14,
        [tail.includes('left') ? 'left' : 'right']: 20,
        transform: tail.includes('top') ? 'scaleY(-1)' : 'none',
      }}>
        <path d="M2 0 L22 0 L10 22 Z" fill={t.background} stroke="var(--ink)" strokeWidth="2" strokeLinejoin="round" />
      </svg>
    </div>
  );
};

/* =========================================================================
   HUD BAR — pastel progress (HP-like but soft)
   ========================================================================= */
/**
 * AA 修正：原型 color 默认 var(--sakura-pink-deep)，label 落 cream 底 = 3.20:1 FAIL。
 * 换 --sakura-pink-text（5.18:1）。填充条的渐变仍以传入 color 起始 —— 那是图形不是文字。
 * label 与 value 都是真实文本 → 无需 role/aria。
 */
export const HudBar = ({
  label,
  value,
  max,
  color = 'var(--sakura-pink-text)',
}: {
  label: string;
  value: number;
  max: number;
  color?: string;
}) => {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div style={{
      background: 'var(--cream)',
      border: '2px solid var(--ink)',
      padding: '6px 12px',
      borderRadius: 999,
      display: 'grid',
      gridTemplateColumns: '54px 1fr 80px',
      alignItems: 'center',
      gap: 10,
    }}>
      <span style={{ fontFamily: 'var(--font-ui-accent)', fontSize: 12, color, letterSpacing: '0.05em', fontWeight: 700 }}>{label}</span>
      <div style={{ height: 12, background: 'var(--sakura-blush)', borderRadius: 999, border: '1px solid var(--ink)', overflow: 'hidden', position: 'relative' }}>
        <div style={{
          height: '100%',
          width: `${pct}%`,
          background: `linear-gradient(90deg, ${color}, var(--coral))`,
          transition: 'width .4s ease',
        }} />
      </div>
      <span style={{ fontFamily: 'var(--font-hud)', fontSize: 12, color: 'var(--fg-1)', fontWeight: 700, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
        {value}<span style={{ color: 'var(--fg-3)' }}> / {max}</span>
      </span>
    </div>
  );
};

/* =========================================================================
   CHIP
   ========================================================================= */
/**
 * AA 修正：原型默认 color = --sakura-pink-deep，两种形态都 FAIL：
 *   非 filled  深粉字 on 象牙 = 3.33  → 换 pink-text = 5.39 PASS
 *   filled     白字 on 深粉底 = 3.46  → 换 pink-text 做底 = 5.61 PASS
 * 单一默认色 --sakura-pink-text 同时解决两种形态（同色相加深，边框随之加深）。
 * master PR #36 亦修过 yk-chip--filled，此处与其一致。
 */
export const Chip = ({
  children,
  color = 'var(--sakura-pink-text)',
  filled = false,
  bg,
}: {
  children: ReactNode;
  color?: string;
  filled?: boolean;
  bg?: string;
}) => (
  <span style={{
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '4px 12px',
    background: bg ?? (filled ? color : 'var(--ivory)'),
    color: filled ? '#fff' : color,
    border: `2px solid ${color}`,
    borderRadius: 999,
    fontFamily: 'var(--font-ui-accent)',
    fontSize: 12,
    letterSpacing: '0.02em',
    fontWeight: 600,
    whiteSpace: 'nowrap',
  }}>{children}</span>
);

/* =========================================================================
   SECTION KICKER — washi tape + 不折行小标签
   ========================================================================= */
export const SectionKicker = ({
  children,
  tapeColor = 'var(--sakura-pink)',
  pattern = 'dots',
  style = {},
}: {
  children: ReactNode;
  tapeColor?: string;
  pattern?: 'solid' | 'dots' | 'stripes' | 'grid';
  style?: CSSProperties;
}) => (
  <div className="yk-kicker" style={style}>
    <WashiTape color={tapeColor} pattern={pattern} width={60} rotation={-4} />
    <span>{children}</span>
  </div>
);

/* =========================================================================
   PAGE HEAD — 线装书「卷」页头：竖排卷标 + 超大标题 + 装订墨线
   ========================================================================= */
export const PageHead = ({
  volume,
  tab,
  kicker,
  tapeColor = 'var(--sakura-pink)',
  pattern = 'dots',
  title,
  accent,
  lede,
  right,
}: {
  volume?: string;
  tab?: string;
  kicker?: ReactNode;
  tapeColor?: string;
  pattern?: 'solid' | 'dots' | 'stripes' | 'grid';
  title: ReactNode;
  accent?: ReactNode;
  lede?: ReactNode;
  right?: ReactNode;
}) => (
  <header className="yk-pagehead">
    {volume && (
      <div className="yk-pagehead__tab" aria-hidden="true">{volume}{tab ? `・${tab}` : ''}</div>
    )}
    <div className="yk-pagehead__body">
      {kicker && <SectionKicker tapeColor={tapeColor} pattern={pattern}>{kicker}</SectionKicker>}
      <h1 className="yk-pagehead__title">
        {title}{accent && <> · <span className="yk-accent-zhu">{accent}</span></>}
      </h1>
      {lede && <p className="yk-pagehead__lede">{lede}</p>}
    </div>
    {right}
  </header>
);

/* =========================================================================
   RANGE GAUGE — 文具直尺样式（尺刀裁定）：刻度 + 绿/黄/红分区 + 游标
   ========================================================================= */
/**
 * aria-hidden：本组件是纯图形，且调用方（血检 HUD）在紧邻位置已渲染
 * 「数值 + 单位 + 判读印章」的真实文本。加 role="img" 会造成读屏重复播报。
 */
export const RangeGauge = ({
  value,
  domain,
  green,
  yellows = [],
  red,
  height = 18,
}: {
  value: number;
  domain: [number, number];
  green: [number, number];
  yellows?: Array<[number, number]>;
  red?: number | null;
  height?: number;
}) => {
  const [lo, hi] = domain;
  const pct = (v: number) => Math.max(0, Math.min(100, ((v - lo) / (hi - lo)) * 100));
  const zones: Array<{ from: number; to: number; color: string }> = [];
  zones.push({ from: green[0], to: green[1], color: 'var(--mint)' });
  yellows.forEach(([a, b]) => zones.push({ from: a, to: b, color: 'var(--butter)' }));
  if (red != null && red < hi) zones.push({ from: red, to: hi, color: 'var(--danger-a25)' });
  return (
    <div aria-hidden="true" style={{ position: 'relative', height, borderRadius: 4, border: '1.5px solid var(--ink)', background: 'var(--ivory)', overflow: 'visible' }}>
      <div style={{ position: 'absolute', inset: 0, borderRadius: 3, overflow: 'hidden' }}>
        {zones.map((z, i) => (
          <div key={i} style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: `${pct(z.from)}%`,
            width: `${Math.max(0, pct(z.to) - pct(z.from))}%`,
            background: z.color,
          }} />
        ))}
        {/* 直尺刻度：每 5% 小刻，每 25% 主刻 */}
        {Array.from({ length: 19 }).map((_, i) => {
          const p = (i + 1) * 5;
          const major = p % 25 === 0;
          return <div key={i} style={{
            position: 'absolute',
            top: 0,
            left: `${p}%`,
            width: 1,
            height: major ? '58%' : '32%',
            background: major ? 'var(--ink)' : 'var(--ink-faint)',
          }} />;
        })}
      </div>
      <div style={{
        position: 'absolute',
        top: -5,
        bottom: -5,
        left: `calc(${pct(value)}% - 4px)`,
        width: 8,
        background: 'var(--ink)',
        borderRadius: 3,
        border: '1.5px solid var(--ivory)',
        boxShadow: '1px 1px 0 rgba(74,40,56,0.35)',
        transition: 'left .25s cubic-bezier(0.34,1.56,0.64,1)',
      }} />
    </div>
  );
};

/* =========================================================================
   WARNING / DANGER BOXES — 便签感
   ========================================================================= */
/**
 * DangerBox — 危险信息脱离可爱风：墨底 + 红章。设计红线，不得包装。
 * 墨底 #4A2838 + 白字 = 12.6:1；正文用 --cream 亦远超 AA。
 */
export const DangerBox = ({
  title,
  children,
  stamp = '停药',
}: {
  title: ReactNode;
  children: ReactNode;
  stamp?: string;
}) => (
  <div style={{
    marginTop: 20,
    padding: '18px 20px',
    background: 'var(--ink)',
    border: '2px solid var(--danger)',
    borderRadius: 8,
    display: 'flex',
    alignItems: 'center',
    gap: 18,
    flexWrap: 'wrap',
  }}>
    <SealStamp color="var(--danger)" size="lg" rotate={-7}>{stamp}</SealStamp>
    <div style={{ flex: 1, minWidth: 240 }}>
      <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 16, marginBottom: 4, color: '#fff' }}>
        {title}
      </div>
      <div style={{ fontSize: 14, color: 'var(--cream)', lineHeight: 1.7 }}>{children}</div>
    </div>
  </div>
);

export const WarningBox = ({ title, children }: { title: ReactNode; children: ReactNode }) => (
  <InkCard variant="gold" hoverLift={false} style={{ marginTop: 16, padding: 16 }}>
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
      <Icon name="alert" size={22} color="var(--ink)" strokeWidth={2.5} />
      <div>
        <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{title}</div>
        <div style={{ fontSize: 13, lineHeight: 1.6 }}>{children}</div>
      </div>
    </div>
  </InkCard>
);

/* =========================================================================
   EVIDENCE BADGE — 临床标准 A/B/C/X（绿/蓝/橙/红），不用抽卡稀有度
   ========================================================================= */
export type EvidenceLevel = 'A' | 'B' | 'C' | 'X';

export const EvidenceBadge = ({
  level = 'A',
  showLabel = true,
}: {
  level?: EvidenceLevel;
  showLabel?: boolean;
}) => {
  const map: Record<EvidenceLevel, [string, string]> = {
    A: ['强证据', 'var(--safe)'],
    B: ['中等证据', 'var(--info)'],
    C: ['弱证据', 'var(--caution)'],
    X: ['无证据', 'var(--danger)'],
  };
  const [label, color] = map[level] || map.B;
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 7,
      padding: '3px 10px',
      background: 'var(--ivory)',
      border: `2px solid ${color}`,
      borderRadius: 6,
      whiteSpace: 'nowrap',
    }}>
      <span style={{ fontFamily: 'var(--font-hud)', color, fontSize: 13, fontWeight: 700 }}>{level}</span>
      {showLabel && <span style={{ fontFamily: 'var(--font-ui-accent)', fontSize: 10, fontWeight: 700, color: 'var(--fg-2)', letterSpacing: '0.06em' }}>{label}</span>}
    </span>
  );
};

/** AA 修正：引用角标是正文级文字，pink-deep on cream = 3.20 FAIL → pink-text = 5.18。 */
export const CitationRef = ({ n }: { n: number | string }) => (
  <sup style={{ color: 'var(--sakura-pink-text)', fontFamily: 'var(--font-hud)', fontSize: 11, fontWeight: 700, margin: '0 2px' }}>[{n}]</sup>
);

/* =========================================================================
   MOON PHASE — 真实月相圆盘
   ========================================================================= */
/**
 * 只负责按 fill 画几何，不含日期计算。
 * fill 必须由【客户端】在运行时计算传入 —— 构建期计算会把相位冻结在部署当天，
 * 最大可偏差 14 天（写着满月画着新月），直接违反 DESIGN_SYSTEM
 * 「月相挂件必须是真实当日月相 / 无含义装饰数据」红线。见 SplashNav.astro。
 *
 * 明暗界线：第二段弧的 x 半径随 clip 从 +r 线性变到 −r，
 * 扫描方向在 clip 过 0.5 时翻转 —— 逐字移植自原型，勿改。
 */
export const MoonPhase = ({
  fill = 1,
  size = 26,
  color = 'var(--honey)',
}: {
  fill?: number;
  size?: number;
  color?: string;
}) => {
  const r = 11;
  const clip = Math.max(0, Math.min(1, fill));
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r={r} fill="var(--ivory)" stroke="var(--ink)" strokeWidth="2" />
      <path
        d={`M 12 ${12 - r} A ${r} ${r} 0 0 1 12 ${12 + r} A ${r * (1 - 2 * clip)} ${r} 0 0 ${clip < 0.5 ? 0 : 1} 12 ${12 - r} Z`}
        fill={color}
      />
    </svg>
  );
};

/* =========================================================================
   BACKGROUND — 手账底纸 with sakura petals
   ========================================================================= */
/**
 * 花瓣散布是【确定性】的：x=(i*137)%100 / y=(i*193)%100 / r=(i*47)%360，
 * 纯整数运算无 Math.random → 构建期渲染与运行期逐像素相同 → 可安全零 JS 静态化。
 * 逐字移植，勿"优化"成随机分布。
 */
export const CarnivalBg = () => (
  <div aria-hidden="true" style={{
    position: 'fixed',
    inset: 0,
    zIndex: 0,
    pointerEvents: 'none',
    background: `
      radial-gradient(ellipse at 50% 88%, rgba(168, 230, 201, 0.06) 0%, transparent 46%),
      radial-gradient(ellipse at 8% 92%, rgba(212, 197, 245, 0.05) 0%, transparent 40%)
    `,
  }}>
    {/* Grid paper sheen */}
    <div style={{
      position: 'absolute',
      inset: 0,
      opacity: 0.25,
      backgroundImage:
        'linear-gradient(rgba(74,40,56,0.06) 1px, transparent 1px),' +
        'linear-gradient(90deg, rgba(74,40,56,0.06) 1px, transparent 1px)',
      backgroundSize: '24px 24px',
    }} />
    {/* 漫画网点（二相乐园）— 两角淡出，低噪 */}
    <div style={{
      position: 'absolute',
      inset: 0,
      opacity: 0.26,
      backgroundImage: 'radial-gradient(circle at 1.5px 1.5px, rgba(229,87,139,0.22) 1px, transparent 0)',
      backgroundSize: '7px 7px',
      WebkitMaskImage: 'radial-gradient(ellipse 50% 38% at 100% 0%, black 0%, transparent 100%)',
      maskImage: 'radial-gradient(ellipse 50% 38% at 100% 0%, black 0%, transparent 100%)',
    }} />
    <div style={{
      position: 'absolute',
      inset: 0,
      opacity: 0.2,
      backgroundImage: 'radial-gradient(circle at 1.5px 1.5px, rgba(155,125,212,0.22) 1px, transparent 0)',
      backgroundSize: '9px 9px',
      WebkitMaskImage: 'radial-gradient(ellipse 45% 34% at 0% 100%, black 0%, transparent 100%)',
      maskImage: 'radial-gradient(ellipse 45% 34% at 0% 100%, black 0%, transparent 100%)',
    }} />
    {/* 画卷纸纹 — 极淡斜向纤维 */}
    <div style={{
      position: 'absolute',
      inset: 0,
      opacity: 0.35,
      background: 'repeating-linear-gradient(93deg, rgba(74,40,56,0.022) 0 2px, transparent 2px 5px)',
    }} />
    {/* Scattered sakura petals — 稀疏、避开版心 */}
    <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0 }}>
      {Array.from({ length: 8 }).map((_, i) => {
        const x = (i * 137) % 100;
        const y = (i * 193) % 100;
        const c = ['#FFA8C5', '#FFD4E0', '#FFE89C', '#A8E6C9'][i % 4];
        const r = (i * 47) % 360;
        return (
          <g key={i} transform={`translate(${x}%, ${y}%) rotate(${r}) scale(${0.35 + (i % 3) * 0.15})`} opacity={0.3}>
            <ellipse cx="0" cy="-10" rx="4" ry="8" fill={c} />
            <ellipse cx="9.5" cy="-3" rx="4" ry="8" fill={c} transform="rotate(72)" />
            <ellipse cx="6" cy="8" rx="4" ry="8" fill={c} transform="rotate(144)" />
            <ellipse cx="-6" cy="8" rx="4" ry="8" fill={c} transform="rotate(216)" />
            <ellipse cx="-9.5" cy="-3" rx="4" ry="8" fill={c} transform="rotate(288)" />
          </g>
        );
      })}
    </svg>
  </div>
);

/* =========================================================================
   CLIP BUTTON — legacy 别名，仅 urgent 屏 1 处使用
   ========================================================================= */
/** 就是一个映射到 .btn-* 类的 <button>。保留 href 形态以便做导航链接。 */
export const ClipButton = ({
  variant = 'flame',
  href,
  onClick,
  children,
  style = {},
}: {
  variant?: 'flame' | 'primary' | 'gold' | 'ghost' | 'mint' | 'arcade';
  href?: string;
  onClick?: () => void;
  children: ReactNode;
  style?: CSSProperties;
}) => {
  const cls = ({
    flame: 'btn-flame', primary: 'btn-flame', gold: 'btn-gold',
    ghost: 'btn-ghost', mint: 'btn-mint', arcade: 'btn-arcade',
  } as const)[variant] || 'btn-flame';
  if (href) {
    return <a href={href} className={cls} style={{ display: 'inline-flex', alignItems: 'center', ...style }}>{children}</a>;
  }
  return <button type="button" className={cls} onClick={onClick} style={style}>{children}</button>;
};
