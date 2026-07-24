import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { getLocale, AI_COPY } from './aiChatL10n';
import { containsCrisisKeyword, getCrisisHotlines } from './crisisSupport';
import type { CrisisHotline } from './crisisSupport';
import { useChatSessions } from './useChatSessions';
import type { StoredMessage } from '../../utils/ai-chat/storage';
import ChatSessionSidebar from './ChatSessionSidebar';
import { renderMarkdown, renderMarkdownStreaming, ensureRichMarkdown, isRichReady, setCopyLabel } from './aiMarkdown';

/* =========================================================================
   AIAssistant — 产品级 AI 对话（claude.ai / chatgpt 式全屏窗口 + 手机适配）
   ------------------------------------------------------------------------
   · 端点契约零改动：POST /api/ai-chat {messages}，流式纯文本。
   · 隐私红线：会话仅在用户 opt-in 后存本机 localStorage（useChatSessions），
     默认零存储；apiContent（页面上下文前缀）绝不落盘。
   · 保留：流式 + 指数退避重试、危机词本地拦截热线卡、页面上下文注入、
     站内链接卡、17 语、双主题、完整 a11y。
   · 新增（产品级）：多会话侧栏、复制 / 重新生成 / 编辑重发、停止生成、
     自增长输入、自动滚动 + 回到底部、模型徽章、限流倒计时、离线条、
     富 Markdown（表格 / 代码块 / 嵌套列表，marked+DOMPurify）。
   · page 模式（!compact）= 全屏两栏；compact 模式 = FAB 单栏 + 抽屉历史。
   ========================================================================= */

let pageContextOptOut = false;

import { AIChatIcon } from './AIChatIcon';
export { AIChatIcon };

/** 清洗 document.title：去站名后缀；专用工具页 / 异常标题返回 null。 */
function getPageTitle(): string | null {
  if (typeof document === 'undefined' || typeof window === 'undefined') return null;
  if (window.location.pathname.includes('/tools/ai-assistant')) return null;
  let t = (document.title || '').split('|')[0];
  t = t.replace(/\s*[-–—·]\s*HRT药典\s*$/, '').trim();
  if (!t || t === 'HRT药典' || t.length > 120) return null;
  return t;
}

const MAX_CONTENT_BYTES = 4096; // 端点单条上限
const MAX_SENT_MESSAGES = 10; // 端点只用最近 10 条
const byteLen = (s: string) => new TextEncoder().encode(s).length;

