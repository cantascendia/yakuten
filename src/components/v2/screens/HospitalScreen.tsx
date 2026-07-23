/**
 * HospitalScreen — 友好医疗资源（省份过滤）
 * 移植自 design_files/ui_kits/yakuten/hospital-screen.jsx (96 行)
 *
 * 岛屿（client:visible）：省份筛选是客户端 state。
 *
 * 数据：hospitalsCN —— 仓库 hospitals.json 有 49 家（含 24 家欧洲/拉美，来自本仓库
 * 的多语种本地化成果），中文页按省份白名单过滤成中国条目。JSON 一字不动。
 * 原型的设计版式正是按中国条目 + 省份 chips 设计的。
 */
import { useState } from 'react';
import { hospitalsCN } from '../data';
import { PageHead, InkCard, Chip, Icon } from '../Primitives';

export default function HospitalScreen() {
  const [city, setCity] = useState('all');
  /* 原型用 province 去重做 chips（变量名叫 cities 但取的是 province）—— 保留该语义 */
  const provinces = ['all', ...Array.from(new Set(hospitalsCN.map((h) => h.province)))];
  const filtered = city === 'all' ? hospitalsCN : hospitalsCN.filter((h) => h.province === city);

  return (
    <div className="yk-page">
      <PageHead
        tab="资源" kicker="RESOURCES · 找医院"
        tapeColor="var(--coral)" pattern="solid"
        title="友好医疗资源" accent={`${hospitalsCN.length} 家`}
        lede="社区验证的跨性别友好医院。提示：不用告诉医生你是跨性别也能做检查——「我想检查激素水平」，任何三甲内分泌科都可以开血检。"
      />

      {/* 省份过滤 */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 24 }} role="group" aria-label="按省份筛选">
        {provinces.map((c) => {
          const active = city === c;
          return (
            <button
              key={c}
              type="button"
              onClick={() => setCity(c)}
              aria-pressed={active}
              style={{
                minHeight: 40, padding: '6px 18px', cursor: 'pointer',
                borderRadius: 999, border: '2px solid var(--ink)',
                /* AA：原型选中态 #fff on --coral #FF8E7F ≈ 2.1:1 不可读
                   → --coral-deep #E65D4A 仍只有 3.5 → 用墨字 on coral（7.9:1）。
                   珊瑚色本身保留为选中底色，语义与视觉都不丢。 */
                background: active ? 'var(--coral)' : 'var(--ivory)',
                color: 'var(--ink)',
                fontFamily: 'var(--font-ui-accent)', fontWeight: 700, fontSize: 13,
                boxShadow: active ? '2px 2px 0 var(--ink)' : 'none',
                whiteSpace: 'nowrap', transition: 'all .15s',
              }}
            >{c === 'all' ? `全部 ${hospitalsCN.length}` : c}</button>
          );
        })}
      </div>

      <div className="yk-grid yk-grid--2" style={{ marginTop: 24 }}>
        {filtered.map((h) => (
          <InkCard key={h.id} variant="paper" hoverLift={false} style={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 4 }}>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 19, margin: 0, fontWeight: 700, lineHeight: 1.35 }}>
                {h.name}
              </h3>
              <Chip color="var(--coral-deep)">{h.city}</Chip>
            </div>
            {/* AA：原型 pink-deep on ivory 3.33（11px）→ 主题感知 pink-text 5.39 */}
            <div style={{ fontFamily: 'var(--font-ui-accent)', fontSize: 11, color: 'var(--sakura-pink-text)', fontWeight: 700, marginBottom: 12 }}>
              {h.department}
            </div>

            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
              {(h.services || []).map((s) => (
                <span key={s} style={{
                  padding: '2px 10px', borderRadius: 999,
                  background: 'var(--cream)', border: '1.5px solid var(--ink-faint)',
                  fontSize: 11, color: 'var(--fg-2)', whiteSpace: 'nowrap',
                }}>{s}</span>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12.5, color: 'var(--fg-1)' }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <Icon name="pin" size={14} color="var(--fg-2)" /> <span>{h.address}</span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <Icon name="clipboard" size={14} color="var(--fg-2)" /> <span>{h.registrationMethod}</span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <Icon name="stamp" size={14} color="var(--fg-2)" /> <span>{h.estimatedCost}</span>
              </div>
            </div>

            {h.communityFeedback && (
              <div style={{
                marginTop: 14, padding: '10px 14px',
                background: 'var(--bg-5)', borderRadius: 10,
                border: '1.5px dashed var(--ink-faint)',
                fontSize: 12.5, color: 'var(--fg-2)', lineHeight: 1.65,
              }}>
                <span style={{ fontFamily: 'var(--font-hand)', color: 'var(--sakura-pink-text)', fontSize: 14 }}>社区反馈 · </span>
                {h.communityFeedback}
              </div>
            )}

            <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              {/* AA：原型 fg-3 2.82 → fg-2 6.07 */}
              <span className="yk-nowrap" style={{ fontFamily: 'var(--font-hud)', fontSize: 10, color: 'var(--fg-2)', fontWeight: 700 }}>
                ✓ {h.verificationLevel === 'community-verified' ? '社区验证' : h.verificationLevel} · {h.lastVerified}
              </span>
            </div>
          </InkCard>
        ))}
      </div>

      <InkCard variant="cream" hoverLift={false} style={{ marginTop: 24, padding: '14px 20px', fontSize: 12, color: 'var(--fg-2)', lineHeight: 1.7 }}>
        <strong style={{ color: 'var(--sakura-pink-text)' }}>更新 ·</strong> 资源持续更新，欢迎通过 GitHub 提交新的友好医院信息（需附社区验证）。
      </InkCard>
    </div>
  );
}
