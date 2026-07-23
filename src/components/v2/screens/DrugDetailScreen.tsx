/**
 * DrugDetailScreen — 数据驱动详解页模板：一个组件渲染全部 20 种药物
 * 移植自 design_files/ui_kits/yakuten/drug-detail-screen.jsx (355 行)
 *
 * 路由 /zh/v2/drugs/<id>/ —— 由 [id].astro 的 getStaticPaths 预生成 20 页。
 * 零 JS：纯 props 派生，无 state；原型的 setRoute 全改 <a href>。
 *
 * banned 分支（ethinylestradiol / conjugated-estrogens）：
 *   墨底红章大警告 · 无剂量表 · 无阶段 · 无 interactions · keyFacts 的 GAHT 用途显 ✕
 */
import { Fragment } from 'react';
import type { ReactNode } from 'react';
import { hrefFor } from '../routes';
import { drugs, ROUTE_ZH, ACCESS_ZH, fmtRange, type Drug, type DrugCategory, type SideEffectSeverity } from '../data';
import {
  Icon, SealStamp, EvidenceBadge, Chip, InkCard, DangerBox, WarningBox,
  SpeechBubble,
} from '../Primitives';

const CAT: Record<DrugCategory, { zh: string; en: string }> = {
  estrogen: { zh: '雌激素', en: 'Estrogens' },
  antiandrogen: { zh: '抗雄激素', en: 'Antiandrogens' },
  progestogen: { zh: '孕激素', en: 'Progestogens' },
  '5ari': { zh: '5α-还原酶抑制剂', en: '5α-RI' },
  banned: { zh: '绝对禁用', en: 'Banned' },
};

/* 副作用频率三栏。AA：原型的颜色全部是【文字色】，实测 on ivory 均 FAIL：
   common pink-deep 3.33 / uncommon honey 1.77 / rare fg-3 2.82 → 换 AA 替身。 */
const FREQ_COLS = [
  ['common', '常见', '>10%', 'var(--sakura-pink-text)'],
  ['uncommon', '少见', '1–10%', 'var(--ink)'],
  ['rare', '罕见', '<1%', 'var(--fg-2)'],
] as const;

/* 严重度圆点 —— 这是【背景色】不是文字色，装饰性，无对比度要求 → 原色保留 */
const SEV_DOT: Record<SideEffectSeverity, string> = {
  mild: 'var(--mint-deep)',
  moderate: 'var(--caution)',
  severe: 'var(--danger)',
};

const Section = ({ children }: { children: ReactNode }) => (
  <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 26, margin: '36px 0 14px', fontWeight: 700 }}>{children}</h2>
);

const Th = ({ children }: { children: ReactNode }) => (
  <th className="yk-nowrap" style={{ padding: '11px 14px', textAlign: 'left', fontFamily: 'var(--font-ui-accent)', fontSize: 11, letterSpacing: '0.08em', color: 'var(--ink)', borderBottom: '2px solid var(--ink)', fontWeight: 700 }}>{children}</th>
);

const Td = ({ children, mono, color, nowrap }: { children: ReactNode; mono?: boolean; color?: string; nowrap?: boolean }) => (
  <td className={nowrap ? 'yk-nowrap' : undefined} style={{ padding: '11px 14px', color: color || 'var(--fg-1)', fontFamily: mono ? 'var(--font-hud)' : 'inherit', fontVariantNumeric: 'tabular-nums', fontWeight: mono ? 700 : 400, fontSize: 13 }}>{children}</td>
);

/* 表格自带 overflowX:auto 容器 + 表体 minWidth —— 表格自己横滚，页面不溢出。
   这是原型就做对的地方（drug-detail-screen.jsx:38-39），逐字保留。 */
const Table = ({ head, children }: { head: string[]; children: ReactNode }) => (
  <div className="yk-paper" data-paper="true" style={{ border: '2px solid var(--ink)', borderRadius: 12, overflowX: 'auto', boxShadow: '4px 4px 0 var(--ink)', background: 'var(--ivory)' }}>
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 520 }}>
      <thead><tr style={{ background: 'var(--sakura-blush)' }}>{head.map((h) => <Th key={h}>{h}</Th>)}</tr></thead>
      <tbody>{children}</tbody>
    </table>
  </div>
);

