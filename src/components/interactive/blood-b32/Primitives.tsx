import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import type { Level } from '../../../utils/blood/metrics';
import { b32Color, b32Tint, b32LevelLabelZh } from '../../../utils/blood/scoring';
import { getB32Copy, type Locale } from '../../../utils/blood/i18n';

export const SakuraLogo = ({ size = 22, petalR = 5.5 }: { size?: number; petalR?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    {[0, 1, 2, 3, 4].map((i) => (
      <circle
        key={i}
        cx={12 + petalR * Math.cos(((i * 72 - 90) * Math.PI) / 180)}
        cy={12 + petalR * Math.sin(((i * 72 - 90) * Math.PI) / 180)}
        r="3.5"
        fill="var(--b32-sakura)"
      />
    ))}
    <circle cx="12" cy="12" r="2" fill="var(--b32-honey)" />
  </svg>
);

export const StickerBadge = ({
  color = 'var(--b32-sakura)',
  size = 56,
  rotate = -6,
  children,
  style = {},
}: {
  color?: string;
  size?: number;
  rotate?: number;
  children?: ReactNode;
  style?: CSSProperties;
}) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: '50%',
      background: color,
      border: '1.5px solid rgba(74, 40, 56, 0.25)',
      boxShadow: '0 4px 10px rgba(74, 40, 56, 0.15), inset 0 1px 0 rgba(255,255,255,0.6)',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      transform: `rotate(${rotate}deg)`,
      fontFamily: 'var(--b32-font-accent)',
      fontWeight: 700,
      color: 'var(--b32-ink)',
      textAlign: 'center',
      ...style,
    }}
  >
    {children}
  </div>
);

export type WashiColor = 'pink' | 'mint' | 'butter' | 'sky' | 'lavender';

export const WashiTape = ({
  color = 'pink',
  width = 80,
  rotate = -3,
  style = {},
}: {
  color?: WashiColor;
  width?: number;
  rotate?: number;
  style?: CSSProperties;
}) => {
  const palettes: Record<WashiColor, [string, string]> = {
    pink: ['rgba(255, 168, 197, 0.9)', 'rgba(229, 87, 139, 0.85)'],
    mint: ['rgba(168, 230, 201, 0.9)', 'rgba(90, 200, 157, 0.85)'],
    butter: ['rgba(255, 232, 156, 0.95)', 'rgba(245, 200, 66, 0.85)'],
    sky: ['rgba(168, 213, 245, 0.9)', 'rgba(91, 168, 224, 0.85)'],
    lavender: ['rgba(212, 197, 245, 0.9)', 'rgba(155, 125, 212, 0.85)'],
  };
  const [a, b] = palettes[color];
  return (
    <div
      aria-hidden="true"
      style={{
        display: 'inline-block',
        width,
        height: 16,
        background: `repeating-linear-gradient(45deg, ${a} 0 6px, ${b} 6px 12px)`,
        borderLeft: '1px dashed rgba(255,255,255,0.65)',
        borderRight: '1px dashed rgba(255,255,255,0.65)',
        boxShadow: '0 2px 4px rgba(74, 40, 56, 0.15)',
        transform: `rotate(${rotate}deg)`,
        ...style,
      }}
    />
  );
};

export const LevelChip = ({
  level,
  size = 'sm',
  label: override,
  locale,
}: {
  level: Level;
  size?: 'sm' | 'lg';
  label?: string;
  locale: Locale;
}) => {
  const copy = getB32Copy(locale);
  const color = b32Color(level);
  const tint = b32Tint(level);
  const zhLabel = b32LevelLabelZh(level);
  const label =
    override ??
    (locale === 'zh'
      ? zhLabel
      : {
          target: copy.levelTarget,
          safe: copy.levelSafe,
          caution: copy.levelCaution,
          danger: copy.levelDanger,
          empty: copy.levelEmpty,
        }[level]);
  const pad = size === 'lg' ? '6px 14px' : '4px 10px';
  const fs = size === 'lg' ? 12 : 11;
  return (
    <span className="b32-chip" style={{ background: tint, color, padding: pad, fontSize: fs, fontWeight: 700 }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: color }} />
      {label}
    </span>
  );
};

