/**
 * HomeScreen — 画卷手账首页
 * 移植自 design_files/ui_kits/yakuten/home-screen.jsx (242 行)
 * 层次：hero（画卷拼贴）→ 使命陈述（冷·数据）→ 三入口 → 药物速查 → 典籍目录
 *
 * 零 JS：原型此屏 useState/useEffect 计数为 0，唯一交互是 setRoute 导航。
 * → 全部改为 <a href>，Astro 构建期渲染，不加 client: 指令。
 *
 * 文案逐字照抄原型，一个字不改。
 */
import { Fragment } from 'react';
import { hrefFor } from '../routes';
import {
  WashiTape, Paperclip, MoonPhase, FoxTeacherMark, SpeechBubble,
  ClipButton, InkCard, Icon, Chip,
} from '../Primitives';

/* 三入口 —— 硬编码于原型 home-screen.jsx:148-152 */
const ENTRIES = [
  { color: 'var(--mint)', icon: 'clipboard', title: '还没开始用药', desc: '基线检查 · 禁忌症 · 风险自评', cta: '先做风险自评', route: 'risk', chip: 'PHASE 0' },
  { color: 'var(--sakura-pink)', icon: 'route', title: '已经在用药', desc: '路径图 · Phase 1–3 · 复查节奏', cta: '查看路径', route: 'pathway', chip: 'PHASE 1-3' },
  { color: 'var(--coral)', icon: 'alert', title: '身体出了问题', desc: '急症识别 · 停药信号 · 危机热线', cta: '急症识别', route: 'urgent', chip: 'URGENT' },
] as const;

/* 药物速查 —— 硬编码于原型 home-screen.jsx:186-189 */
const CODEX = [
  { zh: '雌激素', en: 'Estrogens', items: ['戊酸雌二醇', '贴片 (TTS)', '舌下含服', '凝胶', '注射 EV/EC'], color: 'var(--sakura-pink)' },
  { zh: '抗雄激素', en: 'Antiandrogens', items: ['醋酸环丙孕酮', '螺内酯', '比卡鲁胺', 'GnRH 激动剂'], color: 'var(--butter)' },
  { zh: '孕激素', en: 'Progestogens', items: ['微粒化黄体酮', 'Utrogestan'], color: 'var(--lavender)' },
  { zh: '禁用', en: 'Banned', items: ['炔雌醇 EE', '结合雌激素', '兽用激素', '自制药物'], color: 'var(--coral)', banned: true },
] as const;

/* 典籍目录 —— 硬编码于原型 home-screen.jsx:224-228 */
const TOC = [
  ['卷一', '幻月路径', '四阶段 · 决策节点', 'pathway'],
  ['卷二', '药物图鉴', '20 种 · 循证', 'drugs'],
  ['卷三', '文档', '44 页 × 4 语言', 'doc'],
  ['卷四', '临床工具', '7 件 · 零上传', 'tools'],
  ['卷五', '友好医院', '25 家 · 社区验证', 'hospitals'],
] as const;

const MOON_STEPS = [['基线', 0], ['起步', 0.4], ['调整', 0.72], ['维持', 1]] as const;