/** dialog 内 Tab 循环（focus trap）：挂在弹层容器的 onKeyDown。 */
function trapTab(e: React.KeyboardEvent<HTMLElement>) {
  if (e.key !== 'Tab') return;
  const els = e.currentTarget.querySelectorAll<HTMLElement>(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
  );
  if (!els.length) return;
  const first = els[0];
  const last = els[els.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
}

interface AIAssistantProps {
  compact?: boolean;
  onClose?: () => void;
}

/** 替换 messages 末尾 assistant 的内容（流式增量用）。 */
function replaceLastAssistant(prev: StoredMessage[], content: string): StoredMessage[] {
  const u = [...prev];
  const last = u[u.length - 1];
  if (last && last.role === 'assistant') u[u.length - 1] = { role: 'assistant', content };
  return u;
}

const BASE_CSS = `
@keyframes ai-dot-bounce { 0%,80%,100%{transform:translateY(0);opacity:.4} 40%{transform:translateY(-4px);opacity:1} }
@keyframes ai-msg-in { from{opacity:0; transform:translateY(8px);} to{opacity:1; transform:none;} }
@keyframes ai-caret { 0%,100%{opacity:1} 50%{opacity:0} }
@keyframes ai-hero-in { from{opacity:0; transform:translateY(16px);} to{opacity:1; transform:none;} }
.yk-ai {
  display:flex; flex-direction:column; block-size:100%; overflow:hidden; margin:0;
  /* 弹簧缓动 —— ChatGPT 生产实测 linear() 曲线（微交互/常规/回弹三档） */
  --spring-fast: linear(0, .07956 4.02%, .47488 13.851%, .79653 25.733%, .9246 36.734%, .98361 52.535%, .99988);
  --spring-common: linear(0, .08322 5.391%, .46561 17.652%, .76663 31.093%, .92965 47.845%, .99189 74.867%, .9991);
  --spring-bounce: linear(0, .10318 4.799%, .43592 14.679%, .84264 27.782%, 1.02066 38.732%, 1.04598 46.128%, 1.02446 58.294%, .99913 76.919%, 1);
}
/* 中和 Starlight prose 给 .sl-markdown-content 内所有块级元素注入的 margin-top —
   它会逐层撑破全屏布局。消息体/侧栏的显式 margin 由更高（或后载同级）优先级规则恢复。 */
.yk-ai * { margin: 0; }
/* 深空舞台：暗色渐变 + 两团极弱的绯/金光晕（二相乐园氛围层） */
.yk-ai--page {
  background:
    radial-gradient(ellipse 720px 420px at 82% -8%, var(--color-primary-alpha-08, rgba(200,75,124,.08)), transparent 62%),
    radial-gradient(ellipse 560px 380px at 8% 108%, var(--color-accent-alpha-08, rgba(212,168,83,.06)), transparent 60%),
    linear-gradient(180deg, #14111d 0%, #191521 100%);
}
/* 亮色主题（非 sakura）：token 化背景，避免暗底深字对比崩坏 */
[data-theme='light'] .yk-ai--page { background: var(--color-bg, #FAF7F2); }
[data-theme='light'] .yk-ai--compact { background: var(--color-bg-container, #FFFFFF); }
.yk-ai--compact { background: var(--color-bg-container, #1a1625); }
.yk-ai-shell { display:flex; flex:1; min-block-size:0; position:relative; overflow:hidden; }
.yk-ai-srstatus { position:absolute; inline-size:1px; block-size:1px; padding:0; margin:-1px; overflow:hidden; clip:rect(0 0 0 0); white-space:nowrap; border:0; }
.yk-ai-main { flex:1; min-inline-size:0; display:flex; flex-direction:column; block-size:100%; overflow:hidden; }

/* topbar —— 极简：侧栏开关 · 会话名 · 模型徽章；底缘金线渐隐（欢迎态无线，沉浸） */
.yk-ai-topbar { position:relative; display:flex; align-items:center; gap:4px; padding:0 10px; block-size:48px; flex-shrink:0; }
.yk-ai-topbar::after { content:''; position:absolute; inset-inline:0; inset-block-end:0; block-size:1px;
  background: linear-gradient(90deg, transparent, var(--color-accent-alpha-30, rgba(212,168,83,.28)) 18%, var(--color-outline-20) 55%, transparent); }
.yk-ai-topbar--hero::after { content:none; }
.yk-ai--compact .yk-ai-topbar { block-size:44px; padding:0 6px; }
.yk-ai-iconbtn { background:none; border:none; color: var(--color-text-secondary); cursor:pointer; min-inline-size:44px; min-block-size:44px; display:inline-flex; align-items:center; justify-content:center; padding:6px; transition: color var(--transition-fast), background var(--transition-fast); border-radius:10px; }
a.yk-ai-iconbtn { text-decoration:none; }
@media (hover:hover){ .yk-ai-iconbtn:hover{ color: var(--color-text-primary); background: var(--color-white-alpha-03);} }
.yk-ai-iconbtn:focus-visible{ outline:2px solid var(--color-accent); outline-offset:1px; }
.yk-ai-topbar__title { flex:1; min-inline-size:0; font-family: var(--font-display); font-size:.875rem; font-weight:600; color: var(--color-text-secondary); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; padding-inline:6px; letter-spacing:.01em; }
.yk-ai-topbar__model { font-size:.6875rem; color: var(--color-accent); font-family: var(--font-mono); letter-spacing:.04em; white-space:nowrap; max-inline-size:200px; overflow:hidden; text-overflow:ellipsis;
  background: var(--color-accent-alpha-08, rgba(212,168,83,.1)); border:1px solid var(--color-accent-alpha-30, rgba(212,168,83,.25)); padding:2px 9px; border-radius:999px; }

.yk-ai-logwrap { flex:1; min-block-size:0; position:relative; display:flex; flex-direction:column; }
.yk-ai-log { flex:1; overflow-y:auto; overflow-x:hidden; padding:32px var(--space-lg); display:flex; flex-direction:column; scroll-behavior:smooth; scrollbar-width:thin; scrollbar-color: var(--color-white-alpha-08, rgba(255,255,255,.08)) transparent; }
.yk-ai-log::-webkit-scrollbar { inline-size:8px; }
.yk-ai-log::-webkit-scrollbar-thumb { background: var(--color-white-alpha-08, rgba(255,255,255,.08)); border-radius:8px; }
.yk-ai-log::-webkit-scrollbar-track { background: transparent; }
.yk-ai--compact .yk-ai-log { padding:16px 12px; }
/* 问答节奏：同一轮内紧凑（12px），轮与轮之间拉开（12+24=36px） */
.yk-ai-log__inner { inline-size:100%; max-inline-size:48rem; margin-inline:auto; display:flex; flex-direction:column; gap:12px; }
.yk-ai-log__inner > .yk-ai-turn:has(.yk-ai-msg--user):not(:first-child) { margin-block-start:24px; }
.yk-ai--compact .yk-ai-log__inner { gap:10px; }
.yk-ai--compact .yk-ai-log__inner > .yk-ai-turn:has(.yk-ai-msg--user):not(:first-child) { margin-block-start:14px; }

/* ============ 状态 A · 欢迎态「居中舞台」 ============ */
.yk-ai-hero { flex:1; min-block-size:0; overflow-y:auto; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; padding:28px var(--space-lg); animation: ai-hero-in .45s var(--spring-common, ease) both; }
.yk-ai--compact .yk-ai-hero { padding:18px 14px; }
.yk-ai-hero__badge { inline-size:62px; block-size:62px; border-radius:20px; display:flex; align-items:center; justify-content:center; color: var(--color-accent); flex-shrink:0;
  background: linear-gradient(135deg, var(--color-primary-alpha-15, rgba(200,75,124,.18)), var(--color-accent-alpha-08, rgba(212,168,83,.12)));
  border:1px solid var(--color-accent-alpha-30, rgba(212,168,83,.25));
  box-shadow: 0 8px 24px rgba(0,0,0,.25); }
.yk-ai--compact .yk-ai-hero__badge { inline-size:50px; block-size:50px; border-radius:16px; }
.yk-ai-hero__greeting { font-family: var(--font-display); font-size:1.7rem; font-weight:700; color: var(--color-text-primary); letter-spacing:.02em; line-height:1.35; margin-block-start:18px; text-wrap:balance; }
.yk-ai--compact .yk-ai-hero__greeting { font-size:1.15rem; margin-block-start:12px; }
.yk-ai-hero__sub { font-family: var(--font-body); font-size:.9rem; line-height:1.7; max-inline-size:36rem; color: var(--color-text-secondary); margin-block-start:8px; text-wrap:balance; }
.yk-ai--compact .yk-ai-hero__sub { font-size:.8125rem; }
.yk-ai-hero__composer { inline-size:100%; max-inline-size:48rem; margin-block-start:28px; }
.yk-ai--compact .yk-ai-hero__composer { margin-block-start:16px; }
.yk-ai-pills { display:flex; flex-wrap:wrap; justify-content:center; gap:8px; max-inline-size:46rem; margin-block-start:18px; }
.yk-ai-pill { display:inline-flex; align-items:center; gap:7px; background: var(--color-white-alpha-03, rgba(255,255,255,.03)); border:1px solid var(--color-outline-20); color: var(--color-text-secondary); padding:8px 16px; font-size:.8125rem; font-family: var(--font-body); line-height:1.4; cursor:pointer; border-radius:999px; transition: border-color var(--transition-fast), color var(--transition-fast), background var(--transition-fast), transform .25s var(--spring-fast, ease); }
.yk-ai-pill::before { content:'✦'; color: var(--color-accent); opacity:.5; font-size:.6875rem; transition: opacity var(--transition-fast); }
@media (hover:hover){ .yk-ai-pill:hover{ border-color: var(--color-primary); color: var(--color-text-primary); background: var(--color-primary-alpha-08, rgba(200,75,124,.07)); transform: translateY(-1px); } .yk-ai-pill:hover::before{ opacity:1; } }
.yk-ai-pill:focus-visible { outline:2px solid var(--color-accent); outline-offset:2px; }

/* ============ 消息 —— 用户=绯色渐变胶囊；AI=无框直排 + 金瓣标识 ============ */
.yk-ai-turn { display:flex; flex-direction:column; gap:8px; animation: ai-msg-in .3s var(--spring-common, ease) both; }
.yk-ai-msg { font-family: var(--font-body); font-size:.96875rem; color: var(--color-text-primary); }
.yk-ai--compact .yk-ai-msg { font-size:.875rem; }
/* 四角对称卡（缺角气泡是 IM 社交软件语言，三家 AI 产品均为对称 rounded） */
.yk-ai-msg--user { align-self:flex-end; max-inline-size:76%; inline-size:fit-content; padding:12px 18px; line-height:1.65; white-space:pre-wrap;
  background: linear-gradient(135deg, var(--color-primary-alpha-15, rgba(200,75,124,.18)), var(--color-primary-alpha-08, rgba(200,75,124,.08)));
  border:1px solid var(--color-primary-alpha-30, rgba(200,75,124,.32));
  border-radius:16px; box-shadow: 0 2px 12px rgba(0,0,0,.12); }
[data-theme='light'] .yk-ai-msg--user { border-color: var(--color-primary-alpha-40, rgba(200,75,124,.42)); }
.yk-ai-msg--ai { align-self:stretch; max-inline-size:100%; padding:0; line-height:1.8; background:none; border:none; }
/* AI 标识降噪：灰字 12px + 仅图标留金（回复本体才是主角） */
.yk-ai-msg__label { display:flex; align-items:center; gap:7px; font-size:.75rem; color: var(--color-text-muted); font-family: var(--font-body); letter-spacing:.02em; margin-block-end:8px; }
.yk-ai-msg__label svg { color: var(--color-accent); }
/* 流式光标 —— 仅 streaming 中的 AI 消息尾部 */
.yk-ai-msg--streaming > div:last-child::after { content:'▍'; color: var(--color-accent); animation: ai-caret 1s step-end infinite; margin-inline-start:2px; }

/* 操作条常显（Claude/Gemini 路线：移动端无 hover，复制/重答是高频动作） */
.yk-ai-actions { display:flex; gap:2px; align-self:flex-start; margin-block-start:-2px; }
.yk-ai-actions--user { align-self:flex-end; }
.yk-ai-actbtn { background:none; border:none; color: var(--color-text-muted); cursor:pointer; min-inline-size:38px; min-block-size:38px; display:inline-flex; align-items:center; gap:4px; padding:4px 8px; font-size:.75rem; font-family: var(--font-body); transition: color var(--transition-fast); border-radius:8px; }
@media (hover:hover){ .yk-ai-actbtn:hover{ color: var(--color-primary-light);} }
.yk-ai-actbtn:focus-visible{ outline:2px solid var(--color-accent); outline-offset:1px; }

.yk-ai-edit { display:flex; flex-direction:column; gap:6px; align-self:flex-end; inline-size:min(560px, 92%); }
.yk-ai-edit__area { inline-size:100%; min-block-size:64px; padding:10px 12px; background: var(--color-bg-container); color: var(--color-text-primary); border:1px solid var(--color-primary); font-family: var(--font-body); font-size:.9rem; line-height:1.6; resize:vertical; border-radius:12px; outline:none; }
.yk-ai-edit__row { display:flex; gap:8px; justify-content:flex-end; }

/* rich markdown blocks */
.yk-ai-msg .yk-ai-h { display:block; margin-top:.75em; font-weight:700; }
.yk-ai-msg h1 { font-family: var(--font-display); font-size:1.35em; font-weight:700; margin:1em 0 .4em; color: var(--color-text-primary); border-block-end:1px solid var(--color-outline-20); padding-block-end:4px; }
.yk-ai-msg h2 { font-family: var(--font-display); font-size:1.2em; font-weight:700; margin:.85em 0 .35em; color: var(--color-text-primary); }
.yk-ai-msg h3,.yk-ai-msg h4 { font-family: var(--font-display); font-size:1.05em; font-weight:600; margin:.7em 0 .25em; color: var(--color-accent); }
.yk-ai-msg ul,.yk-ai-msg ol { margin:.45em 0; padding-inline-start:1.4em; display:flex; flex-direction:column; gap:4px; }
.yk-ai-msg li { list-style:revert; }
.yk-ai-msg li::marker { color: var(--color-accent); }
.yk-ai-li { margin-inline-start:1.2em; }
.yk-ai-li--ul { list-style:disc; } .yk-ai-li--ol { list-style:decimal; }
.yk-ai-msg p { margin:.45em 0; }
.yk-ai-msg--ai > div > p:first-child { margin-block-start:0; }
.yk-ai-msg blockquote { margin:.55em 0; padding-inline-start:12px; border-inline-start:2px solid var(--color-accent-alpha-30, rgba(212,168,83,.3)); color: var(--color-text-secondary); }
.yk-ai-hr { border:none; border-top:1px solid var(--color-outline-20); margin:.8em 0; }
.yk-ai-code, .yk-ai-msg code { background: var(--color-white-alpha-08); padding:.12em .35em; font-size:.85em; font-family: var(--font-code); border-radius:4px; }
.yk-ai-prewrap { position:relative; margin:.6em 0; }
.yk-ai-msg pre { background: rgba(12,10,18,.7); border:1px solid var(--color-outline-20); padding:12px 14px; overflow-x:auto; font-size:.82em; border-radius:10px; box-shadow: inset 0 1px 3px rgba(0,0,0,.3); }
[data-theme='light'] .yk-ai-msg pre { background: rgba(74,40,56,.05); box-shadow:none; }
.yk-ai-msg pre code { background:none; padding:0; font-size:1em; }
.yk-ai-copybtn { position:absolute; inset-block-start:7px; inset-inline-end:7px; background: var(--color-bg-container); border:1px solid var(--color-outline-20); color: var(--color-text-muted); cursor:pointer; inline-size:32px; block-size:32px; display:inline-flex; align-items:center; justify-content:center; border-radius:8px; transition: color var(--transition-fast), border-color var(--transition-fast); }
@media (hover:hover){ .yk-ai-copybtn:hover{ color: var(--color-primary-light); border-color: var(--color-primary);} }
.yk-ai-copybtn--done { color: var(--color-safe); }
.yk-ai-tablewrap { overflow-x:auto; margin:.6em 0; border:1px solid var(--color-outline-20); border-radius:10px; box-shadow: 0 2px 10px rgba(0,0,0,.2); }
[data-theme='light'] .yk-ai-tablewrap { box-shadow: 0 2px 10px rgba(74,40,56,.08); }
.yk-ai-table { border-collapse:collapse; font-size:.85em; min-inline-size:100%; }
.yk-ai-table th,.yk-ai-table td { border-block-end:1px solid var(--color-outline-20); padding:8px 12px; text-align:start; white-space:nowrap; }
.yk-ai-table tr:last-child td { border-block-end:none; }
.yk-ai-table th { background: var(--color-white-alpha-03); font-weight:700; color: var(--color-accent); font-family: var(--font-body); }

/* in-site link card + ext link */
.yk-ai-msg a.yk-ai-linkcard { display:flex; align-items:center; gap:8px; margin-block:6px; padding:8px 10px; background: var(--color-bg-container, #1a1625); border:1px solid var(--color-outline-20); border-inline-start:3px solid var(--color-accent); color: var(--color-text-primary); text-decoration:none; font-size:.8125rem; transition: border-color var(--transition-fast); }
@media (hover:hover){ .yk-ai-msg a.yk-ai-linkcard:hover{ border-color: var(--color-primary);} }
.yk-ai-msg a.yk-ai-linkcard:focus-visible{ outline:2px solid var(--color-accent); outline-offset:2px; }
.yk-ai-linkcard__icon{ display:inline-flex; color: var(--color-accent); flex-shrink:0; }
.yk-ai-linkcard__label{ flex:1; min-inline-size:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.yk-ai-linkcard__arrow{ flex-shrink:0; color: var(--color-text-muted); }
[dir="rtl"] .yk-ai-linkcard__arrow{ transform:scaleX(-1); display:inline-block; }
.yk-ai-msg a.yk-ai-extlink{ color: var(--color-primary-light); text-decoration:underline; text-underline-offset:2px; }

/* crisis card */
.yk-ai-crisis { background: var(--color-danger-dark, #D32F2F); border:1px solid var(--color-danger); color:#fff; padding:10px 12px; font-family: var(--font-body); display:flex; flex-direction:column; gap:6px; align-self:stretch; }
.yk-ai-crisis__title{ font-weight:700; font-size:.8125rem; color:#fff; margin:0; }
.yk-ai-crisis__body{ margin:0; font-size:.75rem; line-height:1.5; color:#fff; }
.yk-ai-crisis__list{ display:flex; flex-direction:column; gap:4px; }
.yk-ai-crisis__line{ display:flex; align-items:center; justify-content:space-between; gap:8px; min-block-size:44px; padding:2px 8px; border:1px solid rgba(255,255,255,.55); color:#fff; text-decoration:underline; text-underline-offset:2px; }
.yk-ai-crisis__line:focus-visible{ outline:3px solid #fff; outline-offset:2px; }
.yk-ai-crisis__name{ font-size:.75rem; line-height:1.4; }
.yk-ai-crisis__num{ font-family: var(--font-mono, monospace); font-weight:700; font-size:.875rem; white-space:nowrap; }
.yk-ai-crisis__note{ margin:0; font-size:.6875rem; line-height:1.5; color:#fff; }

.yk-ai-thinking { display:flex; align-items:center; gap:9px; align-self:flex-start; padding:4px 0; font-size:.78rem; color: var(--color-accent); font-family: var(--font-body); opacity:.9; }
.yk-ai-dots{ display:inline-flex; gap:4px; }
.yk-ai-dot{ inline-size:5px; block-size:5px; border-radius:50%; background: var(--color-accent); animation: ai-dot-bounce 1s ease infinite; }
.yk-ai-dot:nth-child(2){ animation-delay:.15s; } .yk-ai-dot:nth-child(3){ animation-delay:.3s; }

.yk-ai-scrollbtn { position:absolute; inset-block-end:14px; inset-inline-end:18px; inline-size:38px; block-size:38px; border-radius:50%; background: var(--color-bg-container); border:1px solid var(--color-outline-20); color: var(--color-text-secondary); cursor:pointer; display:inline-flex; align-items:center; justify-content:center; box-shadow:0 4px 18px var(--color-black-alpha-40, rgba(0,0,0,.4)); z-index:5; transition: color var(--transition-fast), border-color var(--transition-fast), transform var(--transition-fast); }
@media (hover:hover){ .yk-ai-scrollbtn:hover{ color: var(--color-primary-light); border-color: var(--color-primary); transform: translateY(-1px);} }

.yk-ai-banner { padding:6px 14px; font-size:.6875rem; line-height:1.4; font-family: var(--font-body); flex-shrink:0; display:flex; align-items:center; gap:8px; }
.yk-ai-banner--offline { background: var(--color-caution-alpha-08); color: var(--color-caution); border-block-start:1px solid var(--color-outline-20); }
.yk-ai-error { background: var(--color-danger-alpha-10); border-inline-start:3px solid var(--color-danger); padding:8px 12px; color: var(--color-danger); font-size:.78rem; font-family: var(--font-body); border-radius:0 8px 8px 0; }

.yk-ai-ctx { display:flex; align-items:center; gap:8px; padding-block:2px; padding-inline:6px; font-size:.6875rem; color: var(--color-text-muted); font-family: var(--font-body); flex-shrink:0; max-inline-size:48rem; margin-inline:auto; inline-size:100%; }
.yk-ai-ctx__text{ flex:1; min-inline-size:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; text-align:start; }
.yk-ai-ctx__close{ background:none; border:none; color: var(--color-text-secondary); cursor:pointer; min-inline-size:36px; min-block-size:36px; padding:0; display:inline-flex; align-items:center; justify-content:center; transition: color var(--transition-fast); }
@media (hover:hover){ .yk-ai-ctx__close:hover{ color: var(--color-primary-light);} }

/* ============ composer 浮岛（两种状态共用）+ dock + 免责常驻行 ============ */
.yk-ai-dock { flex-shrink:0; padding:8px var(--space-lg) 0; }
.yk-ai--compact .yk-ai-dock { padding:6px 10px 0; }
.yk-ai-composer { inline-size:100%; max-inline-size:48rem; margin-inline:auto; display:flex; gap:10px; align-items:flex-end;
  background: var(--color-bg-container, #211E28);
  border:1px solid var(--color-outline-20);
  border-radius:28px; padding:13px 12px 13px 20px; min-block-size:56px;
  box-shadow: 0 12px 36px rgba(0,0,0,.42), inset 0 1px 0 rgba(255,255,255,.08);
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast); }
.yk-ai--compact .yk-ai-composer { border-radius:20px; padding:9px 9px 9px 14px; min-block-size:46px; }
.yk-ai-composer:focus-within { border-color: var(--color-primary-alpha-40, rgba(200,75,124,.5));
  box-shadow: 0 12px 36px rgba(0,0,0,.42), 0 0 0 3px var(--color-primary-alpha-08, rgba(200,75,124,.12)), inset 0 1px 0 rgba(255,255,255,.12); }
[data-theme='light'] .yk-ai-composer { box-shadow: 0 12px 36px rgba(74,40,56,.14); }
/* 16px 锁死：<16px 的输入框在 iOS Safari 聚焦时会强制放大 viewport（横向乱晃） */
.yk-ai-input { flex:1; min-inline-size:0; min-block-size:26px; max-block-size:200px; padding:6px 0; background:transparent; color: var(--color-text-primary); border:none; font-family: var(--font-body); font-size:1rem; outline:none; border-radius:0; resize:none; line-height:1.6; }
.yk-ai--compact .yk-ai-input { font-size:1rem; }
.yk-ai-input::placeholder { color: var(--color-text-muted); }
.yk-ai-send { inline-size:38px; min-inline-size:38px; block-size:38px; padding:0; display:inline-flex; align-items:center; justify-content:center; align-self:flex-end;
  background: linear-gradient(135deg, var(--color-primary), var(--color-primary-dark, #A03A63));
  color:#fff; border:1px solid transparent; cursor:pointer; border-radius:50%;
  transition: background var(--transition-fast), color var(--transition-fast), border-color var(--transition-fast), transform .25s var(--spring-fast, ease), box-shadow var(--transition-fast);
  box-shadow: 0 2px 12px var(--color-primary-alpha-40, rgba(200,75,124,.35)); }
.yk-ai--compact .yk-ai-send { inline-size:32px; min-inline-size:32px; block-size:32px; }
@media (hover:hover){ .yk-ai-send:not(:disabled):hover{ transform: translateY(-1px); box-shadow: 0 4px 16px var(--color-primary-alpha-60, rgba(200,75,124,.5));} }
.yk-ai-send--stop { background: var(--color-danger, #D32F2F); box-shadow: 0 2px 12px var(--color-danger-alpha-10, rgba(211,47,47,.3)); }
/* 空输入 = 幽灵态；键入后渐变亮起（Gemini「有内容才亮」的稳定版，无宽度跳动） */
.yk-ai-send:disabled { background:transparent; border-color: var(--color-outline-20); color: var(--color-text-muted); cursor:not-allowed; box-shadow:none; }
.yk-ai-send:focus-visible { outline:2px solid var(--color-accent); outline-offset:2px; }
.yk-ai-charhint { font-size:.625rem; color: var(--color-text-muted); font-family: var(--font-mono); text-align:end; margin-block-start:4px; max-inline-size:48rem; margin-inline:auto; }
.yk-ai-charhint--over { color: var(--color-danger); }

/* 「使用须知」弹层 */
.yk-ai-about { position:absolute; inset:0; z-index:30; display:flex; align-items:center; justify-content:center; padding:20px; }
.yk-ai-about__overlay { position:absolute; inset:0; background: var(--color-black-alpha-50, rgba(0,0,0,.5)); }
.yk-ai-about__card { position:relative; inline-size:100%; max-inline-size:34rem; max-block-size:82%; overflow-y:auto; background: var(--color-bg-container, #211E28); border:1px solid var(--color-outline-20); border-radius:16px; padding:18px 22px 20px; box-shadow: 0 20px 60px rgba(0,0,0,.5); animation: ai-msg-in .32s var(--spring-bounce, ease) both; }
.yk-ai-about__head { display:flex; align-items:center; gap:8px; margin-block-end:8px; }
.yk-ai-about__title { flex:1; font-family: var(--font-display); font-size:1.02rem; font-weight:700; color: var(--color-text-primary); }
.yk-ai-about__list { display:flex; flex-direction:column; gap:12px; padding-inline-start:1.2em; font-size:.84rem; line-height:1.75; color: var(--color-text-secondary); font-family: var(--font-body); }
.yk-ai-about__list li { list-style:disc; }
.yk-ai-about__list li::marker { color: var(--color-accent); }
/* 免责常驻行 —— composer 正下方（ChatGPT「可能会犯错」同位；语义只强化不弱化） */
.yk-ai-inputnote { text-align:center; font-size:.75rem; color: var(--color-text-muted); font-family: var(--font-body); line-height:1.5; max-inline-size:48rem; margin-inline:auto; padding:8px 12px; padding-block-end: max(10px, env(safe-area-inset-bottom, 0px)); }
.yk-ai-hero .yk-ai-inputnote { margin-block-start:14px; padding-block-end:0; }

@media (max-width:768px){
  .yk-ai-msg--user { max-inline-size:88%; }
  .yk-ai-log { padding:18px var(--space-md); }
  .yk-ai-hero__greeting { font-size:1.3rem; }
  .yk-ai-hero__composer { margin-block-start:20px; }
  /* 触控热区统一 44px（Apple HIG / Material） */
  .yk-ai-send, .yk-ai-actbtn, .yk-ai-ctx__close { min-inline-size:44px; min-block-size:44px; }
  /* 移动欢迎态只留 3 个建议 pill —— composer 保持舞台中心 */
  .yk-ai-pill:nth-child(n+4) { display:none; }
  /* SSR 首帧不闪桌面侧栏：rail 由 CSS 隐藏（drawer 是绝对定位变体，不受影响） */
  .yk-ai-shell > .yk-ai-side:not(.yk-ai-side--drawer) { display:none; }
}
@media (max-height:600px){
  .ai-chat-stage { min-block-size:0; }
  .yk-ai-hero { justify-content:flex-start; }
}
@media (prefers-reduced-motion: reduce){
  .yk-ai-dot{ animation:none; }
  .yk-ai-log{ scroll-behavior:auto; }
  .yk-ai-turn, .yk-ai-hero { animation:none; }
  .yk-ai-msg--streaming > div:last-child::after { animation:none; }
  .yk-ai-pill:hover, .yk-ai-send:not(:disabled):hover, .yk-ai-scrollbtn:hover { transform:none; }
  .yk-ai *, .yk-ai *::before, .yk-ai *::after { transition:none !important; animation-duration:.01ms !important; }
}
`;

export default function AIAssistant({ compact = false, onClose }: AIAssistantProps) {
  const locale = getLocale();
  const ui = AI_COPY[locale];
  const crisisHotlines = useMemo<CrisisHotline[]>(() => getCrisisHotlines(locale), [locale]);

  const chat = useChatSessions();
  const {
    messages, sessions, activeId, activeSession, historyEnabled, setHistoryEnabled,
    newSession, switchSession, renameSession, deleteSession, clearAll,
    setActiveMessages, ensureSession, updateSession, setStreaming, flush, exportAll,
  } = chat;

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [servedModel, setServedModel] = useState<string | null>(null);
  const [pageTitle, setPageTitle] = useState<string | null>(null);
  const [ctxOptOut, setCtxOptOut] = useState(pageContextOptOut);
  const [rich, setRich] = useState(isRichReady());
  const [online, setOnline] = useState(true);
  const [rateLimitLeft, setRateLimitLeft] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [railCollapsed, setRailCollapsed] = useState(false);
  const [atBottom, setAtBottom] = useState(true);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editText, setEditText] = useState('');
  const [aboutOpen, setAboutOpen] = useState(false);
  /** 流式归属的 sessionId（渲染层判断轻量渲染 + 光标）；null = 无流式 */
  const [streamingMsgKey, setStreamingMsgKey] = useState<string | null>(null);
  /** sr-only 状态播报（流式区 aria-live 已静音，完成/错误在此一次性播报） */
  const [srStatus, setSrStatus] = useState('');

  const logRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => { setPageTitle(getPageTitle()); }, []);

  // 桌面打开页面即可打字（移动端不自动弹键盘）
  useEffect(() => {
    if (!compact && window.innerWidth > 768) inputRef.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 使用须知弹层：Esc 关闭 + 焦点归还输入框
  useEffect(() => {
    if (!aboutOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); setAboutOpen(false); inputRef.current?.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [aboutOpen]);

  // rich markdown: load once, upgrade rendering when ready
  useEffect(() => {
    setCopyLabel(ui.copyCode);
    if (!isRichReady()) ensureRichMarkdown().then(() => setRich(true));
  }, [ui.copyCode]);

  // responsive (window resize covers both media-query change and programmatic resize)
  useEffect(() => {
    const upd = () => setIsMobile(window.innerWidth <= 768);
    upd();
    window.addEventListener('resize', upd);
    return () => window.removeEventListener('resize', upd);
  }, []);

  // online / offline
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    setOnline(navigator.onLine);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  // rate-limit countdown
  useEffect(() => {
    if (rateLimitLeft <= 0) return;
    const t = setTimeout(() => setRateLimitLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [rateLimitLeft]);

  // Cmd/Ctrl+K → new chat
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        newSession();
        setInput('');
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [newSession]);

  const scrollToBottom = useCallback(() => {
    const c = logRef.current;
    if (c) requestAnimationFrame(() => { c.scrollTop = c.scrollHeight; });
  }, []);

  useEffect(() => { if (atBottom) scrollToBottom(); }, [messages, atBottom, scrollToBottom]);

  function onLogScroll() {
    const c = logRef.current;
    if (!c) return;
    setAtBottom(c.scrollHeight - c.scrollTop - c.clientHeight < 48);
  }

  // auto-grow textarea
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [input]);

  function dismissContext() { pageContextOptOut = true; setCtxOptOut(true); }

  function buildApiContent(text: string): string {
    if (!pageContextOptOut && pageTitle && text.length > 14) {
      const prefixed = ui.contextPrefix.replace('{title}', pageTitle) + text;
      if (byteLen(prefixed) <= MAX_CONTENT_BYTES) return prefixed;
    }
    return text;
  }

  function buildOutgoing(base: StoredMessage[], apiContentForLast: string) {
    const sliced = base.slice(-MAX_SENT_MESSAGES);
    return sliced.map((m, i, arr) => ({
      role: m.role,
      content: i === arr.length - 1 && m.role === 'user' ? apiContentForLast : m.content,
    }));
  }

  function startRateLimit(res: Response) {
    const ra = parseInt(res.headers.get('Retry-After') || '', 10);
    setRateLimitLeft(Number.isFinite(ra) && ra > 0 ? ra : 30);
  }

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  /** 移除末尾空 assistant 占位（停止/失败时防思考圆点卡死）。 */
  const dropEmptyTail = (prev: StoredMessage[]) => {
    const last = prev[prev.length - 1];
    return last?.role === 'assistant' && !last.content ? prev.slice(0, -1) : prev;
  };

  /** 流式核心 —— 所有增量更新锁定发起时的 sessionId（用户可在流式中切换/新建会话）。 */
  async function runCompletion(sessionId: string, outgoing: { role: string; content: string }[]) {
    setError(null);
    setIsLoading(true);
    setStreaming(true);
    setStreamingMsgKey(`${sessionId}`);
    const controller = new AbortController();
    abortRef.current = controller;
    const MAX_ATTEMPTS = 3;
    const BACKOFFS = [500, 1500, 3000];
    let firstChunk = false;
    let lastErr: Error | null = null;

    const finish = (announce: string | null) => {
      setStreaming(false);
      setStreamingMsgKey(null);
      setIsLoading(false);
      abortRef.current = null;
      if (announce) setSrStatus(announce);
      focusInput();
    };

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      try {
        const res = await fetch('/api/ai-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: outgoing }),
          signal: controller.signal,
        });

        if (!res.ok) {
          if (res.status === 429) {
            const data = await res.json().catch(() => ({}));
            startRateLimit(res);
            throw new Error(data.error || ui.rateLimitError);
          }
          if (res.status >= 400 && res.status < 500) {
            throw new Error(`${ui.serviceUnavailable} (${res.status})`);
          }
          lastErr = new Error(`${ui.serviceUnavailable} (${res.status})`);
          if (attempt < MAX_ATTEMPTS - 1) { setError(ui.retrying); await sleep(BACKOFFS[attempt]); continue; }
          throw lastErr;
        }

        const model = res.headers.get('x-yk-model');
        if (model) setServedModel(model);

        if (!res.body) {
          lastErr = new Error(ui.serviceUnavailable);
          if (attempt < MAX_ATTEMPTS - 1) { setError(ui.retrying); await sleep(BACKOFFS[attempt]); continue; }
          throw lastErr;
        }

        setError(null);
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let content = '';
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            firstChunk = true;
            content += decoder.decode(value, { stream: true });
            updateSession(sessionId, (prev) => replaceLastAssistant(prev, content), false);
          }
        } catch (streamErr: unknown) {
          if (controller.signal.aborted) {
            // 用户主动停止 —— 保留已渲染部分；若首字节前停止则移除空占位
            updateSession(sessionId, dropEmptyTail, true);
            finish(null); return;
          }
          const m = streamErr instanceof Error ? streamErr.message : ui.unknownError;
          setError(`${m}（${ui.streamInterrupted}）`);
          flush(); finish(ui.errorPrefix + m); return;
        }

        if (!content) updateSession(sessionId, (prev) => replaceLastAssistant(prev, ui.emptyResponse), false);
        flush();
        // 完成后把回复全文（截断）一次性交给 sr-only 播报区——替代流式区的高频 aria-live
        finish((content || ui.emptyResponse).slice(0, 400));
        return;
      } catch (err: unknown) {
        if (controller.signal.aborted) {
          updateSession(sessionId, dropEmptyTail, true);
          finish(null); return;
        }
        lastErr = err instanceof Error ? err : new Error(ui.unknownError);
        if (firstChunk) break;
        const retryable = /fetch|network|5\d\d/i.test(lastErr.message);
        if (retryable && attempt < MAX_ATTEMPTS - 1) { setError(ui.retrying); await sleep(BACKOFFS[attempt]); continue; }
        break;
      }
    }

    const finalMsg = lastErr?.message ?? ui.unknownError;
    setError(`${finalMsg}（${ui.retryHint}）`);
    updateSession(sessionId, dropEmptyTail, true);
    finish(ui.errorPrefix + finalMsg);
  }

  function focusInput() { inputRef.current?.focus(); }

  const canSend = !isLoading && online && rateLimitLeft <= 0;

  async function sendMessage(text?: string) {
    const messageText = (text ?? input).trim();
    if (!messageText || !canSend) return;
    if (byteLen(messageText) > MAX_CONTENT_BYTES) return;

    const crisis = containsCrisisKeyword(messageText);
    const apiContent = buildApiContent(messageText);
    // 锁定发起时的会话 id —— 用户可在流式中切换/新建会话
    const sid = ensureSession();
    const base: StoredMessage[] = [...messages, { role: 'user', content: messageText, crisis }];

    updateSession(sid, (prev) => [...prev, { role: 'user', content: messageText, crisis }], true);
    updateSession(sid, (prev) => [...prev, { role: 'assistant', content: '' }], false);
    setInput('');
    setAtBottom(true);
    await runCompletion(sid, buildOutgoing(base, apiContent));
  }

  function stopGeneration() { abortRef.current?.abort(); }

  function regenerate() {
    if (isLoading || !activeId) return;
    let idx = -1;
    for (let i = messages.length - 1; i >= 0; i--) if (messages[i].role === 'user') { idx = i; break; }
    if (idx < 0) return;
    const sid = activeId;
    const base = messages.slice(0, idx + 1);
    updateSession(sid, () => [...base, { role: 'assistant', content: '' }], false);
    setAtBottom(true);
    runCompletion(sid, buildOutgoing(base, base[base.length - 1].content));
  }

  function beginEdit(i: number) { setEditingIdx(i); setEditText(messages[i].content); }
  function cancelEdit() { setEditingIdx(null); setEditText(''); }
  function submitEdit(i: number) {
    const text = editText.trim();
    // 先校验可发送性再动状态 —— 否则离线/限流时会留下永久的"正在思考"假占位
    if (!text || byteLen(text) > MAX_CONTENT_BYTES || !canSend) return;
    const crisis = containsCrisisKeyword(text);
    const sid = ensureSession();
    const base: StoredMessage[] = [...messages.slice(0, i), { role: 'user', content: text, crisis }];
    updateSession(sid, () => [...base, { role: 'assistant', content: '' }], true);
    setEditingIdx(null);
    setEditText('');
    setAtBottom(true);
    runCompletion(sid, buildOutgoing(base, buildApiContent(text)));
  }

  async function copyMessage(i: number, text: string) {
    try { await navigator.clipboard?.writeText(text); setCopiedIdx(i); setTimeout(() => setCopiedIdx((c) => (c === i ? null : c)), 1500); } catch { /* ignore */ }
  }

  function onLogClick(e: React.MouseEvent) {
    const target = e.target as HTMLElement;
    const btn = target.closest?.('[data-yk-copy]') as HTMLElement | null;
    if (!btn) return;
    const code = btn.closest('.yk-ai-prewrap')?.querySelector('code');
    if (code) {
      navigator.clipboard?.writeText(code.textContent || '').then(() => {
        btn.classList.add('yk-ai-copybtn--done');
        setTimeout(() => btn.classList.remove('yk-ai-copybtn--done'), 1200);
      }).catch(() => {});
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  }

  const showCtxHint = !ctxOptOut && pageTitle !== null;
  const inputBytes = byteLen(input);
  const overLimit = inputBytes > MAX_CONTENT_BYTES;
  const showRail = !compact && !isMobile && !railCollapsed;
  const useDrawer = compact || isMobile;
  const lastAiIndex = (() => { for (let i = messages.length - 1; i >= 0; i--) if (messages[i].role === 'assistant') return i; return -1; })();
  void rich; // referenced to re-render when rich markdown becomes ready

  const sidebar = (variant: 'rail' | 'drawer') => (
    <ChatSessionSidebar
      variant={variant}
      open={sidebarOpen}
      onClose={() => setSidebarOpen(false)}
      ui={ui}
      sessions={sessions}
      activeId={activeId}
      historyEnabled={historyEnabled}
      onNewChat={() => { newSession(); setInput(''); focusInput(); }}
      onSelect={switchSession}
      onRename={renameSession}
      onDelete={(id) => {
        // 删除正在接收流式回复的会话 → 同时终止该请求（chunk 已无处可写）
        if (id === streamingMsgKey) abortRef.current?.abort();
        deleteSession(id);
      }}
      onClearAll={clearAll}
      onExportAll={exportAll}
      onToggleHistory={setHistoryEnabled}
      onAbout={() => setAboutOpen(true)}
      homeHref={`/${locale}/`}
    />
  );

  /* 「使用须知」弹层 —— 承接原页面级免责详版（只强化不弱化） */
  const aboutSheet = aboutOpen ? (
    <div className="yk-ai-about">
      <div className="yk-ai-about__overlay" onClick={() => { setAboutOpen(false); focusInput(); }} />
      <div className="yk-ai-about__card" role="dialog" aria-modal="true" aria-label={ui.aboutTitle} onKeyDown={trapTab}>
        <div className="yk-ai-about__head">
          <span className="yk-ai-about__title">{ui.aboutTitle}</span>
          <button className="yk-ai-iconbtn" onClick={() => { setAboutOpen(false); focusInput(); }} aria-label={ui.close} autoFocus>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <ul className="yk-ai-about__list">
          {ui.aboutPoints.map((p, i) => (
            <li key={i}>{p}</li>
          ))}
        </ul>
      </div>
    </div>
  ) : null;

  const isEmpty = messages.length === 0;

  /* composer 浮岛 —— 欢迎态居中 / 对话态坞底，两处共用 */
  const composerCard = (
    <div className="yk-ai-composer">
      <textarea
        ref={inputRef}
        className="yk-ai-input"
        rows={1}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={rateLimitLeft > 0 ? ui.rateLimitWait.replace('{s}', String(rateLimitLeft)) : ui.inputPlaceholder}
        disabled={isLoading && !abortRef.current}
        aria-label={ui.inputLabel}
      />
      {isLoading ? (
        <button className="yk-ai-send yk-ai-send--stop" onClick={stopGeneration} aria-label={ui.stop} title={ui.stop}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <rect x="6" y="6" width="12" height="12" rx="2" />
          </svg>
        </button>
      ) : (
        <button
          className="yk-ai-send"
          onClick={() => sendMessage()}
          disabled={!input.trim() || !canSend || overLimit}
          aria-label={ui.sendLabel}
          title={ui.send}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 19V5" /><path d="M5 12l7-7 7 7" />
          </svg>
        </button>
      )}
    </div>
  );

  const statusBars = (
    <>
      {!online && <div className="yk-ai-banner yk-ai-banner--offline">{ui.offline}</div>}
      {showCtxHint && (
        <div className="yk-ai-ctx">
          <span className="yk-ai-ctx__text">{ui.contextHint}</span>
          <button className="yk-ai-ctx__close" onClick={dismissContext} aria-label={ui.contextDismiss}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      )}
    </>
  );

  const charHint =
    overLimit || inputBytes > MAX_CONTENT_BYTES * 0.85 ? (
      <div className={`yk-ai-charhint ${overLimit ? 'yk-ai-charhint--over' : ''}`}>
        {inputBytes} / {MAX_CONTENT_BYTES}
      </div>
    ) : null;

  /* 免责常驻行 —— 两种状态都紧贴输入区（只强化不弱化） */
  const inputNote = <div className="yk-ai-inputnote">{ui.inputDisclaimer}</div>;

  return (
    <div className={`yk-ai ${compact ? 'yk-ai--compact' : 'yk-ai--page'}`} role="region" aria-label={ui.title}>
      <style>{BASE_CSS}</style>
      {/* 读屏状态播报区（视觉隐藏）：回复完成时播报全文摘要 / 错误播报错误信息 */}
      <div className="yk-ai-srstatus" role="status" aria-live="polite">{srStatus}</div>
      <div className="yk-ai-shell">
        {showRail && sidebar('rail')}
        {useDrawer && sidebar('drawer')}
        {aboutSheet}

        <div className="yk-ai-main">
          {/* Topbar —— 极简：侧栏开关 · 会话名 · 模型徽章 */}
          <div className={`yk-ai-topbar ${isEmpty ? 'yk-ai-topbar--hero' : ''}`}>
            <button
              className="yk-ai-iconbtn"
              onClick={() => (useDrawer ? setSidebarOpen(true) : setRailCollapsed((c) => !c))}
              aria-label={ui.openSidebar}
            >
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="3" y="4" width="18" height="16" rx="2.5" /><line x1="9.5" y1="4" x2="9.5" y2="20" />
              </svg>
            </button>
            {railCollapsed && !useDrawer && (
              <button
                className="yk-ai-iconbtn"
                onClick={() => { newSession(); setInput(''); focusInput(); }}
                aria-label={ui.newChat}
                title={ui.newChat}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z" />
                </svg>
              </button>
            )}
            {!compact && (
              <a
                className="yk-ai-iconbtn"
                href={`/${locale}/`}
                aria-label={ui.backHome}
                title={ui.backHome}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" />
                </svg>
              </a>
            )}
            <span className="yk-ai-topbar__title">
              {messages.length > 0 ? (activeSession?.title || ui.untitledChat) : ''}
            </span>
            {servedModel && (
              <span className="yk-ai-topbar__model" title={ui.poweredBy.replace('{model}', servedModel)}>
                {ui.poweredBy.replace('{model}', servedModel)}
              </span>
            )}
            {compact && (
              <a
                className="yk-ai-iconbtn yk-ai-expand"
                href={`/${locale}/tools/ai-assistant/`}
                aria-label={ui.title}
                title={ui.title}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" />
                  <line x1="21" y1="3" x2="14" y2="10" /><line x1="3" y1="21" x2="10" y2="14" />
                </svg>
              </a>
            )}
            {onClose && (
              <button className="yk-ai-iconbtn" onClick={onClose} aria-label={ui.close}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>

          {isEmpty ? (
            /* ============ 状态 A · 欢迎态「居中舞台」 ============ */
            <div className="yk-ai-hero">
              <span className="yk-ai-hero__badge"><AIChatIcon size={32} /></span>
              <div className="yk-ai-hero__greeting">{ui.greeting}</div>
              <div className="yk-ai-hero__sub">{ui.emptySubtitle}</div>
              <div className="yk-ai-hero__composer">
                {statusBars}
                {composerCard}
                {charHint}
              </div>
              <div className="yk-ai-pills">
                {ui.suggestions.map((q, i) => (
                  <button key={i} className="yk-ai-pill" onClick={() => sendMessage(q)}>{q}</button>
                ))}
              </div>
              {inputNote}
            </div>
          ) : (
            /* ============ 状态 B · 对话态 ============ */
            <>
              <div className="yk-ai-logwrap">
                {/* aria-live 静音：流式每秒数十次 text 变更会让读屏高频碎读；
                    完成/错误由下方 sr-only 状态区一次性播报 */}
                <div
                  ref={logRef}
                  className="yk-ai-log"
                  role="log"
                  aria-live="off"
                  onScroll={onLogScroll}
                  onClick={onLogClick}
                >
                  <div className="yk-ai-log__inner">
                  {messages.map((msg, i) => (
                    <div key={i} className="yk-ai-turn">
                      {msg.role === 'user' && editingIdx === i ? (
                        <div className="yk-ai-edit">
                          <textarea
                            className="yk-ai-edit__area"
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            aria-label={ui.edit}
                            autoFocus
                          />
                          <div className="yk-ai-edit__row">
                            <button className="yk-ai-actbtn" onClick={cancelEdit}>{ui.cancel}</button>
                            <button className="yk-ai-actbtn" onClick={() => submitEdit(i)}>{ui.save}</button>
                          </div>
                        </div>
                      ) : msg.role === 'user' ? (
                        <>
                          <div className="yk-ai-msg yk-ai-msg--user">{msg.content}</div>
                          {!isLoading && (
                            <div className="yk-ai-actions yk-ai-actions--user">
                              <button className="yk-ai-actbtn" onClick={() => copyMessage(i, msg.content)}>
                                {copiedIdx === i ? ui.copied : ui.copy}
                              </button>
                              <button className="yk-ai-actbtn" onClick={() => beginEdit(i)}>{ui.edit}</button>
                            </div>
                          )}
                        </>
                      ) : null}

                      {/* 危机热线卡 —— 本地秒级渲染，不可关闭 */}
                      {msg.role === 'user' && msg.crisis && (
                        <div className="yk-ai-crisis" role="group" aria-label={ui.crisisTitle}>
                          <p className="yk-ai-crisis__title">{ui.crisisTitle}</p>
                          {crisisHotlines.length > 0 && (
                            <>
                              <p className="yk-ai-crisis__body">{ui.crisisBody}</p>
                              <div className="yk-ai-crisis__list">
                                {crisisHotlines.map((h) => (
                                  <a key={h.id} className="yk-ai-crisis__line" href={h.href}>
                                    <span className="yk-ai-crisis__name">
                                      {h.name}
                                      {h.hours && h.hours !== '24h' && <span> · {h.hours}</span>}
                                    </span>
                                    <span className="yk-ai-crisis__num">{h.number}</span>
                                  </a>
                                ))}
                              </div>
                            </>
                          )}
                          <p className="yk-ai-crisis__note">{ui.crisisOutside}</p>
                        </div>
                      )}

                      {/* Assistant —— 流式中走轻量渲染（结束后一次富渲染），避免每 chunk 全量 DOM 重建 */}
                      {msg.role === 'assistant' && (
                        msg.content ? (
                          <>
                            <div className={`yk-ai-msg yk-ai-msg--ai ${isLoading && i === messages.length - 1 && streamingMsgKey === activeId ? 'yk-ai-msg--streaming' : ''}`}>
                              <div className="yk-ai-msg__label">
                                <AIChatIcon size={15} />
                                <span>{ui.title}</span>
                              </div>
                              <div
                                dangerouslySetInnerHTML={{
                                  __html:
                                    isLoading && i === messages.length - 1 && streamingMsgKey === activeId
                                      ? renderMarkdownStreaming(msg.content)
                                      : renderMarkdown(msg.content),
                                }}
                              />
                            </div>
                            {!isLoading && (
                              <div className="yk-ai-actions">
                                <button className="yk-ai-actbtn" onClick={() => copyMessage(i, msg.content)}>
                                  {copiedIdx === i ? ui.copied : ui.copy}
                                </button>
                                {i === lastAiIndex && (
                                  <button className="yk-ai-actbtn" onClick={regenerate}>{ui.regenerate}</button>
                                )}
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="yk-ai-thinking">
                            <span className="yk-ai-dots"><span className="yk-ai-dot" /><span className="yk-ai-dot" /><span className="yk-ai-dot" /></span>
                            {ui.thinking}
                          </div>
                        )
                      )}
                    </div>
                  ))}

                    {error && <div className="yk-ai-error" role="alert">{ui.errorPrefix}{error}</div>}
                  </div>
                </div>

                {!atBottom && (
                  <button className="yk-ai-scrollbtn" onClick={() => { setAtBottom(true); scrollToBottom(); }} aria-label={ui.scrollToBottom}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <line x1="12" y1="5" x2="12" y2="19" /><polyline points="19 12 12 19 5 12" />
                    </svg>
                  </button>
                )}
              </div>

              {/* 坞底：状态条 + composer 浮岛 + 免责常驻行 */}
              <div className="yk-ai-dock">
                {statusBars}
                {composerCard}
                {charHint}
                {inputNote}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