export const LevelDot = ({ level, size = 8 }: { level: Level; size?: number }) => (
  <span
    aria-hidden="true"
    style={{
      display: 'inline-block',
      width: size,
      height: size,
      borderRadius: '50%',
      background: b32Color(level),
      flexShrink: 0,
    }}
  />
);

export const SectionLabel = ({
  children,
  color = 'var(--b32-sakura-deep)',
  tape,
}: {
  children: ReactNode;
  color?: string;
  tape?: WashiColor;
}) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
    {tape && <WashiTape color={tape} width={48} rotate={-4} />}
    <span
      style={{
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '0.16em',
        textTransform: 'uppercase',
        color,
        fontFamily: 'var(--b32-font-accent)',
      }}
    >
      {children}
    </span>
  </div>
);

export interface RingSegment {
  weight: number;
  color: string;
}

export const RingGauge = ({
  size = 200,
  stroke = 16,
  segments = [],
  score,
  label,
  sublabel,
}: {
  size?: number;
  stroke?: number;
  segments?: RingSegment[];
  score?: number | null;
  label?: string;
  sublabel?: string;
}) => {
  const r = (size - stroke) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circ = 2 * Math.PI * r;
  const gap = segments.length > 1 ? 0.025 * circ : 0;
  const totalGap = gap * segments.length;
  const drawable = circ - totalGap;
  const totalW = segments.reduce((s, x) => s + x.weight, 0) || 1;
  let acc = 0;

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }} aria-hidden="true">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(74, 40, 56, 0.08)" strokeWidth={stroke} />
        {segments.map((seg, i) => {
          const len = (seg.weight / totalW) * drawable;
          const dasharray = `${len} ${circ - len}`;
          const dashoffset = -acc;
          acc += len + gap;
          return (
            <circle
              key={i}
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke={seg.color}
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={dasharray}
              strokeDashoffset={dashoffset}
              style={{ transition: 'stroke-dasharray .7s var(--b32-ease-out)' }}
            />
          );
        })}
      </svg>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: 16,
        }}
      >
        {score != null && (
          <div
            style={{
              fontFamily: 'var(--b32-font-num)',
              fontSize: size * 0.32,
              fontWeight: 800,
              color: 'var(--b32-ink)',
              lineHeight: 1,
              letterSpacing: '-0.03em',
            }}
          >
            {score}
          </div>
        )}
        {label && (
          <div
            style={{
              fontSize: 12,
              color: 'var(--b32-ink-2)',
              marginTop: 6,
              fontWeight: 700,
              letterSpacing: '0.04em',
              fontFamily: 'var(--b32-font-accent)',
            }}
          >
            {label}
          </div>
        )}
        {sublabel && (
          <div style={{ fontSize: 11, color: 'var(--b32-ink-3)', marginTop: 2 }}>{sublabel}</div>
        )}
      </div>
    </div>
  );
};

export const Sparkline = ({
  points,
  width = 82,
  height = 30,
  color = 'var(--b32-ink-2)',
  showDots = true,
  filled = true,
}: {
  points: { value: number }[];
  width?: number;
  height?: number;
  color?: string;
  showDots?: boolean;
  filled?: boolean;
}) => {
  if (!points || points.length === 0) {
    return <div style={{ width, height, background: 'var(--b32-bg-2)', borderRadius: 8 }} />;
  }
  if (points.length === 1) {
    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
        <circle cx={width / 2} cy={height / 2} r={3.5} fill={color} />
      </svg>
    );
  }
  const vs = points.map((p) => p.value);
  const min = Math.min(...vs);
  const max = Math.max(...vs);
  const span = max - min || 1;
  const xs = points.map((_, i) => (i / (points.length - 1)) * (width - 8) + 4);
  const ys = vs.map((v) => height - 4 - ((v - min) / span) * (height - 8));
  const d = xs.map((x, i) => `${i === 0 ? 'M' : 'L'} ${x} ${ys[i]}`).join(' ');
  const area = `${d} L ${xs[xs.length - 1]} ${height - 2} L ${xs[0]} ${height - 2} Z`;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }} aria-hidden="true">
      {filled && <path d={area} fill={color} opacity="0.1" />}
      <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {showDots &&
        xs.map((x, i) => (
          <circle
            key={i}
            cx={x}
            cy={ys[i]}
            r={i === xs.length - 1 ? 3 : 1.5}
            fill={i === xs.length - 1 ? color : 'white'}
            stroke={color}
            strokeWidth="1.2"
          />
        ))}
    </svg>
  );
};