export default function HomeScreen() {
  return (
    <div style={{ position: 'relative', zIndex: 1 }}>
      {/* ============ HERO ============ */}
      <section style={{ padding: '56px var(--page-pad) 36px', maxWidth: 'var(--page-max)', margin: '0 auto', position: 'relative' }}>
        <div className="yk-hero-grid">
          <div>
            <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
              <WashiTape color="var(--sakura-pink)" pattern="dots" width={90} rotation={-4} />
              <WashiTape color="var(--mint)" pattern="stripes" width={70} rotation={3} />
              <WashiTape color="var(--butter)" pattern="solid" width={60} rotation={-2} />
            </div>
            {/* AA：原型 --sakura-pink-deep on cream = 3.20 FAIL（12px 小字需 4.5）→ pink-text 5.18 */}
            <div style={{ fontFamily: 'var(--font-ui-accent)', fontSize: 12, letterSpacing: '0.15em', color: 'var(--sakura-pink-text)', fontWeight: 700, marginBottom: 14, textWrap: 'balance' }}>
              Per iter ad se verum · 循证 · 减害 · 引导就医
            </div>
            <h1 style={{
              fontFamily: 'var(--font-display)', fontWeight: 400,
              fontSize: 'clamp(4rem, 9vw, 7.5rem)', lineHeight: 0.95,
              margin: 0, letterSpacing: '-0.02em',
            }}>
              <span style={{ color: 'var(--fg-1)' }}>HRT</span>
              <span className="text-gradient-flame">药典</span>
            </h1>
            {/* pink-deep 保留：24px 属 WCAG「大字」，只需 3:1，实测 3.20 PASS。
                设计的招牌标语，不动。 */}
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, color: 'var(--sakura-pink-deep)', letterSpacing: '0.15em', marginTop: 20 }}>
              愿此行，抵达真实的自己
            </div>
            <p style={{ maxWidth: 520, marginTop: 20, fontSize: 15, color: 'var(--fg-2)', lineHeight: 1.8 }}>
              面向跨性别女性的 HRT 安全底线信息站。基于 WPATH SOC 8 和同行评审文献。
              <strong style={{ color: 'var(--fg-1)' }}> 不是百科，不是论坛。是安全底线。</strong>
            </p>
            <div style={{ display: 'flex', gap: 14, marginTop: 32, flexWrap: 'wrap', alignItems: 'center' }}>
              <ClipButton variant="flame" href={hrefFor('drugs')}>
                进入药典 <Icon name="arrow" size={14} color="#fff" />
              </ClipButton>
              <ClipButton variant="ghost" href={hrefFor('blood')}>血检自查 →</ClipButton>
            </div>
            <div className="yk-hand-note" style={{ marginTop: 18, transform: 'rotate(-1deg)' }}>
              不急。先把基线检查做完，再谈别的。
            </div>
          </div>

          {/* 右侧 — 画卷拼贴：幻月周期 + 狐狸老师 */}
          <div className="yk-hero-collage" style={{ position: 'relative', minHeight: 430 }}>
            {/* 画卷纸 */}
            <div aria-hidden="true" style={{
              position: 'absolute', inset: '16px 8px',
              background: 'var(--ivory)',
              backgroundImage:
                'linear-gradient(rgba(74,40,56,0.08) 1px, transparent 1px),' +
                'linear-gradient(90deg, rgba(74,40,56,0.08) 1px, transparent 1px)',
              backgroundSize: '18px 18px',
              border: '2px solid var(--ink)',
              borderRadius: 'var(--radius-md)',
              boxShadow: '6px 6px 0 var(--ink)',
              transform: 'rotate(-1.5deg)',
            }} />
            {/* 胶带压角 */}
            <div style={{ position: 'absolute', top: 4, left: 60 }}>
              <WashiTape color="var(--mint)" pattern="stripes" width={110} rotation={-8} />
            </div>
            <div style={{ position: 'absolute', top: 12, right: 50 }}>
              <WashiTape color="var(--sakura-pink)" pattern="dots" width={80} rotation={12} />
            </div>
            <Paperclip size={34} color="var(--honey)" rotation={-28}
              style={{ position: 'absolute', top: 2, right: 150 }} />

            {/* 内容：幻月周期卡 */}
            <div style={{ position: 'absolute', top: 56, left: 44, right: 44 }}>
              {/* 原型是 <div onClick> —— 不可 Tab 聚焦、读屏不报为链接 → 改真 <a> */}
              <a
                className="yk-paper"
                data-paper="true"
                href={hrefFor('pathway')}
                aria-label="幻月路径 · 四阶段"
                style={{
                  display: 'block', textDecoration: 'none', color: 'inherit',
                  background: 'var(--cream)', border: '2px solid var(--ink)',
                  borderRadius: 12, padding: '14px 18px', cursor: 'pointer',
                  boxShadow: '3px 3px 0 var(--ink)', transform: 'rotate(0.6deg)',
                }}
              >
                <div className="yk-kicker" style={{ marginBottom: 10, fontSize: 10 }}>幻月路径 · 渐盈即渐稳</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
                  {MOON_STEPS.map(([label, fill], i) => (
                    /* key 必须在 map 直接返回的 Fragment 上，不能只放在内层 div */
                    <Fragment key={label}>
                      {i > 0 && <Icon name="arrow" size={13} color="var(--ink-faint)" />}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                        {/* 这 4 个月相是【示意图例】（基线→维持的渐盈隐喻），非当日月相，
                            固定 fill 值是设计意图，不违反「真实月相」红线 —— 那条约束
                            针对的是导航上的月相挂件。 */}
                        <MoonPhase fill={fill} size={34} color="var(--sakura-pink)" />
                        <span style={{ fontFamily: 'var(--font-ui-accent)', fontSize: 10, fontWeight: 700, color: 'var(--fg-2)', whiteSpace: 'nowrap' }}>{label}</span>
                      </div>
                    </Fragment>
                  ))}
                </div>
              </a>

              {/* 狐狸老师 + 提示气泡 */}
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, marginTop: 26, paddingLeft: 6 }}>
                <FoxTeacherMark size={88} />
                <SpeechBubble tone="paper" tail="bottom-left" style={{ marginBottom: 30, transform: 'rotate(-1deg)' }}>
                  <span style={{ fontSize: 13, display: 'block', whiteSpace: 'nowrap' }}>新手吗？<strong>先做基线血检</strong>，</span>
                  <span style={{ fontSize: 13, display: 'block', whiteSpace: 'nowrap' }}>再谈别的 ✿</span>
                </SpeechBubble>
              </div>
            </div>

            {/* 便签 */}
            <div className="yk-paper" data-paper="true" style={{
              position: 'absolute', bottom: 38, right: 28,
              background: 'var(--butter)',
              border: '2px solid var(--ink)', borderRadius: 6,
              padding: '10px 14px',
              boxShadow: '3px 3px 0 var(--ink)',
              transform: 'rotate(5deg)',
              fontFamily: 'var(--font-hand)', fontSize: 16, lineHeight: 1.5, color: 'var(--fg-1)', whiteSpace: 'nowrap',
            }}>
              ♡ 今日也要<br />好好生活
            </div>
          </div>
        </div>
      </section>

      {/* ============ 使命陈述 — 冷·数据 ============ */}
      <section style={{ padding: '8px var(--page-pad) 24px', maxWidth: 'var(--page-max)', margin: '0 auto' }}>
        <div style={{
          background: 'var(--ink)', border: '2px solid var(--ink)', borderRadius: 12,
          padding: 'clamp(20px, 3vw, 30px)',
          display: 'flex', alignItems: 'center', gap: 'clamp(18px, 3vw, 36px)', flexWrap: 'wrap',
        }}>
          <div style={{ fontFamily: 'var(--font-hud)', fontSize: 'clamp(44px, 6vw, 64px)', fontWeight: 700, color: 'var(--sakura-pink)', lineHeight: 1, flexShrink: 0 }}>
            84<span style={{ fontSize: '0.5em' }}>%</span>
          </div>
          <div style={{ flex: 1, minWidth: 260 }}>
            <div style={{ fontSize: 15, color: '#fff', fontWeight: 700, lineHeight: 1.6, marginBottom: 4 }}>
              在中国，超过 84% 的跨性别激素使用者没有任何医疗指导。
            </div>
            <div style={{ fontSize: 13, color: 'var(--sakura-blush)', lineHeight: 1.7 }}>
              本站的存在不是为了替代医生，而是在你找到医生之前，给你一条安全的底线。
              {/* AA：原型 --fg-3 #B08D9E on 墨底 = 4.33，差 0.17 不达标。
                  换 --lavender = 7.93 PASS，且仍比上一行的 blush(9.53) 弱一档，
                  视觉层次不丢。 */}
              <span style={{ fontFamily: 'var(--font-hud)', fontSize: 11, color: 'var(--lavender)', marginLeft: 8, whiteSpace: 'nowrap' }}>2021 全国调查 · N=4296</span>
            </div>
          </div>
          <a href={hrefFor('hospitals')} className="btn-ghost" style={{ minHeight: 44, padding: '10px 22px', fontSize: 13, flexShrink: 0, display: 'inline-flex', alignItems: 'center' }}>
            找友好医生 →
          </a>
        </div>
      </section>

      {/* ============ 三入口 ============ */}
      <section style={{ padding: '24px var(--page-pad)', maxWidth: 'var(--page-max)', margin: '0 auto' }}>
        <div className="yk-kicker" style={{ marginBottom: 10 }}>ENTRY · 从这里开始</div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 32, margin: '0 0 28px' }}>你现在在哪一步？</h2>
        <div className="yk-grid yk-grid--3">
          {ENTRIES.map((c, i) => (
            <div key={c.title} style={{ position: 'relative', paddingTop: 18, transform: `rotate(${[-0.6, 0.4, -0.3][i]}deg)` }}>
              <div style={{ position: 'absolute', top: 0, left: 30, zIndex: 2 }}>
                <WashiTape color={c.color} pattern={i === 0 ? 'dots' : i === 1 ? 'stripes' : 'solid'} width={100} rotation={-4 + i * 3} />
              </div>
              <InkCard variant={i === 1 ? 'pink' : 'paper'} href={hrefFor(c.route)} style={{ paddingTop: 28 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 12,
                    background: c.color, border: '2px solid var(--ink)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '2px 2px 0 var(--ink)',
                  }}>
                    <Icon name={c.icon} size={22} color="var(--ink)" />
                  </div>
                  <Chip color="var(--ink)">{c.chip}</Chip>
                </div>
                <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 22, margin: '0 0 6px' }}>{c.title}</h3>
                <div style={{ fontSize: 13, color: 'var(--fg-2)', lineHeight: 1.6, marginBottom: 20 }}>{c.desc}</div>
                {/* AA：原型 pink-deep on ivory/blush = 3.33 FAIL（12px 700）→ pink-text 5.39 */}
                <div style={{ color: 'var(--sakura-pink-text)', fontFamily: 'var(--font-ui-accent)', fontSize: 12, fontWeight: 700, letterSpacing: '0.05em' }}>{c.cta} →</div>
              </InkCard>
            </div>
          ))}
        </div>
      </section>

      {/* ============ 药物速查 ============ */}
      <section style={{ padding: '40px var(--page-pad) 32px', maxWidth: 'var(--page-max)', margin: '0 auto' }}>
        <div className="yk-kicker" style={{ marginBottom: 10 }}>CODEX · 药物速查</div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 32, margin: '0 0 28px' }}>20 种药物 · 按分类索引</h2>
        <div className="yk-grid yk-grid--4" style={{ gap: 20 }}>
          {CODEX.map((c) => (
            <InkCard key={c.zh} variant="paper" href={hrefFor('drugs')} style={{ padding: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10, gap: 8 }}>
                <div style={{
                  padding: '4px 10px', background: c.color,
                  border: '2px solid var(--ink)', borderRadius: 8,
                  fontFamily: 'var(--font-ui-accent)', fontSize: 10,
                  letterSpacing: '0.1em', fontWeight: 700, color: 'var(--ink)',
                  whiteSpace: 'nowrap',
                }}>{c.en.toUpperCase()}</div>
                {'banned' in c && c.banned
                  ? <span style={{ color: 'var(--danger)', fontSize: 18 }} aria-label="禁用">✕</span>
                  /* AA：原型 --fg-3 on ivory = 2.82 FAIL → --fg-2 = 6.07 PASS */
                  : <span style={{ fontFamily: 'var(--font-hud)', fontSize: 11, fontWeight: 700, color: 'var(--fg-2)', whiteSpace: 'nowrap' }}>{c.items.length} 种途径</span>}
              </div>
              <h4 style={{ fontFamily: 'var(--font-display)', fontSize: 22, margin: '4px 0 14px', fontWeight: 700 }}>{c.zh}</h4>
              {c.items.map((it) => (
                <div key={it} style={{
                  fontSize: 12, color: 'var(--fg-2)', padding: '6px 0',
                  borderBottom: '1px dashed var(--ink-faint)',
                  fontFamily: 'var(--font-body)',
                }}>{it}</div>
              ))}
            </InkCard>
          ))}
        </div>
      </section>

      {/* ============ 典籍目录 ============ */}
      <section style={{ padding: '8px var(--page-pad) 48px', maxWidth: 'var(--page-max)', margin: '0 auto' }}>
        <InkCard variant="cream" hoverLift={false} style={{ padding: '22px 28px', maxWidth: 760 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 16, marginBottom: 8 }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 22 }}>目錄</span>
            <span className="yk-hand-note" style={{ fontSize: 15 }}>一部安全底线的典籍，共五卷。</span>
          </div>
          {TOC.map(([vol, title, meta, route]) => (
            /* 原型是 <button onClick> —— 语义应为链接 */
            <a key={vol} className="yk-toc-row" href={hrefFor(route)}>
              <span className="yk-toc-row__vol">{vol}</span>
              <span className="yk-toc-row__title">{title}</span>
              <span className="yk-toc-row__leader" aria-hidden="true"></span>
              <span className="yk-toc-row__meta">{meta}</span>
            </a>
          ))}
        </InkCard>
      </section>
    </div>
  );
}
