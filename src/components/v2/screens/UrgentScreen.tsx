/**
 * UrgentScreen — 急症识别 · 停药信号
 * 移植自 design_files/ui_kits/yakuten/urgent-screen.jsx (94 行)
 *
 * 这一页脱离可爱风：症状 → 疑似 → 立即做什么。设计红线：危险=墨底红章，不包装。
 * 零 JS：原型此屏无 state，仅 setRoute 导航 → 全改 <a href>。
 *
 * 热线数据：原型读 window.YK_DATA.hotlines（26 条全量，含 23 条国际热线）。
 * 此处用 hotlinesCN（scope==='全国' → 精确 3 条），与原型墨底三栏卡的版式吻合。
 */
import { hrefFor } from '../routes';
import { hotlinesCN } from '../data';
import {
  PageHead, InkCard, SealStamp, SectionKicker, FoxTeacherMark, SpeechBubble,
} from '../Primitives';

/* 六条停药信号 —— 硬编码于原型 urgent-screen.jsx:3-16，逐字不改。
   这是本站最高安全等级的内容（CONSTITUTION §1），移植时一个字都不能动。 */
const SIGNALS = [
  {
    n: '01', sym: '单侧小腿肿胀 · 疼痛 · 发红发热', sus: '疑似 DVT · 深静脉血栓',
    act: '立即急诊。不要按摩、不要热敷患肢——血栓可能脱落。', who: '所有雌激素使用者',
  },
  {
    n: '02', sym: '突发胸痛 · 呼吸困难 · 咯血', sus: '疑似 PE · 肺栓塞',
    act: '拨 120。这是最危险的一条，不要「再等等看」。', who: '所有雌激素使用者',
  },
  {
    /* 对齐站内 SSOT risks.mdx:152「巩膜或皮肤明显发黄，伴茶色尿 → 立即停药，当天去急诊查肝功能」。
       原型的「48 小时内查肝功能」弱于站内既有的「当天急诊」标准，属安全回归，已修正。 */
    n: '03', sym: '皮肤 / 眼白发黄 · 深色尿', sus: '疑似急性肝损伤',
    act: '立即停 CPA / 比卡鲁胺，当天去急诊查肝功能（ALT/AST/胆红素）。不要等两天。', who: 'CPA · 比卡鲁胺使用者',
  },
  {
    n: '04', sym: '严重头痛 + 视力变化', sus: '疑似脑膜瘤',
    act: '停 CPA，尽快神经科就诊，说明用药史。', who: 'CPA 使用者（≥25mg 风险显著）',
  },
  {
    n: '05', sym: '肌肉无力 + 心悸', sus: '疑似高钾血症',
    act: '停螺内酯，急诊查电解质 + 心电图。高钾可致心律失常。', who: '螺内酯使用者',
  },
  {
    n: '06', sym: '持续严重抑郁 · 自杀意念', sus: '心理危机',
    act: '打下面的热线，或直接去急诊。你不需要撑到「够严重」才求助。', who: '任何人 · 任何时候',
  },
] as const;