/** 内联链接按钮 —— 原型用 <button style={{all:'unset'}}>，语义应为链接 */
const InlineLink = ({ href, children }: { href: string; children: ReactNode }) => (
  <a href={href} style={{ fontFamily: 'var(--font-ui-accent)', fontSize: 13, fontWeight: 700, color: 'var(--sakura-pink-text)', textDecoration: 'none' }}>{children}</a>
);

export default function DrugDetailScreen({ drug }: { drug: Drug }) {
  const cat = CAT[drug.category] || CAT.estrogen;
  const isBanned = drug.category === 'banned';
  const r0 = drug.routes?.[0];
  const vte = r0?.vteRisk;

  /* VTE 配色 —— 阈值逐字保留（原型 :57）。注意原型此处用 --caution（黄）做文字，
     on cream 仅 1.53 → 换 --ink；danger/mint-deep 同理见下。 */
  const vteTextColor = (v?: number) => {
    if (v == null) return 'var(--fg-1)';
    if (v > 2) return 'var(--danger-deep)';   // 原 --danger 3.27 FAIL → 4.90
    if (v > 1.2) return 'var(--ink)';         // 原 --caution 1.53 FAIL（黄字在浅底无解）
    return 'var(--ink)';                      // 原 --mint-deep 1.98 FAIL
  };

  /* 前后翻页：跨全列表（非同类内），逐字保留原型 :61-63 的语义 */
  const idx = drugs.findIndex((d) => d.id === drug.id);
  const prev = drugs[idx - 1];
  const next = drugs[idx + 1];

  const phases = drug.phases || {};
  const phaseList = (['phase1', 'phase2', 'phase3'] as const)
    .map((k, i) => (phases[k] ? { n: i + 1, ...phases[k] } : null))
    .filter((p): p is { n: number; e2Target: string; duration: string } => Boolean(p));
  /* banned 药的 phases 是 { e2Target:'属于禁用' } → 被这个 gate 正确过滤（逐字保留 :67） */
  const showPhases = !isBanned && phaseList.length > 0 && phaseList.some((p) => p.e2Target && !p.e2Target.includes('禁用'));

  const sideBy = (key: string) => (drug.sideEffects || []).filter((s) => s.frequency === key);
  const hasSides = (drug.sideEffects || []).length > 0;
  const contra = drug.contraindications || { absolute: [], relative: [] };
  const inters = drug.interactions || [];
  const access = drug.chinaAccess;
  const isInjectable = (drug.routes || []).some((r) => (r.route || '').startsWith('injection'));

  const keyFacts: Array<[string, string, string?, string?]> = [
    ['给药途径', (drug.routes || []).map((r) => ROUTE_ZH[r.route] || r.route).join(' / ') || '—'],
    ['给药频率', r0?.frequency || '—'],
    ['半衰期', r0?.halfLife || '—'],
    ['峰值时间', r0?.peakTime || '—'],
    ['生物利用度', r0?.bioavailability || '—'],
    ['VTE 相对风险', vte ? `RR ≈ ${vte.rr}` : '—', vte ? vteTextColor(vte.rr) : undefined, vte?.source],
    isBanned
      ? ['GAHT 用途', '✕ 绝对禁用', 'var(--danger-deep)']
      : ['维持剂量', fmtRange(r0?.doseRange?.maintenance)],
    ['中国获取', (access && (ACCESS_ZH[access.availability] || access.availability)) || '—'],
  ];

  return (
    <div className="yk-page yk-page--narrow">
      {/* 面包屑。AA：原型 --fg-3 2.82 FAIL → --fg-2 */}
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 10, fontFamily: 'var(--font-ui-accent)', fontSize: 11, letterSpacing: '0.1em', color: 'var(--fg-2)', marginBottom: 14, fontWeight: 700 }}>
        <a href={hrefFor('drugs')} style={{ color: 'inherit', textDecoration: 'underline', textDecorationStyle: 'dotted', whiteSpace: 'nowrap' }}>药物图鉴</a>
        <Icon name="chevron" size={12} color="var(--fg-2)" />
        <span className="yk-nowrap">{cat.en} · {cat.zh}</span>
        <Icon name="chevron" size={12} color="var(--fg-2)" />
        <span className="yk-nowrap" style={{ color: 'var(--sakura-pink-text)' }}>{drug.names.zh}</span>
      </div>

      {/* 标题区 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 8, flexWrap: 'wrap' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(30px, 5vw, 42px)', margin: 0, fontWeight: 400 }}>{drug.names.zh}</h1>
        {isBanned ? <SealStamp color="var(--danger)" rotate={-6}>禁用</SealStamp> : <EvidenceBadge level={r0?.evidenceLevel || 'B'} />}
      </div>
      <div style={{ fontFamily: 'var(--font-ui-accent)', fontSize: 13, color: 'var(--fg-2)', letterSpacing: '0.05em', fontWeight: 600 }}>
        {drug.names.generic}{drug.names.ja ? <span> · {drug.names.ja}</span> : null}
        {drug.names.slang?.length > 0 && (
          <span style={{ color: 'var(--sakura-pink-text)' }}> · {drug.names.slang.join(' / ')}</span>
        )}
      </div>
      {drug.names.brands?.length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
          {drug.names.brands.map((b) => <Chip key={b} color="var(--fg-2)">{b}</Chip>)}
        </div>
      )}

      {/* 禁用大警告 —— banned 独立分支 */}
      {isBanned && (
        <DangerBox title="绝对禁用 — 任何 HRT/GAHT 方案都不应包含此成分">
          {vte?.source ? `${vte.source}。` : ''}
          {inters[0] ? `${inters[0].description}。` : ''}
          建议替代：天然 17β-雌二醇制剂（口服 / 贴片 / 凝胶 / 注射）。
        </DangerBox>
      )}

      {/* 关键参数 */}
      <InkCard variant="cream" hoverLift={false} style={{ marginTop: 28 }}>
        <div className="yk-grid yk-grid--4" style={{ gap: 20 }}>
          {keyFacts.map(([k, v, color, hint]) => (
            <div key={k} title={hint || undefined}>
              <div className="yk-meta-label" style={{ fontFamily: 'var(--font-ui-accent)', fontSize: 10, letterSpacing: '0.1em', color: 'var(--fg-2)', marginBottom: 4, fontWeight: 700 }}>{k}</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 700, color: color || 'var(--fg-1)', lineHeight: 1.3 }}>{v}</div>
            </div>
          ))}
        </div>
      </InkCard>

      {/* 剂量范围 —— banned 不显示 */}
      {!isBanned && r0?.doseRange && (
        <section>
          <Section>剂量范围</Section>
          <Table head={['途径', '起始', '维持', '绝对上限', '频率']}>
            {drug.routes.map((r, i) => (
              <tr key={r.route} style={{ borderBottom: i < drug.routes.length - 1 ? '1px dashed var(--ink-faint)' : 'none' }}>
                <Td nowrap>{ROUTE_ZH[r.route] || r.route}</Td>
                <Td mono nowrap>{fmtRange(r.doseRange.start)}</Td>
                <Td mono nowrap>{fmtRange(r.doseRange.maintenance)}</Td>
                {/* AA：绝对上限是警示值，--danger 3.27 FAIL → --danger-deep 4.90 PASS */}
                <Td mono nowrap color="var(--danger-deep)">{r.doseRange.maximum ? `${r.doseRange.maximum.value} ${r.doseRange.maximum.unit}` : '—'}</Td>
                <Td nowrap>{r.frequency || '—'}</Td>
              </tr>
            ))}
          </Table>
          <WarningBox title="超过上限不会「女性化更快」">
            E2 &gt;200 pg/mL 不带来更强效果，只增加风险 (Endocrine Society 2017, Rec 2.2)。剂量调整应基于血检谷值，而不是感觉。
          </WarningBox>
          {isInjectable && (
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 16 }}>
              <a className="btn-flame" href={hrefFor('inject')} style={{ display: 'inline-flex', alignItems: 'center' }}>注射计算器 · 剂量↔体积 →</a>
              <a className="btn-ghost" href={hrefFor('compare')} style={{ display: 'inline-flex', alignItems: 'center' }}>与其他途径对比 →</a>
            </div>
          )}
        </section>
      )}

      {/* 阶段目标 */}
      {showPhases && (
        <section>
          <Section>在路径图中的位置</Section>
          <div className="yk-grid yk-grid--3">
            {phaseList.map((p) => {
              /* 短/长文案降级 —— 阈值逐字保留（原型 :173 / :185）：
                 duration 以数字开头或 ≤12 字 → 并进 kicker；否则单独段落
                 e2Target 以数字开头或 ≤14 字 → HUD 大字；否则正文小字换行（防溢出） */
              const durShort = /^\d/.test(p.duration || '') || (p.duration || '').length <= 12;
              const e2Short = /^\d/.test(p.e2Target || '') || (p.e2Target || '').length <= 14;
              return (
                <InkCard key={p.n} variant={p.n === 3 ? 'mint' : 'paper'} hoverLift={false} style={{ padding: 16 }}>
                  <div className="yk-meta-label" style={{ fontFamily: 'var(--font-ui-accent)', fontSize: 10, letterSpacing: '0.12em', color: 'var(--sakura-pink-text)', fontWeight: 700, marginBottom: 6 }}>
                    PHASE {p.n}{durShort && p.duration ? ` · ${p.duration}` : ''}
                  </div>
                  {!durShort && p.duration && (
                    <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, lineHeight: 1.65, color: 'var(--fg-2)', textWrap: 'pretty', marginBottom: 6 }}>{p.duration}</div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: 'var(--font-ui-accent)', fontSize: 11, color: 'var(--fg-2)', fontWeight: 700 }}>E2 目标</span>
                    {e2Short
                      ? <span className="yk-nowrap" style={{ fontFamily: 'var(--font-hud)', fontSize: 17, fontWeight: 700 }}>{p.e2Target}</span>
                      : <span style={{ fontFamily: 'var(--font-body)', fontSize: 13.5, lineHeight: 1.65, textWrap: 'pretty', minWidth: 0 }}>{p.e2Target}</span>}
                  </div>
                </InkCard>
              );
            })}
          </div>
          <div style={{ marginTop: 12 }}>
            <InlineLink href={hrefFor('pathway')}>查看完整用药路径图 →</InlineLink>
          </div>
        </section>
      )}

      {/* 血检监测 */}
      {(drug.monitoring || []).length > 0 && (
        <section>
          <Section>血检监测</Section>
          {/* AA 说明：原型给「目标/注意」两列用绿/黄【文字】色，实测 on ivory
              mint-deep 1.98、caution 1.53 —— 浅底上的绿/黄文字无论怎么加深都救不回。
              → 转墨色；红绿灯语义由表头已有的 🟢🟡🔴 承载（列位置 + emoji 双重标识）。
              唯独「危险」列保留红色（danger-deep 4.90 PASS）—— 这是唯一需要警示的列。 */}
          <Table head={['指标', '🟢 目标', '🟡 注意', '🔴 危险', '复查频率']}>
            {drug.monitoring.map((m, i) => (
              <tr key={m.test} style={{ borderBottom: i < drug.monitoring.length - 1 ? '1px dashed var(--ink-faint)' : 'none' }}>
                <Td mono nowrap>{m.test}</Td>
                <Td mono nowrap>{m.targetRange ? `${m.targetRange.min}–${m.targetRange.max} ${m.targetRange.unit || ''}` : '—'}</Td>
                <Td mono nowrap>{m.cautionRange ? `${m.cautionRange.min}–${m.cautionRange.max}` : '—'}</Td>
                <Td mono nowrap color="var(--danger-deep)">{m.dangerThreshold != null ? `>${m.dangerThreshold}` : '—'}</Td>
                <Td>{m.frequency || '—'}</Td>
              </tr>
            ))}
          </Table>
          <div style={{ marginTop: 12 }}>
            <InlineLink href={hrefFor('blood')}>拿到化验单了？去血检 HUD 即时判读 →</InlineLink>
          </div>
        </section>
      )}

      {/* 副作用 */}
      {hasSides && (
        <section>
          <Section>副作用</Section>
          <div className="yk-grid yk-grid--3">
            {FREQ_COLS.map(([key, zh, pct, color]) => {
              const list = sideBy(key);
              return (
                <InkCard key={key} variant="paper" hoverLift={false} style={{ padding: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 10 }}>
                    <span style={{ fontFamily: 'var(--font-heading)', fontSize: 16, fontWeight: 700, color }}>{zh}</span>
                    <span style={{ fontFamily: 'var(--font-hud)', fontSize: 11, color: 'var(--fg-2)', fontWeight: 700 }}>{pct}</span>
                  </div>
                  {list.length === 0
                    ? <div style={{ fontFamily: 'var(--font-hand)', fontSize: 14, color: 'var(--fg-2)' }}>暂无记录 ❀</div>
                    : list.map((s, i) => (
                      <div key={s.effect} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '5px 0', borderBottom: i < list.length - 1 ? '1px dashed var(--ink-faint)' : 'none' }}>
                        <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: 999, background: SEV_DOT[s.severity] || 'var(--fg-2)', marginTop: 6, flexShrink: 0 }} />
                        <span style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--fg-1)' }}>{s.effect}</span>
                      </div>
                    ))}
                </InkCard>
              );
            })}
          </div>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 10, fontSize: 11, color: 'var(--fg-2)', fontFamily: 'var(--font-ui-accent)', fontWeight: 600 }}>
            {([['轻度', 'mild'], ['中度', 'moderate'], ['重度', 'severe']] as const).map(([zh, k]) => (
              <span key={k} className="yk-nowrap" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: 999, background: SEV_DOT[k], display: 'inline-block' }} />{zh}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* 危险组合 —— banned 不显示（原型 :259 的 gate） */}
      {inters.length > 0 && !isBanned && (
        <section>
          <Section>危险组合</Section>
          {inters.map((it) => it.severity === 'contraindicated'
            ? <DangerBox key={it.drug} title={`禁止 · 与「${it.drug}」同时存在`}>{it.description}{it.source ? `（${it.source}）` : ''}</DangerBox>
            : <WarningBox key={it.drug} title={`谨慎 · ${it.drug}`}>{it.description}{it.source ? `（${it.source}）` : ''}</WarningBox>
          )}
        </section>
      )}

      {/* 禁忌症 */}
      {(contra.absolute?.length > 0 || contra.relative?.length > 0) && (
        <section>
          <Section>禁忌症</Section>
          <div className="yk-grid yk-grid--2">
            {contra.absolute?.length > 0 && (
              <InkCard variant="pink" hoverLift={false} style={{ padding: 18 }}>
                {/* AA：原型 --danger on blush = 2.55 FAIL（16px 700 不够大字门槛 18.66px）
                    → --ink 9.53。红色语义由 ✕ 符号承载（符号可视为图形）。 */}
                <div style={{ fontFamily: 'var(--font-heading)', fontSize: 16, fontWeight: 700, color: 'var(--ink)', marginBottom: 10 }}>
                  <span style={{ color: 'var(--danger-deep)' }}>✕</span> 绝对禁忌 — 有一条就不要用
                </div>
                {contra.absolute.map((c, i) => (
                  <div key={c} style={{ fontSize: 13, lineHeight: 1.7, padding: '4px 0', borderBottom: i < contra.absolute.length - 1 ? '1px dashed var(--ink-faint)' : 'none' }}>{c}</div>
                ))}
              </InkCard>
            )}
            {contra.relative?.length > 0 && (
              <InkCard variant="gold" hoverLift={false} style={{ padding: 18 }}>
                <div style={{ fontFamily: 'var(--font-heading)', fontSize: 16, fontWeight: 700, color: 'var(--ink)', marginBottom: 10 }}>! 相对禁忌 — 需要医生参与</div>
                {contra.relative.map((c, i) => (
                  <div key={c} style={{ fontSize: 13, lineHeight: 1.7, padding: '4px 0', borderBottom: i < contra.relative.length - 1 ? '1px dashed var(--ink-faint)' : 'none' }}>{c}</div>
                ))}
              </InkCard>
            )}
          </div>
        </section>
      )}

      {/* 中国获取解读 */}
      {access && (
        <section>
          <Section>中国获取</Section>
          <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
            <SpeechBubble tail="bottom-left" tone="paper" style={{ flex: 1 }}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                {/* filled Chip：color 此时是【底色】，pink-text 做底 + 白字 = 5.61 PASS */}
                <Chip color="var(--sakura-pink-text)" filled>{ACCESS_ZH[access.availability] || access.availability}</Chip>
                {access.affectedByBan2022 && <Chip color="var(--danger-deep)">受 2022.12 网售禁令影响</Chip>}
              </div>
              <div style={{ fontSize: 14, lineHeight: 1.8 }}>{access.notes}</div>
            </SpeechBubble>
          </div>
          <div style={{ marginTop: 12 }}>
            <InlineLink href={hrefFor('hospitals')}>找一家友好医院，把处方补上 →</InlineLink>
          </div>
        </section>
      )}

      {/* 参考文献 */}
      {(drug.references || []).length > 0 && (
        <section>
          <Section>参考文献</Section>
          <ol style={{ fontSize: 12, color: 'var(--fg-2)', lineHeight: 1.9, paddingLeft: 20, margin: 0 }}>
            {drug.references.map((ref) => <li key={ref}>{ref}</li>)}
          </ol>
          <div style={{ marginTop: 10 }}>
            <InlineLink href={hrefFor('refs')}>在文献库中查看完整条目 →</InlineLink>
          </div>
        </section>
      )}

      {/* 前后翻页 —— 跨全列表，首尾渲染空 div 占位（保持 grid 两列对齐） */}
      <div className="yk-grid yk-grid--2" style={{ marginTop: 44 }}>
        {prev ? (
          <InkCard variant="paper" href={hrefFor('drug', prev.id)} style={{ padding: '14px 18px' }}>
            <div className="yk-meta-label" style={{ fontFamily: 'var(--font-ui-accent)', fontSize: 10, color: 'var(--fg-2)', fontWeight: 700, marginBottom: 4 }}>‹ 上一种</div>
            <div style={{ fontFamily: 'var(--font-heading)', fontSize: 16, fontWeight: 700 }}>{prev.names.zh}</div>
          </InkCard>
        ) : <div />}
        {next ? (
          <InkCard variant="paper" href={hrefFor('drug', next.id)} style={{ padding: '14px 18px', textAlign: 'right' }}>
            <div className="yk-meta-label" style={{ fontFamily: 'var(--font-ui-accent)', fontSize: 10, color: 'var(--fg-2)', fontWeight: 700, marginBottom: 4 }}>下一种 ›</div>
            <div style={{ fontFamily: 'var(--font-heading)', fontSize: 16, fontWeight: 700 }}>{next.names.zh}</div>
          </InkCard>
        ) : <div />}
      </div>

      <div style={{ marginTop: 28, padding: '14px 18px', border: '2px dashed var(--ink-faint)', borderRadius: 12, fontSize: 12.5, color: 'var(--fg-2)', textAlign: 'center' }}>
        本页内容仅供教育和参考用途，不构成医疗建议，不能替代合格医生的面对面诊断和治疗。
      </div>
    </div>
  );
}
