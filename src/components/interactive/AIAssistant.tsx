import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { getLocale, AI_COPY } from './aiChatL10n';
import { containsCrisisKeyword, getCrisisHotlines } from './crisisSupport';
import type { CrisisHotline } from './crisisSupport';
import { useChatSessions } from './useChatSessions';
import type { StoredMessage } from '../../utils/ai-chat/storage';
import ChatSessionSidebar from './ChatSessionSidebar';
import { renderMarkdown, ensureRichMarkdown, isRichReady, setCopyLabel } from './aiMarkdown';

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

export function AIChatIcon({ size = 24 }: { size?: number }) {
  const petal = 'M12 6.9c.85.85.85 1.8 0 2.6-.85-.8-.85-1.75 0-2.6z';
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 14.8a2 2 0 0 1-2 2H7.6L3 21V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      <g strokeWidth="1.3">
        <path d={petal} />
        <path d={petal} transform="rotate(72 12 9.5)" />
        <path d={petal} transform="rotate(144 12 9.5)" />
        <path d={petal} transform="rotate(216 12 9.5)" />
        <path d={petal} transform="rotate(288 12 9.5)" />
      </g>
    </svg>
  );
}

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
.yk-ai { display:flex; flex-direction:column; block-size:100%; overflow:hidden; margin:0; }
/* 中和 Starlight prose 给 .sl-markdown-content 内所有块级元素注入的 margin-top —
   它会逐层撑破全屏布局。消息体/侧栏的显式 margin 由更高（或后载同级）优先级规则恢复。 */
