/**
 * PathwayScreen — 幻月路径（四阶段手风琴时间线）
 * 移植自 design_files/ui_kits/yakuten/pathway-screen.jsx (166 行)
 *
 * 岛屿（client:visible）：展开态 + localStorage['yak_phase']。
 * yak_phase 是 v2 保留的三个键之一（README State Management 明列）——
 * 它是 UI 偏好（看到哪一阶段），不是健康数据。
 *
 * ⚠️ 四个阶段的剂量/阈值/决策分支文案【逐字移植】。CONSTITUTION §1 范畴。
 */
import { useState, useEffect } from 'react';
import { hrefFor } from '../routes';
import { PageHead, DangerBox, MoonPhase, InkCard, Chip, Icon } from '../Primitives';

interface Phase {
  p: number; label: string; zh: string; time: string;
  color: string; colorDeep: string; e2: string;
  body: string; items: string[];
  nodeAt?: string; checks?: string[];
  node?: Array<[string, string]>;
}

/* 四阶段 —— 逐字取自原型 :10-38 */
const PHASES: Phase[] = [
  {
    p: 0, label: 'Phase 0', zh: '基线', time: 'Week 0',
    color: 'var(--mint)', colorDeep: 'var(--mint-deep)', e2: '—',
    body: '完成所有基线血检，记录初始数值。选择给药途径，不要着急开始。',
    items: ['激素六项 (E2, T, LH, FSH, PRL, P4)', '肝功能 + 肾功能', '血脂 + 空腹血糖', '凝血 + 血常规'],
  },
  {
    p: 1, label: 'Phase 1', zh: '低剂量起步', time: '1–6 月',
    color: 'var(--sakura-pink)', colorDeep: 'var(--sakura-pink-deep)', e2: '50–100 pg/mL',
    body: '贴片 50–100 µg/天，或口服 E2/戊酸 E2 2 mg/天。此阶段不要加量，即使"没效果"。',
    items: [
      '贴片 50–100 µg/天', '口服 E2/EV 2 mg/天', '凝胶 1.5 mg/天', '注射 EV 1–2 mg/周',
      'CPA 5–12.5 mg/天 或螺内酯 50–100 mg/天',
    ],
    nodeAt: '第 3 个月',
    checks: ['第 4 周：激素六项（用 CPA 加肝功 · 用螺内酯加电解质）', '第 12 周：激素六项 + 肝功 + 血脂'],
    node: [
      ['E2 30–100 且 T 下降 → 继续至 6 个月', 'var(--mint-deep)'],
      ['E2 <30 → 考虑升至阶段 2', 'var(--honey)'],
      ['肝功能异常 / PRL >30 / 严重情绪恶化 → 停药就医', 'var(--danger)'],
    ],
  },
  {
    p: 2, label: 'Phase 2', zh: '中等剂量调整', time: '6–12 月',
    color: 'var(--butter)', colorDeep: 'var(--honey)', e2: '100–200 pg/mL',
    body: '目标 E2 100–200，T <50 ng/dL。T 未达标时调整抗雄，不要靠增 E2 来压 T。',
    items: ['贴片 100–200 µg/天', '口服 4 mg/天', '注射 EV 2–4 mg/周'],
    nodeAt: '第 6 个月',
    checks: ['每 3 个月：激素六项', '调整方案后 4–6 周：复查一次谷值'],
    node: [
      ['E2 100–200 且 T <50 → 进入维持期', 'var(--mint-deep)'],
      ['T >50 但 E2 已达标 → 调整抗雄（不要靠增 E2 压 T）', 'var(--honey)'],
      ['E2 <100 → 可增至中高剂量，但不超剂量红线', 'var(--honey)'],
    ],
  },
  {
    p: 3, label: 'Phase 3', zh: '维持期', time: '12 月+',
    color: 'var(--lavender)', colorDeep: 'var(--lavender-deep)', e2: '100–200 pg/mL',
    body: '保持 E2 100–200、T <50 的最低有效剂量。E2 >200 不带来更强效果，只增加风险。',
    items: ['每 6 月 激素六项 + 肝功能', '每年 血脂 + 血糖', '考虑骨密度检查'],
  },
];

