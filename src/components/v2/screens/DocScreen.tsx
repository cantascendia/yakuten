/**
 * DocScreen — 三栏文档版式（侧栏树 + 正文 + 滚动跟随 TOC）
 * 移植自 design_files/ui_kits/yakuten/doc-screen.jsx (204 行)
 *
 * 岛屿（client:visible）：TOC 的 IntersectionObserver 滚动跟随 + 平滑滚动。
 *
 * ⚠️ 范围：本屏是【代表版式】。handoff README:12 说明它代表 44 页 × 4 语言的文档，
 * 「布局是终稿，正文内容需从原站 MDX 灌入」。按既定决策，本次只 1:1 复刻代表页
 * （戊酸雌二醇注射液），【不接】真实 MDX —— 那是独立的大工程：src/content/docs 的
 * MDX 依赖 Starlight 的组件渲染器（CitationRef / DoseTable / Aside…），而 /zh/v2
 * 刻意不走 Starlight。真要灌入，要么在 v2 重实现全套 MDX 组件，要么让 Starlight
 * 用 v2 布局 —— 后者与「独立外壳」的架构决策直接冲突。留作后续 PR。
 */
import { useState, useEffect } from 'react';
import { EvidenceBadge, CitationRef, WarningBox, DangerBox, InkCard } from '../Primitives';
import type { ReactNode } from 'react';

/* 侧栏树 —— 硬编码于原型 :4-10。'◀' 标记当前页。 */
const DOC_TREE = [
  { group: '开始之前', items: ['新手上路', '用药前准备', '中国现实'] },
  { group: '用药路径', items: ['路径图 · 四阶段', '剂量红线', '血检指南'] },
  { group: '药物详解', items: ['雌激素总览', '口服 / 舌下', '贴片 / 凝胶', '注射 EV ◀', '抗雄激素', '孕激素', '禁用清单'] },
  { group: '专题', items: ['乳房发育 · 为什么不能急', '急症识别', '生育力保存', '指南对比'] },
  { group: '关于', items: ['编辑政策', '医学顾问', '反馈'] },
];

const DOC_TOC: Array<[string, string]> = [
  ['overview', '概述'],
  ['pk', '药代动力学'],
  ['dose', '剂量范围'],
  ['scim', 'SC vs IM'],
  ['redline', '红线'],
  ['refs', '参考文献'],
];

/* 典籍式章节序号 */
const SectionH = ({ n, children }: { n: string; children: ReactNode }) => (
  <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 24, margin: '0 0 10px', fontWeight: 700, display: 'flex', alignItems: 'baseline', gap: 10, whiteSpace: 'nowrap' }}>
    {/* AA：原型 pink-deep 14px 3.20 FAIL → 主题感知 pink-text */}
    <span aria-hidden="true" style={{ fontFamily: 'var(--font-heading)', fontSize: 14, color: 'var(--sakura-pink-text)', fontWeight: 700, letterSpacing: '0.1em' }}>{n}</span>
    {children}
  </h2>
);

const DOSE_ROWS = [
  ['起始 (月 1–3)', '1–2 mg', '每 7 天', 'Rothman 2024'],
  ['调整 (月 3–6)', '2–3 mg', '每 7 天', 'Hopkins 2024'],
  ['维持 (12 月+)', '3–5 mg', '每 7 天', 'ES 2017'],
  ['绝对上限', '5 mg', '/周', 'Rothman 2024'],
];

