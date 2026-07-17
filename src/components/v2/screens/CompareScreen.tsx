/**
 * CompareScreen — 药物对比（三栏并排）
 * 移植自 design_files/ui_kits/yakuten/compare-screen.jsx (124 行)
 *
 * 岛屿（client:visible）：三个选择器动态换列 + localStorage。
 *
 * localStorage `yak_compare` 是 v2 保留的三个键之一 —— README「Interactions」明确写
 * 「输入值不持久化（隐私），【对比选择除外】」，且 State Management 段也列了它。
 * 对比选择不是健康数据，持久化无隐私问题。
 */
import { useState, useEffect } from 'react';
import { drugs, ROUTE_ZH, ACCESS_ZH, fmtRange, type Drug } from '../data';
import { PageHead, InkCard, EvidenceBadge } from '../Primitives';

const CAT_ZH: Record<string, string> = {
  estrogen: '雌激素', antiandrogen: '抗雄激素', progestogen: '孕激素', '5ari': '5α-RI', banned: '禁用',
};

const DEFAULT_PICKS = ['estradiol-oral', 'estradiol-patch', 'estradiol-injection'];

/* 11 行对比 —— 逐字移植原型 :20-41 的 label 与取值函数 */
const ROWS: Array<[string, (d: Drug) => string | null]> = [
  ['类别', (d) => CAT_ZH[d.category] || d.category],
  ['给药途径', (d) => {
    const r = d.routes[0]?.route;
    return r ? (ROUTE_ZH[r] || r.replace(/_/g, ' ')) : '—';
  }],
  ['起始剂量', (d) => fmtRange(d.routes[0]?.doseRange?.start)],
  ['维持剂量', (d) => fmtRange(d.routes[0]?.doseRange?.maintenance)],
  ['绝对上限', (d) => {
    const m = d.routes[0]?.doseRange?.maximum;
    return m ? `${m.value} ${m.unit}` : '—';
  }],
  ['半衰期', (d) => d.routes[0]?.halfLife || '—'],
  ['峰值时间', (d) => d.routes[0]?.peakTime || '—'],
  ['VTE 相对风险', (d) => {
    const v = d.routes[0]?.vteRisk;
    return v?.rr != null ? `RR ≈ ${v.rr}` : '—';
  }],
  ['证据等级', () => null /* 渲染为徽章 */],
  ['中国获取', (d) => (d.chinaAccess && ACCESS_ZH[d.chinaAccess.availability]) || '—'],
  ['社区叫法', (d) => (d.names.slang || []).slice(0, 3).join(' · ') || '—'],
];

/* 分组一次即可，不必每次 render 重算 */
const GROUPED = drugs.reduce<Record<string, Drug[]>>((acc, d) => {
  (acc[d.category] = acc[d.category] || []).push(d);
  return acc;
}, {});