const MOON_FILL = [0, 0.4, 0.72, 1];
const MOON_NAME = ['新月', '蛾眉', '盈凸', '满月'];

export default function PathwayScreen() {
  const [active, setActive] = useState<number>(() => {
    try {
      const saved = parseInt(localStorage.getItem('yak_phase') || '', 10);
      return Number.isInteger(saved) && saved >= 0 && saved <= 3 ? saved : 1;
    } catch { return 1; }
  });

  useEffect(() => {
    try { localStorage.setItem('yak_phase', String(active)); } catch { /* noop */ }
  }, [active]);

  return (
    <div className="yk-page yk-page--narrow">
      <PageHead
        volume="卷一" tab="路径" kicker="CORE · 用药路径图"
        tapeColor="var(--sakura-pink)" pattern="dots"
        title="幻月路径" accent="四阶段"
        lede={'不是剂量"指南"。是 4 个决策节点。每一步都是：此刻做什么 · 下次看什么指标 · 什么情况立即停药就医。'}
      />

      <DangerBox title="决策节点 · 任一条触发立即停药就医">
        肝功能异常 (ALT/AST &gt;3×上限) · PRL &gt;50 ng/mL · 严重情绪恶化 · 单侧小腿肿胀
      </DangerBox>

      {/* timeline */}
      <div style={{ marginTop: 36, position: 'relative' }}>
        {/* dashed spine */}
        <div aria-hidden="true" style={{
          position: 'absolute', left: 30, top: 30, bottom: 30,
          borderLeft: '3px dashed var(--sakura-pink)',
        }} />
        {PHASES.map((ph) => {
          const isActive = active === ph.p;
          return (
            <div key={ph.p} style={{ display: 'grid', gridTemplateColumns: '62px minmax(0, 1fr)', gap: 24, marginBottom: 20, position: 'relative' }}>
              <button
                type="button"
                onClick={() => setActive(ph.p)}
                aria-expanded={isActive}
                aria-label={`${ph.label} ${ph.zh}`}
                title={`幻月渐盈 · ${MOON_NAME[ph.p]}`}
                style={{
                  position: 'relative', width: 62, height: 62, borderRadius: '50%', padding: 0,
                  background: 'var(--ivory)',
                  border: '3px solid var(--ink)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: isActive ? '4px 4px 0 var(--ink)' : '2px 2px 0 var(--ink)',
                  transform: isActive ? 'translate(-2px,-2px)' : 'none',
                  transition: 'all .2s',
                  zIndex: 1,
                }}
              >
                {/* 这 4 个月相是【阶段图例】（新月→满月 对应 基线→维持期），固定 fill
                    是设计意图，与导航上「必须真实当日月相」的红线无关。 */}
                <MoonPhase fill={MOON_FILL[ph.p]} size={48} color={isActive ? ph.color : 'var(--sakura-blush)'} />
                <span aria-hidden="true" style={{
                  position: 'absolute', inset: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 22,
                  color: 'var(--ink)',
                  textShadow: '0 0 5px var(--ivory), 0 0 2px var(--ivory), 1px 1px 0 var(--ivory)',
                }}>{ph.p}</span>
              </button>

              <InkCard
                variant={isActive ? 'paper' : 'cream'}
                hoverLift={!isActive}
                onClick={isActive ? undefined : () => setActive(ph.p)}
                ariaLabel={isActive ? undefined : `展开 ${ph.label} ${ph.zh}`}
                style={{ padding: isActive ? 22 : 16 }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px 16px' }}>
                  <div style={{ minWidth: 0 }}>
                    {/* AA：ph.colorDeep 作 11px 文字 —— mint-deep 1.98 / honey 1.77 /
                        lavender-deep 3.22 / pink-deep 3.33 全 FAIL → 墨字。
                        阶段配色仍由月相圆钮 + Chip 边框承载，视觉识别不丢。 */}
                    <div style={{ color: 'var(--ink)', fontFamily: 'var(--font-ui-accent)', fontSize: 11, letterSpacing: '0.1em', fontWeight: 700, whiteSpace: 'nowrap' }}>
                      {ph.label} · {ph.time}
                    </div>
                    <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 24, margin: '2px 0 0', fontWeight: 400, whiteSpace: 'nowrap' }}>{ph.zh}</h3>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                    <span className="yk-meta-label" style={{ fontFamily: 'var(--font-ui-accent)', fontSize: 10, color: 'var(--fg-2)', letterSpacing: '0.08em', fontWeight: 700 }}>E2 目标</span>
                    <Chip color={ph.colorDeep}>{ph.e2}</Chip>
                  </div>
                </div>
                {isActive && (
                  <div>
                    <p style={{ fontSize: 14, color: 'var(--fg-1)', lineHeight: 1.7, margin: '14px 0 12px' }}>{ph.body}</p>
                    <div className="yk-grid yk-grid--2" style={{ gap: 8, marginTop: 12 }}>
                      {ph.items.map((it) => (
                        <div key={it} style={{
                          fontSize: 12, color: 'var(--fg-1)', padding: '8px 12px',
                          background: 'var(--cream)',
                          borderRadius: 6,
                          display: 'flex', alignItems: 'center', gap: 8,
                        }}>
                          {/* 勾选图标是图形，用阶段色无对比度要求 */}
                          <Icon name="check" size={12} color={ph.colorDeep} /> <span>{it}</span>
                        </div>
                      ))}
                    </div>
                    {ph.checks && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12, alignItems: 'center' }}>
                        <span className="yk-meta-label" style={{ fontFamily: 'var(--font-ui-accent)', fontSize: 10, letterSpacing: '0.1em', color: 'var(--fg-2)', fontWeight: 700 }}>复查节奏</span>
                        {ph.checks.map((c) => (
                          <span key={c} style={{
                            fontSize: 12, color: 'var(--fg-1)', padding: '5px 12px',
                            background: 'var(--ivory)', border: '1.5px dashed var(--ink-faint)', borderRadius: 999,
                          }}>{c}</span>
                        ))}
                      </div>
                    )}
                    {ph.node && (
                      <div style={{ marginTop: 16, border: '2px dashed var(--ink-faint)', borderRadius: 10, padding: '12px 16px', background: 'var(--ivory)' }}>
                        <div className="yk-meta-label" style={{ fontFamily: 'var(--font-ui-accent)', fontSize: 10, letterSpacing: '0.1em', color: 'var(--fg-2)', fontWeight: 700, marginBottom: 8 }}>
                          决策节点 · {ph.nodeAt}看血检
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {ph.node.map(([txt, c]) => (
                            /* 绿/黄/红圆点是【背景色】图形 → 原色保留；
                               判定语义由文字本身承载（不违反 WCAG 1.4.1）。 */
                            <div key={txt} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12.5, lineHeight: 1.6, color: 'var(--fg-1)' }}>
                              <span aria-hidden="true" style={{ width: 10, height: 10, borderRadius: '50%', background: c, border: '1.5px solid var(--ink)', flexShrink: 0, marginTop: 4 }} />
                              <span>{txt}</span>
                            </div>
                          ))}
                        </div>
                        {/* 原型这里是 <button onClick={e => {e.stopPropagation(); setRoute('blood')}}>
                            —— stopPropagation 是为了不触发外层卡片的展开。改成 <a> 后
                            外层已是 isActive（onClick 为 undefined），无冒泡问题。 */}
                        <a
                          href={hrefFor('blood')}
                          style={{ marginTop: 10, fontFamily: 'var(--font-ui-accent)', fontSize: 12, fontWeight: 700, color: 'var(--sakura-pink-text)', display: 'block', textDecoration: 'none' }}
                        >
                          拿到血检报告了？去血检 HUD 即时判读 →
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </InkCard>
            </div>
          );
        })}
      </div>

      {/* 朱批 */}
      <div style={{ marginTop: 8, paddingLeft: 86 }}>
        <span className="yk-hand-note yk-hand-note--zhu" style={{ transform: 'rotate(-1.2deg)' }}>
          急不来的。乳腺发育要 3–5 年，加量只会让它提前停止。
        </span>
      </div>
    </div>
  );
}