export default function DocScreen() {
  const [toc, setToc] = useState('overview');

  /* TOC 滚动跟随 —— rootMargin 逐字保留原型 :31 */
  useEffect(() => {
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) setToc(e.target.id.replace('doc-', ''));
      });
    }, { rootMargin: '-110px 0px -65% 0px' });
    DOC_TOC.forEach(([id]) => {
      const el = document.getElementById(`doc-${id}`);
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, []);

  const go = (id: string) => {
    const el = document.getElementById(`doc-${id}`);
    if (!el) return;
    const y = el.getBoundingClientRect().top + window.scrollY - 90;
    /* prefers-reduced-motion 下不该平滑滚动（前庭敏感） */
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: y, behavior: reduce ? 'auto' : 'smooth' });
    setToc(id);
  };

  return (
    <div className="yk-page yk-doc-grid">
      {/* 侧栏 — 文档树 */}
      <aside className="yk-doc-side" style={{ position: 'sticky', top: 'calc(var(--nav-h) + 20px)' }} aria-label="文档导航">
        {DOC_TREE.map((g) => (
          <div key={g.group} style={{ marginBottom: 18 }}>
            {/* AA：原型 pink-deep 11px 3.20 FAIL → pink-text */}
            <div className="yk-meta-label" style={{ fontFamily: 'var(--font-ui-accent)', fontSize: 11, color: 'var(--sakura-pink-text)', letterSpacing: '0.1em', fontWeight: 700, marginBottom: 6 }}>
              {g.group}
            </div>
            {g.items.map((it) => {
              const active = it.includes('◀');
              return (
                /* 原型这里是 <div>，既不可点也不可聚焦（侧栏树在原型里是纯展示）。
                   保持「纯展示」的行为（真实 MDX 接入前无处可跳），但用 <div> 而非
                   假链接是诚实的 —— 不给用户一个点不动的链接。 */
                <div key={it} style={{
                  fontSize: 13, padding: '5px 10px',
                  /* AA：原型 active 是 #fff on --sakura-pink = 1.80 不可读
                     → 墨字 on 粉底 7.06（底色 hex 不变，与 nav 当前页同一修法） */
                  color: active ? 'var(--ink)' : 'var(--fg-2)',
                  background: active ? 'var(--sakura-pink)' : 'transparent',
                  border: active ? '2px solid var(--ink)' : '2px solid transparent',
                  borderRadius: 8, marginBottom: 1,
                  fontWeight: active ? 700 : 400,
                  boxShadow: active ? '2px 2px 0 var(--ink)' : 'none',
                }} aria-current={active ? 'page' : undefined}>{it.replace(' ◀', '')}</div>
              );
            })}
          </div>
        ))}
      </aside>

      {/* 正文 */}
      <article className="yk-article" style={{ minWidth: 0 }}>
        <div className="yk-kicker" style={{ marginBottom: 10 }}>
          药物详解 / 雌激素 / <span style={{ color: 'var(--fg-1)' }}>注射 EV</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', marginBottom: 6 }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(28px, 4vw, 38px)', margin: 0, fontWeight: 400 }}>
            戊酸雌二醇注射液
          </h1>
          <EvidenceBadge level="B" />
        </div>
        {/* AA：原型 fg-3 2.82 → fg-2 6.07；mint-deep 1.98 → ink（✓ 符号已传达「通过」语义） */}
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontFamily: 'var(--font-ui-accent)', fontSize: 11, color: 'var(--fg-2)', fontWeight: 600, marginBottom: 24 }}>
          <span className="yk-nowrap">最后审核 2026-04-07</span>
          <span className="yk-nowrap">审核者 · 未飞</span>
          <span className="yk-nowrap" style={{ color: 'var(--ink)' }}>✓ 与 ≥2 来源交叉验证</span>
        </div>

        <section id="doc-overview">
          <SectionH n="壹">概述</SectionH>
          <p style={{ fontSize: 15, lineHeight: 1.85, color: 'var(--fg-1)' }}>
            戊酸雌二醇 (EV) 是雌二醇的长效酯化前药，经肌注或皮下注射后在血液中缓慢水解释放 E2<CitationRef n="1" />。
            注射给药绕过肝脏首过效应，VTE 风险低于口服途径。单药治疗证据：82.6% 使用者不需要额外抗雄<CitationRef n="2" />。
          </p>
        </section>

        <section id="doc-pk" style={{ marginTop: 28 }}>
          <SectionH n="貳">药代动力学</SectionH>
          <p style={{ fontSize: 15, lineHeight: 1.85, color: 'var(--fg-1)' }}>
            单次注射后血药浓度 2–3 天达峰，半衰期 4–5 天，7–10 天回落至谷值<CitationRef n="3" />。
            血检采样应在<strong>下次注射前当天早晨</strong>（谷值），否则数值不可比。
          </p>
        </section>

        <section id="doc-dose" style={{ marginTop: 28 }}>
          <SectionH n="叁">剂量范围</SectionH>
          <div className="yk-paper" data-paper="true" style={{ border: '2px solid var(--ink)', borderRadius: 12, overflowX: 'auto', boxShadow: '4px 4px 0 var(--ink)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, background: 'var(--ivory)', minWidth: 420 }}>
              <caption className="sr-only">戊酸雌二醇注射液各阶段剂量与来源</caption>
              <thead>
                <tr style={{ background: 'var(--sakura-blush)' }}>
                  {['阶段', '剂量', '频率', '来源'].map((h) => (
                    <th key={h} scope="col" style={{ padding: '11px 16px', textAlign: 'left', fontFamily: 'var(--font-ui-accent)', fontSize: 11, letterSpacing: '0.1em', color: 'var(--ink)', borderBottom: '2px solid var(--ink)', fontWeight: 700, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {DOSE_ROWS.map((row) => (
                  <tr key={row[0]} style={{ borderBottom: '1px dashed var(--ink-faint)' }}>
                    {row.map((c, j) => (
                      /* AA：原型来源列用 fg-3（2.82 on ivory）→ fg-2 6.07 */
                      <td key={c} style={{ padding: '11px 16px', color: j === 3 ? 'var(--fg-2)' : 'var(--fg-1)', fontFamily: j === 1 ? 'var(--font-hud)' : 'inherit', fontWeight: j === 1 ? 700 : 400, whiteSpace: 'nowrap' }}>{c}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section id="doc-scim" style={{ marginTop: 28 }}>
          <SectionH n="肆">SC vs IM</SectionH>
          <WarningBox title="皮下与肌注疗效无显著差异">
            SC 操作更安全、自行注射更方便 (Herndon 2023; Poage 2026)。两者生物利用度相当。
          </WarningBox>
        </section>

        <section id="doc-redline" style={{ marginTop: 28 }}>
          <SectionH n="伍">红线</SectionH>
          <DangerBox title="禁止 · 单次 ≥10 mg" stamp="禁止">
            单次注射 ≥10 mg 或间隔 &lt;5 天且 &gt;5 mg 会使峰值 E2 超过 1000 pg/mL，显著增加 VTE 与肝损伤风险<CitationRef n="4" />。
          </DangerBox>
        </section>

        <section id="doc-refs" style={{ marginTop: 28 }}>
          <SectionH n="陸">参考文献</SectionH>
          <ol style={{ fontSize: 12.5, color: 'var(--fg-2)', lineHeight: 1.85, paddingLeft: 20, margin: 0 }}>
            <li>Oriowo MA et al. Pharmacokinetics of E2 Esters. <em>Contraception</em> 1980.</li>
            <li>Misakian AL et al. Injectable E2 Monotherapy. <em>Endocrine Practice</em> 2025.</li>
            <li>Rothman MS et al. Injectable E2 Dosing. <em>Transgender Health</em> 2024;9(6):463–465. <span style={{ color: 'var(--sakura-pink-text)', fontFamily: 'var(--font-hud)' }}>doi:10.1089/trgh.2024.0081</span></li>
            <li>Herndon JS et al. SC vs IM. <em>Endocr Pract</em> 2023;29(5):356–361.</li>
          </ol>
        </section>

        {/* 典籍翻页（示意 —— 真实 MDX 接入前无处可跳，故保持非链接） */}
        <nav aria-label="翻页" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 36, maxWidth: 660 }}>
          <InkCard variant="cream" hoverLift={false} style={{ padding: '12px 16px' }}>
            <div className="yk-meta-label" style={{ fontFamily: 'var(--font-ui-accent)', fontSize: 10, color: 'var(--fg-2)', fontWeight: 700, letterSpacing: '0.08em', marginBottom: 4 }}>‹ 上一页</div>
            <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 14 }}>经皮雌二醇凝胶</div>
          </InkCard>
          <InkCard variant="cream" hoverLift={false} style={{ padding: '12px 16px', textAlign: 'right' }}>
            <div className="yk-meta-label" style={{ fontFamily: 'var(--font-ui-accent)', fontSize: 10, color: 'var(--fg-2)', fontWeight: 700, letterSpacing: '0.08em', marginBottom: 4 }}>下一页 ›</div>
            <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 14 }}>庚酸雌二醇注射液</div>
          </InkCard>
        </nav>

        <div className="yk-paper" data-paper="true" style={{ marginTop: 36, padding: '14px 20px', background: 'var(--cream)', border: '2px dashed var(--ink-faint)', borderRadius: 12, fontSize: 12, color: 'var(--fg-2)', lineHeight: 1.7 }}>
          本站内容仅供教育和参考用途，不构成医疗建议，不能替代合格医生的面对面诊断和治疗。
        </div>
      </article>

      {/* TOC */}
      <nav className="yk-doc-toc" aria-label="本页目录" style={{ position: 'sticky', top: 'calc(var(--nav-h) + 20px)' }}>
        <div className="yk-meta-label" style={{ fontFamily: 'var(--font-ui-accent)', fontSize: 10, color: 'var(--fg-2)', letterSpacing: '0.12em', fontWeight: 700, marginBottom: 8 }}>
          本页目录
        </div>
        {DOC_TOC.map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => go(id)}
            aria-current={toc === id ? 'true' : undefined}
            style={{
              display: 'block', width: '100%', textAlign: 'left',
              fontSize: 12.5, padding: '4px 10px', cursor: 'pointer',
              background: 'none', border: 'none',
              /* 左边框保留 pink-deep（装饰，无对比度要求）；文字用主题感知 pink-text */
              borderLeft: toc === id ? '3px solid var(--sakura-pink-deep)' : '3px solid var(--ink-faint)',
              color: toc === id ? 'var(--sakura-pink-text)' : 'var(--fg-2)',
              fontWeight: toc === id ? 700 : 400,
              fontFamily: 'var(--font-body)',
            }}
          >{label}</button>
        ))}
      </nav>
    </div>
  );
}