export const B32Sheet = ({
  open,
  onClose,
  children,
  title,
  subtitle,
  actions,
  fullHeight,
  maxWidth = 560,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  fullHeight?: boolean;
  maxWidth?: number;
}) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;
  const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 820;

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 200,
          background: 'rgba(74, 40, 56, 0.38)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          animation: 'b32-fade-in .22s ease-out',
        }}
      />
      <div
        className="b32-slide-up"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={{
          position: 'fixed',
          left: isDesktop ? '50%' : 0,
          right: isDesktop ? 'auto' : 0,
          bottom: isDesktop ? 'auto' : 0,
          top: isDesktop ? '50%' : 'auto',
          transform: isDesktop ? 'translate(-50%, -50%)' : 'none',
          width: isDesktop ? `min(${maxWidth}px, calc(100vw - 40px))` : '100%',
          maxHeight: isDesktop ? '88vh' : fullHeight ? '100vh' : '92vh',
          height: !isDesktop && fullHeight ? '100vh' : 'auto',
          background: 'var(--b32-paper)',
          borderRadius: isDesktop ? 'var(--b32-r-xl)' : fullHeight ? 0 : '28px 28px 0 0',
          zIndex: 201,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: isDesktop ? '0 24px 70px rgba(74, 40, 56, 0.25)' : '0 -14px 40px rgba(74, 40, 56, 0.2)',
          border: '1.5px solid rgba(74, 40, 56, 0.15)',
        }}
      >
        {!isDesktop && !fullHeight && (
          <div
            style={{
              alignSelf: 'center',
              width: 44,
              height: 4,
              background: 'var(--b32-ink-4)',
              borderRadius: 999,
              marginTop: 10,
            }}
          />
        )}
        {(title || actions) && (
          <div
            style={{
              padding: '16px 22px 12px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: 12,
            }}
          >
            <div style={{ minWidth: 0, flex: 1 }}>
              {subtitle && (
                <div
                  style={{
                    fontSize: 11,
                    color: 'var(--b32-sakura-deep)',
                    fontWeight: 700,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    fontFamily: 'var(--b32-font-accent)',
                  }}
                >
                  {subtitle}
                </div>
              )}
              {title && (
                <div
                  style={{
                    fontSize: 22,
                    fontWeight: 700,
                    color: 'var(--b32-ink)',
                    fontFamily: 'var(--b32-font-display)',
                  }}
                >
                  {title}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8, flexShrink: 0, alignItems: 'center' }}>
              {actions}
              <button
                onClick={onClose}
                aria-label="close"
                type="button"
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  background: 'var(--b32-bg-2)',
                  border: '1.5px solid rgba(74,40,56,0.15)',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--b32-ink-2)',
                  fontSize: 15,
                }}
              >
                ✕
              </button>
            </div>
          </div>
        )}
        <div style={{ flex: 1, overflow: 'auto', padding: '0 22px 28px' }}>{children}</div>
      </div>
    </>
  );
};

/** useIsDesktop hook — 820px breakpoint, resize listener */
export function useIsDesktop(breakpoint = 820): boolean {
  const [isDesktop, setIsDesktop] = useState(() => typeof window !== 'undefined' && window.innerWidth >= breakpoint);
  useEffect(() => {
    const on = () => setIsDesktop(window.innerWidth >= breakpoint);
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, [breakpoint]);
  return isDesktop;
}
