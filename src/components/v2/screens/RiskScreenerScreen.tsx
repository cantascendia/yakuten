/**
 * RiskScreenerScreen — 风险自评（7 问 · 4 维度）
 * 移植自 design_files/ui_kits/yakuten/risk-screener-screen.jsx (131 行)
 *
 * 岛屿（client:visible）：答题 → 实时评分。
 * 【不写 localStorage】—— 原型也没写；答案是健康数据，README 明确「输入值不持久化（隐私）」。
 *
 * ⚠️ 评分算法、权重、阈值、建议文案【逐字移植，一个数字都不改】。
 * 这是 CONSTITUTION §1 范畴的医学逻辑：改动需 spec-driven + 双 reviewer 签字。
 * 移植 ≠ 改动；「顺手优化」才是改动。
 */
import { useState } from 'react';
import { PageHead, InkCard, HudBar, Icon } from '../Primitives';

type DimId = 'vte' | 'liver' | 'men' | 'cvd';

/* 7 问 + 权重 —— 逐字取自原型 :5-11 */
const QUESTIONS: Array<{ id: string; q: string; dims: Partial<Record<DimId, number>> }> = [
  { id: 'smoke', q: '你目前吸烟吗？', dims: { vte: 2, cvd: 2 } },
  { id: 'age', q: '你的年龄超过 35 岁吗？', dims: { vte: 1, cvd: 1 } },
  { id: 'bmi', q: 'BMI 超过 30 吗？', dims: { vte: 1, cvd: 1 } },
  { id: 'vteHist', q: '本人或直系亲属有血栓（DVT/PE）病史吗？', dims: { vte: 3 } },
  { id: 'migraine', q: '有偏头痛先兆史吗？', dims: { cvd: 2 } },
  { id: 'cpa', q: '正在使用 CPA ≥25 mg/天 吗？', dims: { men: 3, liver: 2 } },
  { id: 'liver', q: '使用比卡鲁胺，或有肝病史 / 长期饮酒吗？', dims: { liver: 2 } },
];

/* 4 维度 + max —— 逐字取自原型 :14-17。
   color 传给 HudBar 做【填充条渐变起点】（图形，无对比度要求）；
   HudBar 的 label 文字色已在 Primitives 里统一改为 AA 替身。 */
const DIMS: Array<{ id: DimId; label: string; max: number; color: string }> = [
  { id: 'vte', label: 'VTE 血栓', max: 7, color: 'var(--sakura-pink-deep)' },
  { id: 'liver', label: '肝脏', max: 4, color: 'var(--honey)' },
  { id: 'men', label: '脑膜瘤', max: 3, color: 'var(--lavender-deep)' },
  { id: 'cvd', label: '心血管', max: 6, color: 'var(--sky-deep)' },
];

