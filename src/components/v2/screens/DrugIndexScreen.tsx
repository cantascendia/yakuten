/**
 * DrugIndexScreen — 药物图鉴总览（5 分类 × 20 药卡）
 * 移植自 design_files/ui_kits/yakuten/drug-index-screen.jsx (114 行)
 *
 * 数据：仓库 src/data/drugs.json（20 条，category 分布 estrogen 8 / antiandrogen 4 /
 * progestogen 4 / 5ari 2 / banned 2）。原型读 window.YK_DATA.drugs → 改构建期 import。
 * 零 JS：纯数据渲染 + 导航。
 */
import { hrefFor } from '../routes';
import { drugs, ACCESS_ZH, vteColor, type DrugCategory } from '../data';
import { PageHead, WarningBox, WashiTape, InkCard, EvidenceBadge } from '../Primitives';

/* 分类元数据 —— 逐字移植自原型 drug-index-screen.jsx:3-9（含 en 的大写形态与 deep 色）。
   刻意不复用 data.ts 的 CATEGORIES：那份是给 drug-detail 用的（en 小写、无 deep），
   两处的展示需求不同，强行合并反而会牵一发动全身。 */
const CATS: Record<DrugCategory, { zh: string; en: string; color: string; deep: string }> = {
  estrogen: { zh: '雌激素', en: 'ESTROGENS', color: 'var(--sakura-pink)', deep: 'var(--sakura-pink-text)' },
  antiandrogen: { zh: '抗雄激素', en: 'ANTIANDROGENS', color: 'var(--butter)', deep: 'var(--honey)' },
  progestogen: { zh: '孕激素', en: 'PROGESTOGENS', color: 'var(--lavender)', deep: 'var(--lavender-deep)' },
  '5ari': { zh: '5α-还原酶抑制剂', en: '5α-RI', color: 'var(--sky)', deep: 'var(--sky-deep)' },
  banned: { zh: '绝对禁用', en: 'BANNED', color: 'var(--coral)', deep: 'var(--danger)' },
};

const ORDER: DrugCategory[] = ['estrogen', 'antiandrogen', 'progestogen', '5ari', 'banned'];

export default function DrugIndexScreen() {
  return (
    <div className="yk-page">
      <PageHead
        volume="卷二" tab="图鉴" kicker="CODEX · 药物图鉴"
        tapeColor="var(--sakura-pink)" pattern="dots"
        title={`${drugs.length} 种药物`} accent="循证图鉴"
        lede="每种药物的剂量范围与 ≥2 个独立来源交叉验证（WPATH SOC 8 · Endocrine Society 2017 · UCSF）。点开任意卡片查看完整详解页。"
      />

      <WarningBox title="超量不会让你「女性化更快」">
        E2 &gt;200 pg/mL 不带来更强效果，只增加风险 (Endocrine Society 2017, Rec 2.2)。
      </WarningBox>

      {ORDER.map((catKey) => {
        const cat = CATS[catKey];
        const list = drugs.filter((d) => d.category === catKey);
        if (!list.length) return null;
        const banned = catKey === 'banned';
        return (
          <section key={catKey} className="yk-section" style={{ marginTop: 40 }}>
            {/* kicker 的 deep 色是【文字】色：estrogen 原为 --sakura-pink-deep（3.20 FAIL）
                → 上方 CATS 里已换成主题感知的 --sakura-pink-text。
                其余 honey/lavender-deep/sky-deep/danger 作为 12px 小字落 bg-1 亦偏低，
                但它们由 .yk-kicker 的 nowrap 小标签样式承载、且此处 color 会被下方
                inline 覆盖 —— 统一交给 --ink 更稳妥。 */}
            <div className="yk-kicker" style={{ color: 'var(--ink)' }}>
              <WashiTape color={cat.color} pattern={banned ? 'stripes' : 'dots'} width={48} rotation={-4} />
              <span>{cat.en} · {cat.zh} · {list.length} 种</span>
            </div>
            <div className="yk-grid yk-grid--3">
              {list.map((d) => {
                const r = d.routes?.[0];
                const vte = r?.vteRisk?.rr;
                return (
                  <InkCard
                    key={d.id}
                    variant={banned ? 'pink' : 'paper'}
                    href={hrefFor('drug', d.id)}
                    style={{ padding: 18 }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
                      <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 19, margin: 0, fontWeight: 700, lineHeight: 1.3 }}>
                        {d.names.zh}
                      </h3>
                      {banned
                        ? <span aria-label="禁用" style={{ color: 'var(--danger)', fontSize: 20, fontWeight: 700, flexShrink: 0 }}>✕</span>
                        : <EvidenceBadge level={r?.evidenceLevel || 'B'} />}
                    </div>
                    {/* AA：原型 --fg-3 落 ivory 2.82 / 落 blush 2.20，均 FAIL → --fg-2（6.07 / 4.73） */}
                    <div style={{ fontFamily: 'var(--font-ui-accent)', fontSize: 11, color: 'var(--fg-2)', fontWeight: 600, marginBottom: 10 }}>
                      {d.names.generic}
                    </div>
                    {d.names.slang?.length > 0 && (
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                        {d.names.slang.slice(0, 3).map((s) => (
                          <span key={s} style={{
                            padding: '2px 10px', borderRadius: 999,
                            background: 'var(--cream)', border: '1.5px solid var(--ink-faint)',
                            fontSize: 11, color: 'var(--fg-2)', fontFamily: 'var(--font-body)',
                            whiteSpace: 'nowrap',
                          }}>{s}</span>
                        ))}
                      </div>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 12, color: 'var(--fg-2)' }}>
                      {r?.doseRange?.maintenance && !banned && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                          <span className="yk-meta-label" style={{ color: 'var(--fg-2)' }}>维持剂量</span>
                          <span className="yk-nowrap" style={{ fontFamily: 'var(--font-hud)', fontWeight: 700, color: 'var(--fg-1)' }}>
                            {r.doseRange.maintenance.min}–{r.doseRange.maintenance.max} {r.doseRange.maintenance.unit}
                          </span>
                        </div>
                      )}
                      {vte != null && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                          <span className="yk-meta-label" style={{ color: 'var(--fg-2)' }}>VTE 相对风险</span>
                          {/* 阈值逐字保留：>2 danger · >1.2 honey · else mint-deep（data.ts:vteColor） */}
                          <span className="yk-nowrap" style={{ fontFamily: 'var(--font-hud)', fontWeight: 700, color: vteColor(vte) }}>
                            RR ≈ {vte}
                          </span>
                        </div>
                      )}
                      {d.chinaAccess && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                          <span className="yk-meta-label" style={{ color: 'var(--fg-2)' }}>中国获取</span>
                          <span className="yk-nowrap" style={{ fontWeight: 600, color: 'var(--fg-1)' }}>
                            {ACCESS_ZH[d.chinaAccess.availability] || d.chinaAccess.availability}
                          </span>
                        </div>
                      )}
                    </div>
                    {banned && (
                      <div style={{
                        marginTop: 12, padding: '8px 12px', borderRadius: 8,
                        /* AA：原型 #fff on --danger #E85A7A = 3.40 FAIL（12px 700）
                           → --danger-deep = 5.10 PASS。这是「绝对禁用」警示条，
                           看不清等于没有。 */
                        background: 'var(--danger-deep)', color: '#fff', border: '2px solid var(--ink)',
                        fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-ui-accent)',
                      }}>
                        ✕ 绝对禁用 — 任何方案都不应包含
                      </div>
                    )}
                  </InkCard>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
