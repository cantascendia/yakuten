/**
 * RefsScreen — 文献库（搜索 + 证据等级过滤）
 * 移植自 design_files/ui_kits/yakuten/refs-screen.jsx (94 行)
 *
 * 岛屿（client:visible）：搜索/筛选是实时客户端 state。
 * 数据来自仓库 references.json（43 条；设计包那份只有 42，剥掉了 awmf-s3-2019 德国指南）。
 * 无 localStorage —— 搜索词不持久化（与 README「输入值不持久化」一致）。
 */
import { useState } from 'react';
import { references, type EvidenceLevel } from '../data';
import { PageHead, InkCard } from '../Primitives';

/* 证据等级配色。这里是【徽章边框 + 字母】：边框用语义色（装饰），
   字母同色 —— 实测 safe/info/caution 作 13px 文字落 ivory 均 <4.5，
   故字母统一墨色，等级语义由边框色 + 字母本身承载。 */
const LVL_BORDER: Record<EvidenceLevel, string> = {
  A: 'var(--safe)',
  B: 'var(--info)',
  C: 'var(--caution)',
  X: 'var(--danger)',
};

const FILTERS = ['all', 'A', 'B', 'C'] as const;

export default function RefsScreen() {
  const [q, setQ] = useState('');
  const [lvl, setLvl] = useState<string>('all');

  /* 过滤谓词逐字移植原型 :8-13 */
  const filtered = references.filter((r) => {
    if (lvl !== 'all' && r.evidenceLevel !== lvl) return false;
    if (!q) return true;
    const hay = `${r.authors} ${r.title} ${r.journal} ${r.year}`.toLowerCase();
    return hay.includes(q.toLowerCase());
  });

  return (
    <div className="yk-page yk-page--narrow">
      <PageHead
        volume="卷四" tab="文献" kicker="TOOLS · 文献库"
        tapeColor="var(--lavender)" pattern="dots"
        title="参考文献" accent={`${references.length} 条`}
        lede="站内每条医学声明的来源。无引用 = 不写入网站。"
      />

      {/* 过滤器 */}
      <div style={{ display: 'flex', gap: 12, marginTop: 26, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          className="yk-input"
          type="search"
          aria-label="搜索文献"
          placeholder="搜索作者 / 标题 / 期刊…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ maxWidth: 320, fontFamily: 'var(--font-body)', fontWeight: 500 }}
        />
        {/* 一组互斥筛选 → radiogroup 语义（原型是裸 button，读屏听不出这是一组、也听不出选中态） */}
        <div style={{ display: 'flex', gap: 6 }} role="group" aria-label="按证据等级筛选">
          {FILTERS.map((l) => {
            const active = lvl === l;
            return (
              <button
                key={l}
                type="button"
                onClick={() => setLvl(l)}
                aria-pressed={active}
                style={{
                  minHeight: 40, padding: '6px 16px', cursor: 'pointer',
                  borderRadius: 999, border: '2px solid var(--ink)',
                  /* AA：原型选中态是 #fff on --sakura-pink = 1.80:1（几乎不可读）
                     → --sakura-pink-aa 白字 5.39。这与 master PR #36 修 yk-nav 当前页
                     是同一个问题、同一个修法。 */
                  background: active ? 'var(--sakura-pink-aa)' : 'var(--ivory)',
                  color: active ? '#fff' : 'var(--fg-1)',
                  fontFamily: 'var(--font-ui-accent)', fontWeight: 700, fontSize: 12,
                  boxShadow: active ? '2px 2px 0 var(--ink)' : 'none',
                  whiteSpace: 'nowrap',
                }}
              >{l === 'all' ? '全部' : `等级 ${l}`}</button>
            );
          })}
        </div>
        {/* 计数是筛选结果的反馈 → aria-live，否则读屏用户按下筛选后毫无感知 */}
        <span aria-live="polite" style={{ fontFamily: 'var(--font-hud)', fontSize: 12, color: 'var(--fg-2)', fontWeight: 700 }}>
          {filtered.length} / {references.length}
        </span>
      </div>

      {/* 列表 */}
      <InkCard variant="paper" hoverLift={false} style={{ marginTop: 20, padding: '4px 0' }}>
        {filtered.length === 0 && (
          <div style={{ padding: '36px 24px', textAlign: 'center', fontFamily: 'var(--font-hand)', fontSize: 18, color: 'var(--fg-2)' }}>
            没有匹配的文献…换个关键词试试 ♡
          </div>
        )}
        {filtered.map((r, i) => (
          <div key={r.id} style={{
            display: 'grid', gridTemplateColumns: '40px minmax(0,1fr)', gap: 14,
            padding: '14px 20px',
            borderBottom: i < filtered.length - 1 ? '1px dashed var(--ink-faint)' : 'none',
            alignItems: 'start',
          }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              height: 28, borderRadius: 6, marginTop: 2,
              background: 'var(--ivory)',
              border: `2px solid ${LVL_BORDER[r.evidenceLevel] || LVL_BORDER.B}`,
              fontFamily: 'var(--font-hud)', fontSize: 13, fontWeight: 700,
              color: 'var(--ink)',
              whiteSpace: 'nowrap',
            }}>{r.evidenceLevel}</span>
            <div>
              <div style={{ fontSize: 14, color: 'var(--fg-1)', fontWeight: 600, lineHeight: 1.5 }}>
                {r.title}
              </div>
              <div style={{ fontSize: 12, color: 'var(--fg-2)', marginTop: 3 }}>
                {r.authors} · <em>{r.journal}</em> · <span style={{ fontFamily: 'var(--font-hud)', fontWeight: 700 }}>{r.year}</span>
              </div>
              {/* yk-ref-doi: overflow-wrap:anywhere —— DOI/URL 是长无空格串，
                  JetBrains Mono 下没有断词点，会撑破 minmax(0,1fr)（实测 375px 溢出 38px） */}
              {(r.doi || r.url) && (
                <a
                  href={r.url || `https://doi.org/${r.doi}`}
                  target="_blank"
                  rel="noopener"
                  className="yk-ref-doi"
                  style={{ fontFamily: 'var(--font-hud)', fontSize: 11, color: 'var(--sakura-pink-text)', fontWeight: 700, textDecoration: 'none' }}
                >
                  {r.doi ? `doi:${r.doi}` : r.url!.replace(/^https?:\/\//, '').slice(0, 48)}
                </a>
              )}
            </div>
          </div>
        ))}
      </InkCard>
    </div>
  );
}
