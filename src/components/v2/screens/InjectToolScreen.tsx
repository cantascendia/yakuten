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

export default function InjectToolScreen() {
  const doses = injection.doses || [];
  /* 【不写 localStorage】：原型 :9 写 yak_inject_mg，但设计包 README 的
     State Management 段并未列出它，且「Interactions」写明「输入值不持久化」。
     以 README（规格）为准。默认 3mg 与原型一致。 */
  const [sel, setSel] = useState<number>(() => (doses.some((d) => d.targetMg === 3) ? 3 : (doses[0]?.targetMg ?? 3)));

  const dose = doses.find((d) => d.targetMg === sel) || doses[0];
  /* 危险分级：banned 逐字保留原型 :12。
     （原型的 risky = sel>=7 从未被使用，不移植；剂量按钮上的 ! / ✕ 标记独立计算。） */
  const banned = sel >= 10;

  /* ── 曲线降级为【无单位相对示意】（review #4）──────────────────────────
     原方案用 expectedE2Range 的谷值中点锚定纵轴，标成绝对 pg/mL。但只对齐一个
     谷值救不了整条曲线：本一室形状下 5 mg 峰值算出 ~277 pg/mL，而 Oriowo 原文
     5 mg IM EV 平均峰值约 667（CI 457–983）—— 峰值被严重低估，且图上还画着
     100–200 目标带和 300 风险线，等于给用户一个可据以判断「达标/超标」的假刻度。

     现改为：把形状归一化到自身峰值（0–1 相对），y 轴无刻度、无目标带、无风险线。
     曲线只教一件真实且有据的事 —— 血药浓度【何时高、何时低】（注射后 2–3 天达峰，
     下次注射前为谷）→ 所以血检要采谷值。绝对高度取决于剂量与个体，不在本图声称。
     形状本身与剂量无关（同一条曲线），因此对所有剂量一致展示。

     ⚠️ 归一化必须用【整个展示窗口的真实最大值】，不能用首针峰 shape(2.4)：
     shape(t) 含每 7 天重复注射的累积，第 2 针起峰值会超过首针（实测第 4 针后
     达 1.62×首针）。若除以首针峰，后段 rel>1 会被 yOf 的 clamp 截平 → 峰顶失真、
     误导波动形状。（cross-model review 抓到的 bug。） */
  const SAMPLE_STEP = 0.25;
  let peak = 0;
  for (let t = 0; t <= DAYS; t += SAMPLE_STEP) peak = Math.max(peak, shape(t));
  const rel = (t: number) => (peak > 0 ? shape(t) / peak : 0);   // 0–1 相对值，全窗口归一
  const yOf = (r: number) => H - 24 - Math.max(0, Math.min(1, r)) * (H - 44);

  const pts: string[] = [];
  {
    for (let t = 0; t <= DAYS; t += 0.25) {
      const x = PAD + (t / DAYS) * (W - PAD - 10);
      const y = yOf(rel(t));
      pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
    }
  }

  return (
    <div className="yk-page yk-page--narrow">
      <PageHead
        tab="注射" kicker="TOOLS · 注射计算器"
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

        {/* 波动形状示意 —— 无单位相对，无绝对刻度、无目标带、无风险线 */}
        <InkCard variant="paper" hoverLift={false}>
          <div className="yk-kicker" style={{ marginBottom: 10 }}>SHAPE · 血药浓度波动形状（相对示意）</div>
          <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }} role="img" aria-label="每 7 天注射一次的血药浓度波动形状示意：注射后 2–3 天达峰，下次注射前为谷。纵轴为相对高度，非绝对浓度。">
            {/* 注射时刻 */}
            {[0, 7, 14, 21].map((d) => (
              <g key={d}>
                <line x1={PAD + (d / DAYS) * (W - PAD - 10)} x2={PAD + (d / DAYS) * (W - PAD - 10)} y1={18} y2={H - 24} stroke="var(--ink-faint)" strokeWidth="1" strokeDasharray="3 3" />
                <text x={PAD + (d / DAYS) * (W - PAD - 10)} y={H - 8} textAnchor="middle" fontSize="10" fill="var(--fg-2)" fontFamily="var(--font-hud)" fontWeight="700">D{d}</text>
              </g>
            ))}
            {/* 曲线 —— 归一化到自身峰值（0–1 相对），banned 时红色 */}
            <polyline points={pts.join(' ')} fill="none" stroke={banned ? 'var(--danger-deep)' : 'var(--sakura-pink-aa)'} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
            {/* 轴：只标「峰 / 谷」相对方向，【无数字刻度】 */}
            <line x1={PAD} x2={W - 10} y1={H - 24} y2={H - 24} stroke="var(--ink)" strokeWidth="2" />
            <line x1={PAD} x2={PAD} y1={14} y2={H - 24} stroke="var(--ink)" strokeWidth="2" />
            <text x={6} y={26} fontSize="10" fill="var(--fg-2)" fontFamily="var(--font-ui-accent)" fontWeight="700">峰</text>
            <text x={6} y={H - 28} fontSize="10" fill="var(--fg-2)" fontFamily="var(--font-ui-accent)" fontWeight="700">谷</text>
          </svg>
          <p style={{ fontSize: 11.5, color: 'var(--fg-2)', lineHeight: 1.7, margin: '10px 0 0' }}>
            这张图<strong>只表示浓度的波动形状</strong>（注射后 2–3 天达峰、下次注射前为谷，Oriowo 1980）——
            <strong>纵轴是相对高度，不是 pg/mL</strong>。峰值的绝对高度取决于剂量与个体，本图不作声称。
            要点：<strong>血检必须在谷值采样</strong>（下次注射前当天），否则数值不可比。
          </p>
        </InkCard>
      </div>

      {/* 红线表述与引用绑定对齐站内 SSOT injection.mdx:220-227（review #5）：
          原型把两条红线合并归在「(Rothman 2024)」下，但仓库把它们分别归因：
            · 单次 ≥10 mg → 峰值 >1000 pg/mL → VTE  = Rothman 2024
            · 间隔 <5 天且 >5 mg（叠加累积）        = Kanin 2025
          且「5 mg/周」是 Rothman 建议的安全上限，非绝对禁止阈值 —— 措辞随之校准。
          每条断言现绑到能直接支持它的那一篇。 */}
      <InkCard variant="cream" hoverLift={false} style={{ marginTop: 24, padding: '14px 20px', fontSize: 12, color: 'var(--fg-2)', lineHeight: 1.75 }}>
        <div style={{ marginBottom: 6 }}>
          <strong style={{ color: 'var(--danger-deep)' }}>红线 ·</strong> 单次注射 ≥10 mg 可能使峰值 E2 短期超过 1000 pg/mL，显著升高血栓（VTE）风险（Rothman 2024）。
        </div>
        <div style={{ marginBottom: 6 }}>
          注射间隔 &lt;5 天且单次 &gt;5 mg 会因药物叠加累积，使血药浓度持续处于超生理水平（Kanin 2025）。
        </div>
        <div>
          Rothman 2024 建议<strong>通常不超过 5 mg/周</strong>（这是建议上限，不代表 ≤5 mg 就一定安全 —— 仍需按血检与个体情况由医生把关）。达标困难时应咨询医生调整方案，而非单方面加量。
        </div>
      </InkCard>
    </div>
  );
}