export default function RiskScreenerScreen() {
  const [answers, setAnswers] = useState<Record<string, boolean>>({});
  const answered = Object.keys(answers).length;
  const done = answered === QUESTIONS.length;

  /* 计分：只有答「是」才累加（逐字保留原型 :24-27 的语义） */
  const scores: Record<DimId, number> = { vte: 0, liver: 0, men: 0, cvd: 0 };
  QUESTIONS.forEach((q) => {
    if (answers[q.id]) {
      (Object.entries(q.dims) as Array<[DimId, number]>).forEach(([d, w]) => { scores[d] += w; });
    }
  });

  /* 分级阈值逐字保留（原型 :29-34）：pct>=0.5 偏高 / pct>0 注意 / else 低。
     AA：原型的 --honey 作 11px 文字落 paper 仅 1.77 → --ink；
     --mint-deep 1.98 → --ink；--danger 3.27 → --danger-deep 4.90。
     等级语义由文字本身（偏高/注意/低）承载，不依赖颜色 —— 这也更符合
     WCAG 1.4.1「不能只用颜色传达信息」。 */
  const level = (d: { id: DimId; max: number }): [string, string] => {
    const pct = scores[d.id] / d.max;
    if (pct >= 0.5) return ['偏高', 'var(--danger-deep)'];
    if (pct > 0) return ['注意', 'var(--ink)'];
    return ['低', 'var(--ink)'];
  };

  /* 建议文案 —— 【去掉个人化剂量处方】（review #6，硬红线）。
     原型 :39 让完成问卷的用户直接得到「减至 5–12.5 mg/天」这类具体用药方案 ——
     由个人回答生成的具体剂量，正是 CLAUDE.md / CONSTITUTION §7 的绝对禁止项
     「个人化剂量文案」。这些评分权重也未经临床验证，不应据此开方。
     改为：只做【不带剂量】的风险因素说明 + 就医讨论提示，把「调多少」留给医生。
     阈值（>=3 / >=2）保留 —— 它们只决定「是否提示该风险」，不再输出剂量。 */
  const advice: string[] = [];
  if (done) {
    if (scores.vte >= 3) advice.push('VTE 风险因素偏多 — 经皮途径（贴片/凝胶）的血栓风险通常低于口服雌激素，戒烟也有帮助。是否调整途径，请与医生讨论。');
    if (scores.men >= 3) advice.push('大剂量 CPA 与脑膜瘤风险相关 (Hudelist 2026) — 请与医生讨论是否有必要下调 CPA 剂量或更换抗雄方案。具体剂量由医生决定。');
    if (scores.liver >= 2) advice.push('肝脏相关风险因素存在 — 建议定期监测肝功能（ALT/AST）；若明显升高，请及时就医评估是否需要停用相关药物。');
    if (scores.cvd >= 3) advice.push('心血管风险因素叠加 — 强烈建议在医生监测下用药，并关注血压、血脂。');
    if (!advice.length) advice.push('未发现明显高危因素。仍建议完成基线血检，并保持常规复查节奏。');
  }

  return (
    <div className="yk-page yk-page--narrow">
      <PageHead
        volume="卷四" tab="自评" kicker="TOOLS · 风险自评"
        tapeColor="var(--butter)" pattern="solid"
        title="风险自评" accent="7 问"
        lede="回答 7 个问题，得到 4 个维度的风险画像。纯前端运行，答案不上传、不存储。"
      />

      <div className="yk-grid yk-grid--2" style={{ marginTop: 28, alignItems: 'start' }}>
        {/* 问题列 */}
        <InkCard variant="paper" hoverLift={false} style={{ padding: '6px 0' }}>
          {QUESTIONS.map((q, i) => (
            <div key={q.id} style={{
              padding: '14px 20px',
              borderBottom: i < QUESTIONS.length - 1 ? '1px dashed var(--ink-faint)' : 'none',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14 }}>
                <div id={`yk-q-${q.id}`} style={{ fontSize: 14, color: 'var(--fg-1)', lineHeight: 1.5 }}>
                  {/* AA：原型 fg-3 2.82 → fg-2 6.07 */}
                  <span style={{ fontFamily: 'var(--font-hud)', color: 'var(--fg-2)', fontSize: 11, fontWeight: 700, marginRight: 8 }}>Q{i + 1}</span>
                  {q.q}
                </div>
                {/* 是/否是一组互斥选项 → group + aria-pressed，读屏才知道选了哪个 */}
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }} role="group" aria-labelledby={`yk-q-${q.id}`}>
                  {([['是', true], ['否', false]] as const).map(([t, v]) => {
                    const sel = answers[q.id] === v;
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setAnswers({ ...answers, [q.id]: v })}
                        aria-pressed={sel}
                        style={{
                          minWidth: 44, minHeight: 44, padding: '6px 14px', cursor: 'pointer',
                          borderRadius: 999, border: '2px solid var(--ink)',
                          /* AA：原型「是」选中态是 #fff on --sakura-pink = 1.80 不可读。
                             改墨字 on 粉底 = 7.06（底色 hex 不变，与 nav 当前页同一修法）。 */
                          background: sel ? (v ? 'var(--sakura-pink)' : 'var(--mint)') : 'var(--ivory)',
                          color: 'var(--ink)',
                          fontFamily: 'var(--font-ui-accent)', fontWeight: 700, fontSize: 13,
                          boxShadow: sel ? '2px 2px 0 var(--ink)' : 'none',
                          transition: 'all .15s',
                        }}
                      >{t}</button>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </InkCard>

        {/* 结果列 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <InkCard variant={done ? 'paper' : 'cream'} hoverLift={false}>
            <div className="yk-kicker" style={{ marginBottom: 14 }}>RESULT · 风险画像</div>
            {!done && (
              <p aria-live="polite" style={{ fontSize: 13, color: 'var(--fg-2)', margin: '4px 0 12px' }}>
                已回答 {answered} / {QUESTIONS.length} — 答完后显示评分。
              </p>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, opacity: done ? 1 : 0.45 }}>
              {DIMS.map((d) => {
                const [lab, c] = level(d);
                return (
                  <div key={d.id} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 56px', gap: 10, alignItems: 'center' }}>
                    <HudBar label={d.label} value={scores[d.id]} max={d.max} color={d.color} />
                    <span className="yk-nowrap" style={{
                      fontFamily: 'var(--font-ui-accent)', fontSize: 11, fontWeight: 700,
                      color: done ? c : 'var(--fg-2)', textAlign: 'right',
                    }}>{done ? lab : '—'}</span>
                  </div>
                );
              })}
            </div>
          </InkCard>

          {done && (
            <InkCard variant={scores.vte >= 3 || scores.men >= 3 ? 'gold' : 'mint'} hoverLift={false} style={{ padding: 18 }}>
              <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 15, marginBottom: 8 }}>
                <Icon name="sparkles" size={15} color="var(--ink)" /> 下一步建议
              </div>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.7, color: 'var(--fg-1)' }}>
                {advice.map((a) => <li key={a} style={{ marginBottom: 6 }}>{a}</li>)}
              </ul>
            </InkCard>
          )}

          <InkCard variant="cream" hoverLift={false} style={{ padding: '12px 18px', fontSize: 12, color: 'var(--fg-2)', lineHeight: 1.7 }}>
            <strong style={{ color: 'var(--sakura-pink-text)' }}>声明 ·</strong> 评分仅为风险因素计数，不是诊断。来源：Endocrine Society 2017 Table 11 · WPATH SOC 8 Ch.12 · Lee 2022。
          </InkCard>
        </div>
      </div>
    </div>
  );
}