.yk-ai * { margin: 0; }
.yk-ai--compact { background: var(--color-bg-container, #1a1625); }
.yk-ai-shell { display:flex; flex:1; min-block-size:0; position:relative; overflow:hidden; }
.yk-ai-main { flex:1; min-inline-size:0; display:flex; flex-direction:column; block-size:100%; overflow:hidden; }

.yk-ai-header { display:flex; align-items:center; gap: var(--space-sm); padding: var(--space-md) var(--space-lg); border-block-end:1px solid var(--color-outline-20); flex-shrink:0; }
.yk-ai--compact .yk-ai-header { padding:10px 12px; }
.yk-ai-iconbtn { background:none; border:none; color: var(--color-text-secondary); cursor:pointer; min-inline-size:40px; min-block-size:40px; display:inline-flex; align-items:center; justify-content:center; padding: var(--space-xs); transition: color var(--transition-fast), background var(--transition-fast); border-radius:0; }
a.yk-ai-iconbtn { text-decoration:none; }
@media (hover:hover){ .yk-ai-iconbtn:hover{ color: var(--color-primary); background: var(--color-primary-alpha-08);} }
.yk-ai-iconbtn:focus-visible{ outline:2px solid var(--color-accent); outline-offset:1px; }
.yk-ai-header__icon { color: var(--color-accent); display:inline-flex; }
.yk-ai-header__titlewrap { flex:1; min-inline-size:0; display:flex; flex-direction:column; }
.yk-ai-header__title { font-family: var(--font-display); font-size:1rem; font-weight:700; color: var(--color-text-primary); line-height:1.2; }
.yk-ai--compact .yk-ai-header__title { font-size:.9rem; }
.yk-ai-header__model { font-size:.625rem; color: var(--color-text-muted); font-family: var(--font-mono); letter-spacing:.03em; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.yk-ai-header__badge { display:inline-block; padding:1px var(--space-sm); font-size:.6875rem; font-family: var(--font-mono); color: var(--color-safe); border:1px solid var(--color-safe-alpha-30); letter-spacing:.05em; }

.yk-ai-disclaimer { padding:6px 14px; background: var(--color-caution-alpha-08); border-block-end:1px solid var(--color-outline-20); font-size:.6875rem; color: var(--color-caution); line-height:1.4; font-family: var(--font-body); flex-shrink:0; }

.yk-ai-logwrap { flex:1; min-block-size:0; position:relative; display:flex; flex-direction:column; }
.yk-ai-log { flex:1; overflow-y:auto; overflow-x:hidden; padding: var(--space-lg); display:flex; flex-direction:column; gap: var(--space-md); scroll-behavior:smooth; }
.yk-ai--compact .yk-ai-log { padding:12px; gap:10px; }
.yk-ai-log__inner { inline-size:100%; max-inline-size:820px; margin-inline:auto; display:flex; flex-direction:column; gap: var(--space-md); }

.yk-ai-welcome { flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; gap: var(--space-md); text-align:center; padding: var(--space-xl) var(--space-lg); color: var(--color-text-muted); }
.yk-ai-welcome__icon { color: var(--color-accent); opacity:.8; }
.yk-ai-welcome__title { font-family: var(--font-display); font-size:1.15rem; font-weight:700; color: var(--color-text-primary); }
.yk-ai--compact .yk-ai-welcome__title { font-size:1rem; }
.yk-ai-welcome__sub { font-family: var(--font-body); font-size:.875rem; line-height:1.6; max-inline-size:38ch; }
.yk-ai-chips { display:flex; flex-wrap:wrap; gap:8px; justify-content:center; margin-block-start: var(--space-xs); }
.yk-ai-chip { background: var(--color-bg-container); border:1px solid var(--color-outline-20); color: var(--color-text-secondary); padding:8px 12px; font-size:.8125rem; font-family: var(--font-body); cursor:pointer; text-align:start; transition: border-color var(--transition-fast), color var(--transition-fast); border-radius:0; }
@media (hover:hover){ .yk-ai-chip:hover{ border-color: var(--color-primary); color: var(--color-primary-light);} }

.yk-ai-turn { display:flex; flex-direction:column; gap:6px; }
.yk-ai-msg { max-inline-size:92%; inline-size:fit-content; padding:8px 12px; font-family: var(--font-body); font-size:.9rem; color: var(--color-text-primary); }
.yk-ai--compact .yk-ai-msg { font-size:.8375rem; }
.yk-ai-msg--user { align-self:flex-end; background: var(--color-primary-alpha-15); border-inline-start:3px solid var(--color-primary); line-height:1.6; white-space:pre-wrap; }
.yk-ai-msg--ai { align-self:flex-start; background: var(--color-white-alpha-03); border-inline-start:3px solid var(--color-accent); line-height:1.7; max-inline-size:100%; }
.yk-ai-msg__label { font-size:.625rem; color: var(--color-text-muted); font-family: var(--font-mono); letter-spacing:.05em; text-transform:uppercase; margin-block-end:2px; }
.yk-ai-actions { display:flex; gap:2px; align-self:flex-start; margin-block-start:-2px; }
.yk-ai-msg--user + .yk-ai-actions { align-self:flex-end; }
.yk-ai-actbtn { background:none; border:none; color: var(--color-text-muted); cursor:pointer; min-inline-size:32px; min-block-size:32px; display:inline-flex; align-items:center; gap:4px; padding:0 6px; font-size:.6875rem; font-family: var(--font-body); transition: color var(--transition-fast); border-radius:0; }
@media (hover:hover){ .yk-ai-actbtn:hover{ color: var(--color-primary);} }
.yk-ai-actbtn:focus-visible{ outline:2px solid var(--color-accent); outline-offset:1px; }

.yk-ai-edit { display:flex; flex-direction:column; gap:6px; align-self:flex-end; inline-size:min(560px, 92%); }
.yk-ai-edit__area { inline-size:100%; min-block-size:60px; padding:8px 10px; background: var(--color-bg-container); color: var(--color-text-primary); border:1px solid var(--color-primary); font-family: var(--font-body); font-size:.9rem; resize:vertical; border-radius:0; outline:none; }
.yk-ai-edit__row { display:flex; gap:8px; justify-content:flex-end; }

/* rich markdown blocks */
.yk-ai-msg .yk-ai-h { display:block; margin-top:.75em; font-weight:700; }
.yk-ai-msg h1,.yk-ai-msg h2 { font-size:1.05em; font-weight:700; margin:.6em 0 .3em; }
.yk-ai-msg h3,.yk-ai-msg h4 { font-size:1em; font-weight:700; margin:.5em 0 .25em; }
.yk-ai-msg ul,.yk-ai-msg ol { margin:.4em 0; padding-inline-start:1.4em; display:flex; flex-direction:column; gap:2px; }
.yk-ai-msg li { list-style:revert; }
.yk-ai-li { margin-inline-start:1.2em; }
.yk-ai-li--ul { list-style:disc; } .yk-ai-li--ol { list-style:decimal; }
.yk-ai-msg p { margin:.35em 0; }
.yk-ai-msg blockquote { margin:.5em 0; padding-inline-start:10px; border-inline-start:3px solid var(--color-outline); color: var(--color-text-secondary); }
.yk-ai-hr { border:none; border-top:1px solid var(--color-outline-20); margin:.75em 0; }
.yk-ai-code, .yk-ai-msg code { background: var(--color-white-alpha-08); padding:.1em .3em; font-size:.85em; font-family: var(--font-code); }
.yk-ai-prewrap { position:relative; margin:.5em 0; }
.yk-ai-msg pre { background: var(--color-bg, #12101a); border:1px solid var(--color-outline-20); padding:10px 12px; overflow-x:auto; font-size:.82em; }
.yk-ai-msg pre code { background:none; padding:0; font-size:1em; }
.yk-ai-copybtn { position:absolute; inset-block-start:6px; inset-inline-end:6px; background: var(--color-bg-container); border:1px solid var(--color-outline-20); color: var(--color-text-muted); cursor:pointer; inline-size:28px; block-size:28px; display:inline-flex; align-items:center; justify-content:center; border-radius:0; transition: color var(--transition-fast); }
@media (hover:hover){ .yk-ai-copybtn:hover{ color: var(--color-primary);} }
.yk-ai-copybtn--done { color: var(--color-safe); }
.yk-ai-tablewrap { overflow-x:auto; margin:.5em 0; }
.yk-ai-table { border-collapse:collapse; font-size:.85em; min-inline-size:100%; }
.yk-ai-table th,.yk-ai-table td { border:1px solid var(--color-outline-20); padding:5px 9px; text-align:start; white-space:nowrap; }
.yk-ai-table th { background: var(--color-white-alpha-03); font-weight:700; }

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

.yk-ai-thinking { display:flex; align-items:center; gap:8px; align-self:flex-start; padding:8px 12px; background: var(--color-accent-alpha-08); border-inline-start:3px solid var(--color-accent); font-size:.75rem; color: var(--color-accent); font-family: var(--font-body); }
.yk-ai-dots{ display:inline-flex; gap:3px; }
.yk-ai-dot{ inline-size:5px; block-size:5px; border-radius:50%; background: var(--color-accent); animation: ai-dot-bounce 1s ease infinite; }
.yk-ai-dot:nth-child(2){ animation-delay:.15s; } .yk-ai-dot:nth-child(3){ animation-delay:.3s; }

.yk-ai-scrollbtn { position:absolute; inset-block-end:12px; inset-inline-end:16px; inline-size:36px; block-size:36px; border-radius:50%; background: var(--color-bg-container); border:1px solid var(--color-outline); color: var(--color-text-secondary); cursor:pointer; display:inline-flex; align-items:center; justify-content:center; box-shadow:0 2px 10px var(--color-black-alpha-40); z-index:5; }
@media (hover:hover){ .yk-ai-scrollbtn:hover{ color: var(--color-primary); border-color: var(--color-primary);} }

.yk-ai-banner { padding:6px 14px; font-size:.6875rem; line-height:1.4; font-family: var(--font-body); flex-shrink:0; display:flex; align-items:center; gap:8px; }
.yk-ai-banner--offline { background: var(--color-caution-alpha-08); color: var(--color-caution); border-block-start:1px solid var(--color-outline-20); }
.yk-ai-error { background: var(--color-danger-alpha-10); border-inline-start:4px solid var(--color-danger); padding:6px 10px; color: var(--color-danger); font-size:.75rem; font-family: var(--font-body); }

.yk-ai-ctx { display:flex; align-items:center; gap:8px; padding-block:2px; padding-inline:14px 6px; background: var(--color-white-alpha-03, rgba(255,255,255,.03)); border-block-start:1px solid var(--color-outline-20); font-size:.6875rem; color: var(--color-text-muted); font-family: var(--font-body); flex-shrink:0; }
.yk-ai-ctx__text{ flex:1; min-inline-size:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.yk-ai-ctx__close{ background:none; border:none; color: var(--color-text-secondary); cursor:pointer; min-inline-size:36px; min-block-size:36px; padding:0; display:inline-flex; align-items:center; justify-content:center; transition: color var(--transition-fast); }
@media (hover:hover){ .yk-ai-ctx__close:hover{ color: var(--color-primary);} }

.yk-ai-composer { border-block-start:1px solid var(--color-outline-20); padding: var(--space-md) var(--space-lg); flex-shrink:0; padding-block-end: max(var(--space-md), env(safe-area-inset-bottom, 0px)); }
.yk-ai--compact .yk-ai-composer { padding:10px 12px; }
.yk-ai-composer__inner { inline-size:100%; max-inline-size:820px; margin-inline:auto; display:flex; gap:8px; align-items:flex-end; }
.yk-ai-input { flex:1; min-inline-size:0; min-block-size:24px; max-block-size:160px; padding:8px 10px; background: var(--color-bg-container); color: var(--color-text-primary); border:none; border-block-end:2px solid var(--color-outline); font-family: var(--font-body); font-size:.9rem; outline:none; border-radius:0; resize:none; line-height:1.5; transition: border-color var(--transition-fast); }
.yk-ai--compact .yk-ai-input { font-size:.8375rem; }
.yk-ai-input:focus { border-block-end-color: var(--color-primary); }
.yk-ai-send { min-inline-size:64px; min-block-size:40px; padding:8px 14px; background: var(--color-primary); color: var(--color-text-on-dark); border:none; font-family: var(--font-body); font-size:.875rem; font-weight:600; cursor:pointer; transition: opacity var(--transition-fast); border-radius:0; white-space:nowrap; }
.yk-ai-send--stop { background: var(--color-danger, #D32F2F); }
.yk-ai-send:disabled { opacity:.5; cursor:not-allowed; }
.yk-ai-charhint { font-size:.625rem; color: var(--color-text-muted); font-family: var(--font-mono); text-align:end; margin-block-start:2px; max-inline-size:820px; margin-inline:auto; }
.yk-ai-charhint--over { color: var(--color-danger); }

@media (max-width:768px){
  .yk-ai-msg { max-inline-size:100%; }
  .yk-ai-log { padding: var(--space-md); }
}
@media (prefers-reduced-motion: reduce){ .yk-ai-dot{ animation:none; } .yk-ai-log{ scroll-behavior:auto; } }
`;

export default function AIAssistant({ compact = false, onClose }: AIAssistantProps) {
  const locale = getLocale();
  const ui = AI_COPY[locale];
  const crisisHotlines = useMemo<CrisisHotline[]>(() => getCrisisHotlines(locale), [locale]);

  const chat = useChatSessions();
  const {
    messages, sessions, activeId, historyEnabled, setHistoryEnabled,
    newSession, switchSession, renameSession, deleteSession, clearAll,
    setActiveMessages, flush, exportAll,
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

  const logRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => { setPageTitle(getPageTitle()); }, []);

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

  /** 流式核心 —— 假设 active session 末尾已是空 assistant 占位。 */
  async function runCompletion(outgoing: { role: string; content: string }[]) {
    setError(null);
    setIsLoading(true);
    const controller = new AbortController();
    abortRef.current = controller;
    const MAX_ATTEMPTS = 3;
    const BACKOFFS = [500, 1500, 3000];
    let firstChunk = false;
    let lastErr: Error | null = null;

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
          lastErr = new Error('No response body');
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
            setActiveMessages((prev) => replaceLastAssistant(prev, content), false);
          }
        } catch (streamErr: unknown) {
          if (controller.signal.aborted) {
            // 用户主动停止 —— 保留已渲染部分；若首字节前停止则移除空占位（否则思考圆点会卡住）
            setActiveMessages((prev) => {
              const last = prev[prev.length - 1];
              return last?.role === 'assistant' && !last.content ? prev.slice(0, -1) : prev;
            }, true);
            setIsLoading(false); abortRef.current = null; focusInput(); return;
          }
          const m = streamErr instanceof Error ? streamErr.message : ui.unknownError;
          setError(`${m}（${ui.streamInterrupted}）`);
          flush(); setIsLoading(false); abortRef.current = null; focusInput(); return;
        }

        if (!content) setActiveMessages((prev) => replaceLastAssistant(prev, ui.emptyResponse), false);
        flush(); setIsLoading(false); abortRef.current = null; focusInput(); return;
      } catch (err: unknown) {
        if (controller.signal.aborted) {
          setActiveMessages((prev) => {
            const last = prev[prev.length - 1];
            return last?.role === 'assistant' && !last.content ? prev.slice(0, -1) : prev;
          }, true);
          setIsLoading(false); abortRef.current = null; focusInput(); return;
        }
        lastErr = err instanceof Error ? err : new Error(ui.unknownError);
        if (firstChunk) break;
        const retryable = /fetch|network|5\d\d/i.test(lastErr.message);
        if (retryable && attempt < MAX_ATTEMPTS - 1) { setError(ui.retrying); await sleep(BACKOFFS[attempt]); continue; }
        break;
      }
    }

    setError(`${lastErr?.message ?? ui.unknownError}（${ui.retryHint}）`);
    setActiveMessages((prev) => {
      const last = prev[prev.length - 1];
      return last?.role === 'assistant' && !last.content ? prev.slice(0, -1) : prev;
    }, true);
    setIsLoading(false);
    abortRef.current = null;
    focusInput();
  }

  function focusInput() { inputRef.current?.focus(); }

  const canSend = !isLoading && online && rateLimitLeft <= 0;

  async function sendMessage(text?: string) {
    const messageText = (text ?? input).trim();
    if (!messageText || !canSend) return;
    if (byteLen(messageText) > MAX_CONTENT_BYTES) return;

    const crisis = containsCrisisKeyword(messageText);
    const apiContent = buildApiContent(messageText);
    const base: StoredMessage[] = [...messages, { role: 'user', content: messageText, crisis }];

    setActiveMessages((prev) => [...prev, { role: 'user', content: messageText, crisis }], true);
    setActiveMessages((prev) => [...prev, { role: 'assistant', content: '' }], false);
    setInput('');
    setAtBottom(true);
    await runCompletion(buildOutgoing(base, apiContent));
  }

  function stopGeneration() { abortRef.current?.abort(); }

  function regenerate() {
    if (isLoading) return;
    let idx = -1;
    for (let i = messages.length - 1; i >= 0; i--) if (messages[i].role === 'user') { idx = i; break; }
    if (idx < 0) return;
    const base = messages.slice(0, idx + 1);
    setActiveMessages(() => [...base, { role: 'assistant', content: '' }], false);
    setAtBottom(true);
    runCompletion(buildOutgoing(base, base[base.length - 1].content));
  }

  function beginEdit(i: number) { setEditingIdx(i); setEditText(messages[i].content); }
  function cancelEdit() { setEditingIdx(null); setEditText(''); }
  function submitEdit(i: number) {
    const text = editText.trim();
    if (!text || byteLen(text) > MAX_CONTENT_BYTES) return;
    const crisis = containsCrisisKeyword(text);
    const base: StoredMessage[] = [...messages.slice(0, i), { role: 'user', content: text, crisis }];
    setActiveMessages(() => [...base, { role: 'assistant', content: '' }], true);
    setEditingIdx(null);
    setEditText('');
    setAtBottom(true);
    if (canSend) runCompletion(buildOutgoing(base, buildApiContent(text)));
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
      onDelete={deleteSession}
      onClearAll={clearAll}
      onExportAll={exportAll}
      onToggleHistory={setHistoryEnabled}
    />
  );

  return (
    <div className={`yk-ai ${compact ? 'yk-ai--compact' : 'yk-ai--page'}`} role="region" aria-label={ui.title}>
      <style>{BASE_CSS}</style>
      <div className="yk-ai-shell">
        {showRail && sidebar('rail')}
        {useDrawer && sidebar('drawer')}

        <div className="yk-ai-main">
          {/* Header */}
          <div className="yk-ai-header">
            <button
              className="yk-ai-iconbtn"
              onClick={() => (useDrawer ? setSidebarOpen(true) : setRailCollapsed((c) => !c))}
              aria-label={ui.openSidebar}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            <span className="yk-ai-header__icon"><AIChatIcon size={18} /></span>
            <span className="yk-ai-header__titlewrap">
              <span className="yk-ai-header__title">{ui.title}</span>
              {servedModel && (
                <span className="yk-ai-header__model" title={servedModel}>
                  {ui.poweredBy.replace('{model}', servedModel)}
                </span>
              )}
            </span>
            <span className="yk-ai-header__badge">BETA</span>
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

          {/* Disclaimer —— 只能强化不能弱化 */}
          <div className="yk-ai-disclaimer">{ui.disclaimer}</div>

          {/* Messages */}
          <div className="yk-ai-logwrap">
            <div
              ref={logRef}
              className="yk-ai-log"
              role="log"
              aria-live="polite"
              aria-atomic="false"
              aria-relevant="additions text"
              onScroll={onLogScroll}
              onClick={onLogClick}
            >
              {messages.length === 0 ? (
                <div className="yk-ai-welcome">
                  <span className="yk-ai-welcome__icon"><AIChatIcon size={44} /></span>
                  <span className="yk-ai-welcome__title">{ui.emptyTitle}</span>
                  <span className="yk-ai-welcome__sub">{ui.emptySubtitle}</span>
                  <div className="yk-ai-chips">
                    {ui.suggestions.map((q, i) => (
                      <button key={i} className="yk-ai-chip" onClick={() => sendMessage(q)}>{q}</button>
                    ))}
                  </div>
                </div>
              ) : (
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
                          <div className="yk-ai-msg yk-ai-msg--user">
                            <div className="yk-ai-msg__label">YOU</div>
                            {msg.content}
                          </div>
                          {!isLoading && (
                            <div className="yk-ai-actions" style={{ alignSelf: 'flex-end' }}>
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

                      {/* Assistant */}
                      {msg.role === 'assistant' && (
                        msg.content ? (
                          <>
                            <div className="yk-ai-msg yk-ai-msg--ai">
                              <div className="yk-ai-msg__label">AI ASSISTANT</div>
                              <div dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }} />
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

                  {error && <div className="yk-ai-error">{ui.errorPrefix}{error}</div>}
                </div>
              )}
            </div>

            {!atBottom && messages.length > 0 && (
              <button className="yk-ai-scrollbtn" onClick={() => { setAtBottom(true); scrollToBottom(); }} aria-label={ui.scrollToBottom}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="12" y1="5" x2="12" y2="19" /><polyline points="19 12 12 19 5 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Offline banner */}
          {!online && <div className="yk-ai-banner yk-ai-banner--offline">{ui.offline}</div>}

          {/* 页面上下文提示条 */}
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

          {/* Composer */}
          <div className="yk-ai-composer">
            <div className="yk-ai-composer__inner">
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
                <button className="yk-ai-send yk-ai-send--stop" onClick={stopGeneration} aria-label={ui.stop}>
                  {ui.stop}
                </button>
              ) : (
                <button
                  className="yk-ai-send"
                  onClick={() => sendMessage()}
                  disabled={!input.trim() || !canSend || overLimit}
                  aria-label={ui.sendLabel}
                >
                  {ui.send}
                </button>
              )}
            </div>
            {(overLimit || inputBytes > MAX_CONTENT_BYTES * 0.85) && (
              <div className={`yk-ai-charhint ${overLimit ? 'yk-ai-charhint--over' : ''}`}>
                {inputBytes} / {MAX_CONTENT_BYTES}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