export default function UrgentScreen() {
  return (
    <div className="yk-page yk-page--narrow">
      <PageHead
        kicker="URGENT · 急症识别"
        tapeColor="var(--coral)"
        pattern="stripes"
        title="停药信号"
        accent="六条"
        lede="出现下面任何一条：停药，就医。这一页不可爱——因为它不需要可爱。症状对照来自 Endocrine Society 2017 与 WPATH SOC 8。"
      />

      {/* 热线 — 墨底，停住视线 */}
      <div style={{
        marginTop: 8, padding: '18px 20px', borderRadius: 14,
        background: 'var(--ink)', border: '2px solid var(--ink)', boxShadow: '5px 5px 0 rgba(74,40,56,0.35)',
      }}>
        <div style={{ fontFamily: 'var(--font-ui-accent)', fontSize: 11, letterSpacing: '0.14em', color: 'var(--sakura-blush)', fontWeight: 700, marginBottom: 12 }}>
          24H 热线 · 现在就能打
        </div>
        <div className="yk-grid yk-grid--3" style={{ gap: 12 }}>
          {hotlinesCN.map((h) => (
            <a key={h.id} href={h.href} style={{
              display: 'block', textDecoration: 'none', textAlign: 'center',
              background: 'var(--ivory)', border: '2px solid var(--ink)', borderRadius: 10,
              padding: '12px 10px', boxShadow: '3px 3px 0 rgba(255,168,197,0.5)',
            }}>
              {/* --danger 保留：24px 属 WCAG 大字（≥18pt），只需 3:1，实测 3.27 PASS。
                  红色的急救号码是这一页的视觉锚点，不该为了小字规则牺牲。 */}
              <span style={{ display: 'block', fontFamily: 'var(--font-hud)', fontSize: 24, fontWeight: 700, color: 'var(--danger)', whiteSpace: 'nowrap' }}>{h.number}</span>
              <span className="yk-nowrap" style={{ display: 'block', fontSize: 12, color: 'var(--ink)', fontWeight: 600, marginTop: 2 }}>{h.name.replace('全国统一', '')}</span>
            </a>
          ))}
        </div>
      </div>

      {/* 六条信号 */}
      <div className="yk-grid yk-grid--2" style={{ marginTop: 28 }}>
        {SIGNALS.map((s) => (
          <InkCard key={s.n} variant="paper" hoverLift={false} style={{ padding: 20, borderColor: 'var(--danger)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
              {/* AA：13px 小字，--danger on ivory = 3.27 FAIL → --danger-deep = 4.90 PASS */}
              <span style={{ fontFamily: 'var(--font-hud)', fontSize: 13, fontWeight: 700, color: 'var(--danger-deep)' }}>{s.n}</span>
              {/* 原型传 size="sm"，但 SealStamp 只判断 === 'lg'，'sm' 实际落到 md 分支 → 直接用默认 md，行为一致 */}
              <SealStamp color="var(--danger)" rotate={-4}>{s.sus.includes('心理') ? '求助' : '停药'}</SealStamp>
            </div>
            <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 20, fontWeight: 700, margin: '8px 0 6px', lineHeight: 1.45, textWrap: 'balance' }}>{s.sym}</h3>
            {/* AA：12px 小字 → danger-deep */}
            <div className="yk-nowrap" style={{ fontFamily: 'var(--font-ui-accent)', fontSize: 12, fontWeight: 700, color: 'var(--danger-deep)', marginBottom: 10 }}>{s.sus}</div>
            <p style={{ fontSize: 13.5, lineHeight: 1.7, color: 'var(--fg-1)', margin: '0 0 10px', textWrap: 'pretty' }}>{s.act}</p>
            {/* AA：原型 --fg-3 on ivory = 2.82 FAIL → --fg-2 = 6.07 PASS */}
            <div style={{ fontSize: 11.5, color: 'var(--fg-2)', fontFamily: 'var(--font-ui-accent)', fontWeight: 600 }}>适用：{s.who}</div>
          </InkCard>
        ))}
      </div>

      {/* 就医话术 — 狐狸老师 */}
      <section style={{ marginTop: 36 }}>
        <SectionKicker tapeColor="var(--sky)" pattern="grid">就医话术 · 不用出柜也能看急症</SectionKicker>
        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', marginTop: 14 }}>
          <div style={{ flexShrink: 0, marginTop: 6 }}><FoxTeacherMark size={52} /></div>
          <SpeechBubble tail="bottom-left" tone="paper" style={{ flex: 1 }}>
            <div style={{ fontSize: 14, lineHeight: 1.85 }}>
              急诊直接描述症状就行（「小腿肿痛三天」），不需要解释为什么用药。
              需要查激素时说<b>「我想检查激素水平」</b>——任何三甲医院内分泌科都能开血检。
            </div>
            <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px dashed var(--ink-faint)', fontSize: 13, lineHeight: 1.8, color: 'var(--fg-2)' }}>
              带上三样：① 正在用的药物清单（名称 · 剂量 · 最后一次用药时间）② 最近一次血检报告 ③ 本页截图
            </div>
          </SpeechBubble>
        </div>
      </section>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 24 }}>
        <a className="btn-flame" href={hrefFor('hospitals')} style={{ display: 'inline-flex', alignItems: 'center' }}>找友好医院 →</a>
        <a className="btn-ghost" href={hrefFor('blood')} style={{ display: 'inline-flex', alignItems: 'center' }}>血检数值判读 →</a>
      </div>

      <div style={{ marginTop: 28, padding: '14px 18px', border: '2px dashed var(--ink-faint)', borderRadius: 12, fontSize: 12.5, color: 'var(--fg-2)', textAlign: 'center' }}>
        本页帮助你识别「必须就医」的信号，不能替代医生的现场判断。拿不准时，按更严重的情况处理。
      </div>
    </div>
  );
}
