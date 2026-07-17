/**
 * InjectToolScreen — 注射计算器（剂量↔体积 + 28 天血药曲线）
 * 视觉移植自 design_files/ui_kits/yakuten/inject-tool-screen.jsx (153 行)
 *
 * ═══════════════════════════════════════════════════════════════════════
 *  ⚠️ 曲线的【纵轴标定】刻意偏离原型 —— 理由见下，请在 PR 复核
 * ═══════════════════════════════════════════════════════════════════════
 *
 * 原型 :16-24 的曲线：
 *     const ka = 0.9, ke = Math.log(2) / 4.5, K = 70;
 *     c += K * sel * (Math.exp(-ke*dt) - Math.exp(-ka*dt));
 *
 * 【形状】是有据的：原型 :141 注明「半衰期 4.5 天 · 峰值 2–3 天 (Oriowo 1980)」，
 * 这是 EV 肌注的经典 PK 文献 → ka/ke 保留，逐字不动。
 *
 * 【绝对值】不是：K=70 是一个没有出处的缩放常数，且公式漏掉了 Bateman 的
 * ka/(ka−ke) 归一化项。但图上又画着真实的「100–200 目标带」与「300 风险线」
 * （pg/mL），等于声称 y 轴是 pg/mL —— 于是用户读到的绝对值是编出来的。
 * 这同时踩 DESIGN_SYSTEM「🚫 Never — 无含义装饰数据」。
 *
 * 修法：不是删曲线，而是用仓库的权威数据【锚定】纵轴 ——
 * injection-doses.json 的 `expectedE2Range` 就是每档剂量的真实预期 E2 谷值
 * （1mg→30-60 · 5mg→100-200 …，有来源）。令曲线的稳态谷值等于该区间中点，
 * 反推缩放系数。于是：形状来自文献，绝对值来自数据，目标带与风险线才真正有意义。
 *
 * 7mg / 10mg 的 expectedE2Range 是 null —— 因为这两档【本就不该被使用】。
 * 没有可靠的预期谷值就【不画曲线】，而不是外推一条看起来很像回事的假曲线。
 */
import { useState } from 'react';
import { injection } from '../data';
import { PageHead, InkCard, Chip } from '../Primitives';

/* PK 常数 —— 逐字取自原型 :16（来源 Oriowo 1980，EV 肌注） */
const KA = 0.9;                    // /day，吸收速率
const KE = Math.log(2) / 4.5;      // /day，半衰期 4.5 天
const INTERVAL = 7;                // 天，每 7 天一针（与 data.frequency 「每5-7天」一致取上界）

/* SVG 几何 —— 逐字取自原型 :25 */
const DAYS = 28, W = 560, H = 190, PAD = 34;

/** 未缩放的一室叠加形状（原型公式去掉 K*sel 后的纯形状部分） */
function shape(t: number): number {
  let c = 0;
  for (let inj = 0; inj <= t; inj += INTERVAL) {
    const dt = t - inj;
    c += Math.exp(-KE * dt) - Math.exp(-KA * dt);
  }
  return c;
}

/** 解析 "100-200 pg/mL" → 中点 150。无法解析返回 null。 */
function troughMidpoint(range?: string | null): number | null {
  if (!range) return null;
  const m = range.match(/(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)/);
  if (!m) return null;
  return (parseFloat(m[1]) + parseFloat(m[2])) / 2;
}

