/**
 * ToolsScreen — 临床工具中心（6 工具卡 + AI 问答整行横幅 = 「七件」）
 * 移植自 design_files/ui_kits/yakuten/tools-screen.jsx (74 行)
 *
 * 零 JS：工具卡全是导航 → <a href>。
 * 唯一例外是 AI 横幅：它要打开 AIChat 岛，而本屏是静态渲染、拿不到岛的 setState。
 * → 渲染成 <button data-yk-open-chat>，由 AIChatWidget 的事件委托接住
 *   （见 AIChatWidget.tsx 的 document click 监听）。
 *   本页的 V2Layout 传 eagerChat → AIChatWidget 用 client:load 而非 client:idle，
 *   确保岛挂载前的早期点击不会丢。
 *
 * 注：原型文件头注释写「8 个临床工具入口」，数组实际 6 个 + AI 横幅 = 7 =
 * PageHead 的 accent「七件」自洽。那句注释是陈旧的，不移植。
 */
import { hrefFor } from '../routes';
import type { V2Route } from '../routes';
import { references } from '../data';
import { PageHead, InkCard, Icon, Chip } from '../Primitives';

const TOOLS: Array<{
  route: V2Route; icon: string; color: string; deep: string;
  title: string; desc: string; tag: string | null;
}> = [
  {
    route: 'blood', icon: 'drop', color: 'var(--mint)', deep: 'var(--mint-deep)',
    title: '血检 HUD', desc: '输入血检数值，即时红绿灯判读 + 区间刻度', tag: '最常用',
  },
  {
    route: 'risk', icon: 'clipboard', color: 'var(--butter)', deep: 'var(--honey)',
    title: '风险自评', desc: '7 问 · 4 维度风险评分 (VTE / 肝 / 脑膜瘤 / 心血管)', tag: '用药前必做',
  },
  {
    route: 'inject', icon: 'pill', color: 'var(--sakura-pink)', deep: 'var(--sakura-pink-deep)',
    title: '注射计算器', desc: '剂量↔体积换算 + 血药浓度曲线模拟', tag: 'EV 注射',
  },
  {
    route: 'compare', icon: 'book', color: 'var(--sky)', deep: 'var(--sky-deep)',
    title: '药物对比', desc: '20 种药物多维度横向对比', tag: null,
  },
  {
    route: 'refs', icon: 'file', color: 'var(--lavender)', deep: 'var(--lavender-deep)',
    title: '文献库', desc: `${references.length} 条核心文献 · 按证据等级检索`, tag: null,
  },
  {
    route: 'hospitals', icon: 'pin', color: 'var(--coral)', deep: 'var(--coral-deep)',
    title: '找医院', desc: '全国跨性别友好医疗资源 · 社区验证', tag: null,
  },
];

export default function ToolsScreen() {
  return (
    <div className="yk-page">
      <PageHead
        tab="工具" kicker="TOOLS · 临床工具"
        tapeColor="var(--mint)" pattern="stripes"
        title="临床工具" accent="七件"
        lede="所有工具 100% 前端运行，零数据传输，不存储任何健康信息。输出仅供参考，不能替代医生判读。"
      />

      <div className="yk-grid yk-grid--3" style={{ marginTop: 32 }}>
        {TOOLS.map((t) => (
          <InkCard key={t.route} variant="paper" href={hrefFor(t.route)} style={{ padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 12 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                background: t.color, border: '2px solid var(--ink)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '2px 2px 0 var(--ink)',
              }}>
                <Icon name={t.icon} size={22} color="var(--ink)" />
              </div>
              {/* Chip 现在是「语义色边框 + 墨字」：t.deep 仍决定边框，文字自动转墨 */}
              {t.tag && <Chip color={t.deep}>{t.tag}</Chip>}
            </div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 21, margin: '0 0 6px', fontWeight: 700 }}>{t.title}</h3>
            <p style={{ fontSize: 13, color: 'var(--fg-2)', lineHeight: 1.6, margin: 0 }}>{t.desc}</p>
            {/* AA：原型 --sakura-pink-deep on ivory = 3.33 FAIL → 主题感知的 pink-text（纸面 5.39） */}
            <div style={{ marginTop: 14, color: 'var(--sakura-pink-text)', fontFamily: 'var(--font-ui-accent)', fontSize: 12, fontWeight: 700 }}>
              打开 →
            </div>
          </InkCard>
        ))}

        {/* AI 问答助手 · 整行横幅收尾。
            用 <button> 而非 <a>：它不是导航，是打开同页浮窗 → 语义上就该是按钮。 */}
        <button
          type="button"
          data-yk-open-chat
          className="yk-paper yk-inkcard yk-inkcard--lift yk-inkcard--clickable"
          data-paper="true"
          style={{
            background: 'var(--lavender)', color: 'var(--fg-1)',
            padding: 20, gridColumn: '1 / -1',
            textAlign: 'inherit', font: 'inherit',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: 'var(--ivory)', border: '2px solid var(--ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon name="sparkles" size={28} color="var(--ink)" /></div>
            <div style={{ flex: 1, minWidth: 220 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 21, margin: 0, fontWeight: 700, whiteSpace: 'nowrap' }}>AI 问答助手</h3>
                <Chip color="var(--lavender-deep)">BETA</Chip>
              </div>
              <p style={{ fontSize: 13, color: 'var(--fg-1)', lineHeight: 1.6, margin: '6px 0 0' }}>
                基于站内文献库回答一般性问题。对话不存储任何记录。
              </p>
            </div>
            {/* AA：原型 --grape #7A5FB5 on --lavender #D4C5F5 = 3.17 FAIL（13px 小字）
                → --ink = 7.93 PASS。紫色语义已由整卡的 lavender 底色承载。 */}
            <div className="yk-nowrap" style={{ color: 'var(--ink)', fontFamily: 'var(--font-ui-accent)', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
              开始对话 →
            </div>
          </div>
        </button>
      </div>

      <InkCard variant="cream" hoverLift={false} style={{ marginTop: 28, padding: '14px 20px', fontSize: 12, color: 'var(--fg-2)', lineHeight: 1.7 }}>
        {/* AA：pink-deep on cream 3.20 → 主题感知 pink-text 5.18 */}
        <strong style={{ color: 'var(--sakura-pink-text)' }}>声明 ·</strong> 本站不提供处方、不销售药物、不收集个人信息。工具输出仅供教育和参考用途，不构成医疗建议。
      </InkCard>
    </div>
  );
}