export default function CompareScreen() {
  const [picks, setPicks] = useState<string[]>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('yak_compare') || 'null');
      if (Array.isArray(saved) && saved.length === 3) return saved;
    } catch { /* 无痕模式会抛 */ }
    return DEFAULT_PICKS;
  });

  useEffect(() => {
    try { localStorage.setItem('yak_compare', JSON.stringify(picks)); } catch { /* noop */ }
  }, [picks]);

  const get = (id: string) => drugs.find((d) => d.id === id);

  return (
    <div className="yk-page">
      <PageHead
        volume="卷四" tab="对比" kicker="TOOLS · 药物对比"
        tapeColor="var(--sky)" pattern="grid"
        title="药物对比" accent="三栏并排"
        lede={`从 ${drugs.length} 种药物中任选三种横向对比。剂量数据交叉验证自 WPATH SOC 8 + Endocrine Society 2017 + UCSF。`}
      />

      {/* 选择器 */}
      <div className="yk-grid yk-grid--3" style={{ marginTop: 26, gap: 14 }}>
        {picks.map((id, i) => (
          <select
            key={i}
            value={id}
            className="yk-input"
            aria-label={`对比栏 ${i + 1}`}
            style={{ fontFamily: 'var(--font-body)', fontSize: 14, cursor: 'pointer' }}
            onChange={(e) => { const p = [...picks]; p[i] = e.target.value; setPicks(p); }}
          >
            {Object.entries(GROUPED).map(([cat, list]) => (
              <optgroup key={cat} label={CAT_ZH[cat] || cat}>
                {list.map((d) => <option key={d.id} value={d.id}>{d.names.zh}</option>)}
              </optgroup>
            ))}
          </select>
        ))}
      </div>

      {/* 对比表 —— 自带 overflowX:auto + minWidth:680，表格自己横滚 */}
      <div className="yk-paper" data-paper="true" style={{ marginTop: 20, border: '2px solid var(--ink)', borderRadius: 12, overflowX: 'auto', boxShadow: '4px 4px 0 var(--ink)', background: 'var(--ivory)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 680 }}>
          <caption className="sr-only">三种药物的多维度横向对比表</caption>
          <thead>
            <tr style={{ background: 'var(--sakura-blush)' }}>
              <th scope="col" style={{ padding: '12px 16px', textAlign: 'left', borderBottom: '2px solid var(--ink)', width: 130 }}>
                <span className="sr-only">对比维度</span>
              </th>
              {picks.map((id) => {
                const d = get(id);
                const banned = d?.category === 'banned';
                return (
                  <th key={id} scope="col" style={{ padding: '12px 16px', textAlign: 'left', borderBottom: '2px solid var(--ink)' }}>
                    {/* AA：banned 表头 --danger on blush = 2.55 FAIL（16px 700）→ danger-deep 3.83 仍 FAIL
                        → 墨字 + 红 ✕ 符号承载禁用语义 */}
                    <div style={{ fontFamily: 'var(--font-heading)', fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>
                      {banned ? <span style={{ color: 'var(--danger-deep)' }}>✕ </span> : ''}{d ? d.names.zh : '—'}
                    </div>
                    {/* AA：fg-3 on blush = 2.20 FAIL → fg-2 4.73 */}
                    <div style={{ fontFamily: 'var(--font-ui-accent)', fontSize: 10, color: 'var(--fg-2)', fontWeight: 600, marginTop: 2 }}>
                      {d ? d.names.generic : ''}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {ROWS.map(([label, fn], ri) => (
              <tr key={label} style={{ borderBottom: ri < ROWS.length - 1 ? '1px dashed var(--ink-faint)' : 'none', background: ri % 2 ? 'var(--cream)' : 'transparent' }}>
                {/* 行首是行标题 → th scope="row"（原型用 td，读屏无法把数值关联到维度） */}
                <th scope="row" className="yk-meta-label" style={{ padding: '11px 16px', textAlign: 'left', fontFamily: 'var(--font-ui-accent)', fontSize: 11, color: 'var(--fg-2)', fontWeight: 700, letterSpacing: '0.06em' }}>{label}</th>
                {picks.map((id) => {
                  const d = get(id);
                  if (!d) return <td key={id} style={{ padding: '11px 16px' }}>—</td>;
                  if (label === '证据等级') {
                    return (
                      <td key={id} style={{ padding: '11px 16px' }}>
                        <EvidenceBadge level={d.routes[0]?.evidenceLevel || 'B'} />
                      </td>
                    );
                  }
                  const v = fn(d);
                  const danger = label === 'VTE 相对风险' && (d.routes[0]?.vteRisk?.rr ?? 0) > 2;
                  return (
                    <td key={id} style={{
                      padding: '11px 16px',
                      /* AA：原型 --danger 3.27 FAIL → danger-deep 4.90 */
                      color: danger ? 'var(--danger-deep)' : 'var(--fg-1)',
                      fontFamily: /剂量|上限|半衰期|峰值|VTE/.test(label) ? 'var(--font-hud)' : 'inherit',
                      fontWeight: /剂量|上限|VTE/.test(label) ? 700 : 400,
                      fontVariantNumeric: 'tabular-nums',
                    }}>{v}</td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <InkCard variant="cream" hoverLift={false} style={{ marginTop: 24, padding: '14px 20px', fontSize: 12, color: 'var(--fg-2)', lineHeight: 1.7 }}>
        <strong style={{ color: 'var(--sakura-pink-text)' }}>提示 ·</strong> 对比只展示每种药物的主要给药途径。完整途径、副作用、相互作用见各药物详解页。
      </InkCard>
    </div>
  );
}