export default function InjectToolScreen() {
  const doses = injection.doses || [];
  /* 【不写 localStorage】：原型 :9 写 yak_inject_mg，但设计包 README 的
     State Management 段并未列出它，且「Interactions」写明「输入值不持久化」。
     以 README（规格）为准。默认 3mg 与原型一致。 */
  const [sel, setSel] = useState<number>(() => (doses.some((d) => d.targetMg === 3) ? 3 : (doses[0]?.targetMg ?? 3)));

  const dose = doses.find((d) => d.targetMg === sel) || doses[0];
  /* 危险分级逐字保留原型 :12-13 */
  const banned = sel >= 10;
  const risky = sel >= 7 && !banned;

  /* 纵轴锚定：稳态谷值（第 5 针前，t=28）对齐 expectedE2Range 的中点 */
  const trough = troughMidpoint(dose?.expectedE2Range);
  const canPlot = trough != null;
  const scale = canPlot ? trough / shape(DAYS) : 0;
  const conc = (t: number) => shape(t) * scale;

  /* maxY 沿用原型语义（至少容纳 320，或峰值 ×1.15），只是峰值现在是有据的 */
  const maxY = canPlot ? Math.max(320, conc(2.4) * 1.15) : 320;
  const yOf = (v: number) => H - 24 - (Math.min(v, maxY) / maxY) * (H - 44);

  const pts: string[] = [];
  if (canPlot) {
    for (let t = 0; t <= DAYS; t += 0.25) {
      const x = PAD + (t / DAYS) * (W - PAD - 10);
      const y = H - 24 - (Math.min(conc(t), maxY) / maxY) * (H - 44);
      pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
    }
  }

  return (
    <div className="yk-page yk-page--narrow">
      <PageHead
        volume="卷四" tab="注射" kicker="TOOLS · 注射计算器"
        tapeColor="var(--sakura-pink)" pattern="dots"
        title="注射计算器" accent="EV"
        lede={`${injection.drug} · ${injection.concentration} · ${injection.frequency}。选择目标剂量，得到抽取体积和预期 E2 谷值范围。`}
      />

      {/* 剂量选择 */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 26 }} role="group" aria-label="选择目标剂量">
        {doses.map((d) => {
          const isSel = d.targetMg === sel;
          const dDanger = d.targetMg >= 10;
          const dWarn = d.targetMg >= 7 && !dDanger;
          return (
            <button
              key={d.targetMg}
              type="button"
              onClick={() => setSel(d.targetMg)}
              aria-pressed={isSel}
              style={{
                minWidth: 64, minHeight: 44, padding: '8px 16px', cursor: 'pointer',
                borderRadius: 12, border: '2px solid var(--ink)',
                /* AA：原型选中态白字落 danger(3.4)/honey(1.8)/sakura-pink(1.8) 全不可读。
                   → 底色保留（语义不丢），文字统一墨色（on danger 4.0 / honey 8.9 / pink 7.1）。
                   注：danger 底墨字 4.0 对 15px 700 仍略低于 4.5 → 用 danger-deep 白字更稳，
                   但那会让「禁用档」比「警告档」视觉更弱 —— 故此处保留 danger 底 + 墨字，
                   并靠 ✕ 符号与下方 flame 卡片双重强化。 */
                background: isSel
                  ? (dDanger ? 'var(--danger)' : dWarn ? 'var(--honey)' : 'var(--sakura-pink)')
                  : 'var(--ivory)',
                color: 'var(--ink)',
                fontFamily: 'var(--font-hud)', fontWeight: 700, fontSize: 15,
                boxShadow: isSel ? '3px 3px 0 var(--ink)' : '2px 2px 0 var(--ink)',
                transform: isSel ? 'translate(-1px,-1px)' : 'none',
                transition: 'all .15s', whiteSpace: 'nowrap',
              }}
            >
              {d.targetMg} mg{dDanger ? ' ✕' : dWarn ? ' !' : ''}
            </button>
          );
        })}
      </div>

      <div className="yk-grid yk-grid--2" style={{ marginTop: 24, alignItems: 'start' }}>
        {/* 换算结果 + 注射器 */}
        <InkCard variant={banned ? 'flame' : 'paper'} hoverLift={false}>
          <div className="yk-kicker" style={{ marginBottom: 14, color: banned ? '#fff' : undefined }}>DRAW · 抽取体积</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'var(--font-hud)', fontSize: 44, fontWeight: 700, color: banned ? '#fff' : 'var(--fg-1)' }}>
              {dose?.volumeMl != null ? dose.volumeMl.toFixed(2) : '—'}
            </span>
            <span style={{ fontFamily: 'var(--font-hud)', fontSize: 16, color: banned ? 'var(--cream)' : 'var(--fg-2)', fontWeight: 700 }}>mL</span>
            <Chip color={banned ? 'var(--ink)' : 'var(--sakura-pink-text)'} bg="var(--ivory)">{sel} mg · 1mL 注射器</Chip>
          </div>
          {/* 注射器刻度 */}
          <div style={{ position: 'relative', height: 34, borderRadius: 8, border: '2px solid var(--ink)', background: 'var(--ivory)', overflow: 'hidden' }}>
            <div style={{
              position: 'absolute', top: 0, bottom: 0, left: 0,
              width: `${Math.min(100, (dose?.volumeMl || 0) * 100)}%`,
              background: banned ? 'var(--danger)' : 'linear-gradient(90deg, var(--sakura-blush), var(--sakura-pink))',
              transition: 'width .3s',
            }} />
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} aria-hidden="true" style={{ position: 'absolute', left: `${(i + 1) * 10}%`, top: 0, height: i === 4 ? 14 : 9, width: 1.5, background: 'var(--ink-faint)' }} />
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-hud)', fontSize: 10, color: banned ? 'var(--cream)' : 'var(--fg-2)', marginTop: 4, fontWeight: 700 }}>
            <span>0</span><span>0.5</span><span>1.0 mL</span>
          </div>

          <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13, color: banned ? 'var(--cream)' : 'var(--fg-1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
              <span className="yk-meta-label" style={{ color: banned ? 'var(--cream)' : 'var(--fg-2)' }}>适用</span>
              <span style={{ fontWeight: 600, textAlign: 'right' }}>{dose?.applicableTo || '不适用于 GAHT'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
              <span className="yk-meta-label" style={{ color: banned ? 'var(--cream)' : 'var(--fg-2)' }}>预期 E2 谷值</span>
              <span className="yk-nowrap" style={{ fontFamily: 'var(--font-hud)', fontWeight: 700 }}>{dose?.expectedE2Range || '—'}</span>
            </div>
          </div>

          {dose?.warning && (
            <div role="alert" style={{
              marginTop: 16, padding: '10px 14px', borderRadius: 8,
              background: banned ? 'var(--ink)' : 'var(--butter)',
              color: banned ? '#fff' : 'var(--fg-1)',
              border: '2px solid var(--ink)', fontSize: 13, fontWeight: 600, lineHeight: 1.6,
            }}>⚠ {dose.warning}</div>
          )}
        </InkCard>

        {/* 血药浓度曲线 */}
        <InkCard variant="paper" hoverLift={false}>
          <div className="yk-kicker" style={{ marginBottom: 10 }}>SIMULATE · 28 天血药曲线（示意）</div>
          {canPlot ? (
            <>
              <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }} role="img" aria-label={`${sel} mg 每 7 天注射的 28 天 E2 血药浓度模拟曲线，预期谷值 ${dose?.expectedE2Range}`}>
                {/* 目标带 100–200 */}
                <rect x={PAD} y={yOf(200)} width={W - PAD - 10} height={yOf(100) - yOf(200)} fill="var(--mint)" opacity="0.45" />
                {/* 危险线 300 */}
                <line x1={PAD} x2={W - 10} y1={yOf(300)} y2={yOf(300)} stroke="var(--danger)" strokeWidth="1.5" strokeDasharray="5 4" />
                <text x={W - 12} y={yOf(300) - 5} textAnchor="end" fontSize="10" fill="var(--danger-deep)" fontFamily="var(--font-hud)" fontWeight="700">300 风险线</text>
                <text x={PAD + 4} y={yOf(150) + 3} fontSize="10" fill="var(--ink)" fontFamily="var(--font-hud)" fontWeight="700">目标 100–200</text>
                {/* 注射时刻 */}
                {[0, 7, 14, 21].map((d) => (
                  <g key={d}>
                    <line x1={PAD + (d / DAYS) * (W - PAD - 10)} x2={PAD + (d / DAYS) * (W - PAD - 10)} y1={18} y2={H - 24} stroke="var(--ink-faint)" strokeWidth="1" strokeDasharray="3 3" />
                    <text x={PAD + (d / DAYS) * (W - PAD - 10)} y={H - 8} textAnchor="middle" fontSize="10" fill="var(--fg-2)" fontFamily="var(--font-hud)" fontWeight="700">D{d}</text>
                  </g>
                ))}
                {/* 曲线 */}
                <polyline points={pts.join(' ')} fill="none" stroke="var(--sakura-pink-aa)" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
                {/* 轴 */}
                <line x1={PAD} x2={W - 10} y1={H - 24} y2={H - 24} stroke="var(--ink)" strokeWidth="2" />
                <line x1={PAD} x2={PAD} y1={14} y2={H - 24} stroke="var(--ink)" strokeWidth="2" />
                <text x={8} y={yOf(maxY) + 10} fontSize="10" fill="var(--fg-2)" fontFamily="var(--font-hud)" fontWeight="700">{Math.round(maxY)}</text>
                <text x={8} y={H - 28} fontSize="10" fill="var(--fg-2)" fontFamily="var(--font-hud)" fontWeight="700">0</text>
              </svg>
              <p style={{ fontSize: 11.5, color: 'var(--fg-2)', lineHeight: 1.6, margin: '10px 0 0' }}>
                一室模型示意，半衰期 4.5 天 · 峰值 2–3 天 (Oriowo 1980)。纵轴按本剂量的预期谷值
                （{dose?.expectedE2Range}）标定。个体差异大，以血检谷值为准。
              </p>
            </>
          ) : (
            /* 无可靠预期谷值 → 不画假曲线。这比外推一条看起来很像回事的线诚实。 */
            <div style={{
              padding: '28px 20px', textAlign: 'center',
              border: '2px dashed var(--ink-faint)', borderRadius: 10, background: 'var(--ivory)',
            }}>
              <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 15, marginBottom: 6 }}>
                该剂量没有可靠的预期谷值数据
              </div>
              <p style={{ fontSize: 12.5, color: 'var(--fg-2)', lineHeight: 1.7, margin: 0 }}>
                {sel} mg 单次注射不属于任何指南推荐的 GAHT 方案，因此没有可引用的血药浓度数据。
                这里不展示外推曲线 —— 编一条看起来合理的线，比不画更危险。
              </p>
            </div>
          )}
        </InkCard>
      </div>

      <InkCard variant="cream" hoverLift={false} style={{ marginTop: 24, padding: '14px 20px', fontSize: 12, color: 'var(--fg-2)', lineHeight: 1.7 }}>
        {/* AA：原型 --danger on cream = 3.20 FAIL → danger-deep 4.90 */}
        <strong style={{ color: 'var(--danger-deep)' }}>红线 ·</strong> 单次 ≥10 mg 禁止；间隔 &lt;5 天且 &gt;5 mg 禁止 (Rothman 2024)。峰值 E2 &gt;1000 pg/mL 显著增加 VTE 与肝损伤风险。
      </InkCard>
    </div>
  );
}
