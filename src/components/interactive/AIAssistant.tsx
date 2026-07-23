import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { getLocale, AI_COPY } from './aiChatL10n';
import { containsCrisisKeyword, getCrisisHotlines } from './crisisSupport';
import type { CrisisHotline } from './crisisSupport';

/* =========================================================================
   AIAssistant — AI 问答助手对话主体（手账化重构版）
   ------------------------------------------------------------------------
   · 端点契约零改动：POST /api/ai-chat {messages}，流式纯文本，
     429/4xx/5xx JSON error。端点文件一个字节不碰。
   · 隐私红线：对话不落任何存储（state 仅内存）；页面上下文提示的关闭
     状态也只存模块级内存变量，不落 localStorage。
   · 功能创新（全部纯前端）：
     1. 快捷问题 chips（17 语，空状态一键发送）
     2. 危机词本地拦截 —— 命中即本地渲染热线卡（hotlines.json SSOT），
        不等 AI；消息照常发送（服务端本就有危机引导 prompt）
     3. 页面上下文感知 —— document.title 清洗后拼进发送文本前缀，
        拼接后超端点 4096 bytes/条则不拼；可通过提示条 × 关闭（会话内存）
     4. 站内链接卡片化 —— AI 回复里的站内链接渲染为跳转小卡；
        外链普通样式 + rel="noopener noreferrer"
     5. 17 语 UI 文案（aiChatL10n.ts 字典，URL 首段取 locale，fallback zh）
   · 双态皮肤：默认（米哈游二相乐园）样式在本文件 BASE_CSS（class 化，
     观感与旧 inline 版一致）；sakura（乐园手账）覆盖层在
     src/styles/sakura-ai.css（html.sakura 作用域，主控注册 customCss）。
   ========================================================================= */

/* ================================
   会话级内存开关（隐私红线：仅内存，不落 localStorage）
   —— 模块级变量在浮窗开合（组件卸载/重挂）间保持，刷新页面即忘。
   ================================ */
let pageContextOptOut = false;

/* ================================
   共享图标 —— 对话气泡 + 樱瓣（手账贴纸风，stroke=currentColor）
   FloatingAIChat 的 FAB 与本组件头部/空状态共用。
   ================================ */
export function AIChatIcon({ size = 24 }: { size?: number }) {
  const petal = 'M12 6.9c.85.85.85 1.8 0 2.6-.85-.8-.85-1.75 0-2.6z';
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
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

/* ================================
   Markdown 渲染（纯字符串替换；输入只来自我们自己的端点，
   仍先转义 & < > 防注入 —— 与旧版同策略）
   ================================ */

const DOC_ICON_SVG =
  '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>';

function escapeAttr(url: string): string {
  return url.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

/** 站内链接 → 跳转小卡；外链 → 普通样式 + noopener。label 已 HTML 转义。 */
function buildLinkHtml(label: string, hrefRaw: string): string {
  const href = hrefRaw.replace(/&amp;/g, '&');
  let internal = false;
  if (href.startsWith('/')) {
    internal = true;
  } else {
    try {
      const u = new URL(href);
      if (u.protocol !== 'https:' && u.protocol !== 'http:') return label;
      internal = /(^|\.)hrtyaku\.com$/i.test(u.hostname);
    } catch {
      return label;
    }
  }
  const attr = escapeAttr(href);
  if (internal) {
    return (
      `<a class="yk-ai-linkcard" href="${attr}">` +
      `<span class="yk-ai-linkcard__icon" aria-hidden="true">${DOC_ICON_SVG}</span>` +
      `<span class="yk-ai-linkcard__label">${label}</span>` +
      `<span class="yk-ai-linkcard__arrow" aria-hidden="true">→</span>` +
      `</a>`
    );
  }
  return `<a class="yk-ai-extlink" href="${attr}" rel="noopener noreferrer" target="_blank">${label}</a>`;
}

function renderMarkdown(text: string): string {
  return (
    text
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/^---$/gm, '<hr class="yk-ai-hr"/>')
      .replace(/^### (.+)$/gm, '<strong class="yk-ai-h yk-ai-h--3">$1</strong>')
      .replace(/^## (.+)$/gm, '<strong class="yk-ai-h yk-ai-h--2">$1</strong>')
      /* markdown 链接（站内卡片化 / 外链 noopener） */
      .replace(
        /\[([^\]]+)\]\((https?:\/\/[^\s<>()]+|\/[^\s<>()]*)\)/g,
        (_m, label: string, href: string) => buildLinkHtml(label, href),
      )
      /* 裸 URL（前导空白/行首才算，避免命中已生成的 href 属性） */
      .replace(
        /(^|[\s])(https?:\/\/[^\s<>()]+)/g,
        (_m, pre: string, url: string) =>
          pre + buildLinkHtml(url.replace(/^https?:\/\/(www\.)?/i, '').slice(0, 64), url),
      )
      .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/^[*\-] (.+)$/gm, '<li class="yk-ai-li yk-ai-li--ul">$1</li>')
      .replace(/^\d+\.\s(.+)$/gm, '<li class="yk-ai-li yk-ai-li--ol">$1</li>')
      .replace(/`([^`]+)`/g, '<code class="yk-ai-code">$1</code>')
      .replace(/\n/g, '<br/>')
  );
}

/* ================================
   页面上下文（发送时读取，不落任何存储）
   ================================ */

/** 清洗 document.title：去站名后缀；专用工具页 / 异常标题返回 null。 */
function getPageTitle(): string | null {
  if (typeof document === 'undefined' || typeof window === 'undefined') return null;
  if (window.location.pathname.includes('/tools/ai-assistant')) return null;
  let t = (document.title || '').split('|')[0];
  t = t.replace(/\s*[-–—·]\s*HRT药典\s*$/, '').trim();
  if (!t || t === 'HRT药典' || t.length > 120) return null;
  return t;
}

/** 端点契约：单条消息 ≤ 4096 bytes（api/ai-chat.ts MAX_CONTENT_BYTES）。 */
const MAX_CONTENT_BYTES = 4096;
/** 端点实际只用最近 10 条（>20 条会 400），发送前裁剪。 */
const MAX_SENT_MESSAGES = 10;

/* ================================
   Types
   ================================ */

interface Message {
  role: 'user' | 'assistant';
  /** 展示用文本（用户输入原文 / AI 回复） */
  content: string;
  /** 发给端点的文本（含页面上下文前缀）；未设置时用 content */
  apiContent?: string;
  /** 用户消息命中危机词 → 本地渲染热线卡（不发给端点） */
  crisis?: boolean;
}

interface AIAssistantProps {
  /** Compact mode for floating widget */
  compact?: boolean;
  /** Close callback for floating widget */
  onClose?: () => void;
}

/* =========================================================================
   默认皮肤（米哈游二相乐园）—— class 化基线样式。
   观感与旧 inline-style 版一致；sakura-ai.css 依赖这些 class 钩子换肤。
   ========================================================================= */

const BASE_CSS = `
@keyframes ai-dot-bounce {
  0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
  40% { transform: translateY(-4px); opacity: 1; }
}
.yk-ai {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  padding: 0;
}
.yk-ai--page {
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  border: var(--glass-border);
  clip-path: var(--clip-corner);
  margin-block: var(--space-xl);
}
.yk-ai--compact {
  background: var(--color-bg-container, #1a1625);
  margin-block: 0;
}
.yk-ai-header {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-md) var(--space-lg);
  border-block-end: 1px solid var(--color-outline-20);
  flex-shrink: 0;
}
.yk-ai--compact .yk-ai-header { padding: 10px 14px; }
.yk-ai-header__icon { color: var(--color-accent); display: inline-flex; }
.yk-ai-header__title {
  font-family: var(--font-display);
  font-size: 1rem;
  font-weight: 700;
  color: var(--color-text-primary);
  flex: 1;
}
.yk-ai--compact .yk-ai-header__title { font-size: 0.875rem; }
.yk-ai-header__badge {
  display: inline-block;
  padding: 1px var(--space-sm);
  font-size: 0.6875rem;
  font-family: var(--font-mono);
  color: var(--color-safe);
  border: 1px solid var(--color-safe-alpha-30);
  letter-spacing: 0.05em;
}
.yk-ai-header__close {
  background: none;
  border: none;
  color: var(--color-text-secondary);
  cursor: pointer;
  min-width: 44px;
  min-height: 44px;
  padding: var(--space-xs);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-inline-start: var(--space-xs);
  transition: color var(--transition-fast), background var(--transition-fast);
}
@media (hover: hover) {
  .yk-ai-header__close:hover {
    color: var(--color-primary);
    background: var(--color-primary-alpha-08);
  }
}
.yk-ai-disclaimer {
  padding: 6px 14px;
  background: var(--color-caution-alpha-08);
  border-block-end: 1px solid var(--color-outline-20);
  font-size: 0.6875rem;
  color: var(--color-caution);
  line-height: 1.4;
  font-family: var(--font-body);
  flex-shrink: 0;
}
.yk-ai-log {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-lg);
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}
.yk-ai--compact .yk-ai-log { padding: 10px; }
.yk-ai-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-sm);
  color: var(--color-text-muted);
  text-align: center;
  padding: var(--space-xl);
}
.yk-ai--compact .yk-ai-empty { padding: 10px; }
.yk-ai-empty__icon { color: var(--color-text-muted); opacity: 0.55; display: inline-flex; }
.yk-ai-empty__text {
  font-family: var(--font-body);
  font-size: 0.875rem;
  line-height: 1.6;
}
.yk-ai--compact .yk-ai-empty__text { font-size: 0.8125rem; }
.yk-ai-chips {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-block-start: var(--space-xs);
  width: 100%;
}
.yk-ai-chip {
  background: var(--color-bg-container);
  border: 1px solid var(--color-outline-20);
  color: var(--color-text-secondary);
  padding: 6px 10px;
  font-size: 0.75rem;
  font-family: var(--font-body);
  cursor: pointer;
  text-align: start;
  transition: border-color var(--transition-fast), color var(--transition-fast);
  border-radius: 0;
}
@media (hover: hover) {
  .yk-ai-chip:hover {
    border-color: var(--color-primary);
    color: var(--color-primary-light);
  }
}
.yk-ai-turn { display: flex; flex-direction: column; gap: var(--space-sm); }
.yk-ai-msg {
  max-width: 90%;
  width: fit-content;
  padding: 6px 10px;
  font-family: var(--font-body);
  font-size: 0.875rem;
  color: var(--color-text-primary);
}
.yk-ai--compact .yk-ai-msg { font-size: 0.8125rem; }
.yk-ai-msg--user {
  align-self: flex-end;
  background: var(--color-primary-alpha-15);
  border-inline-start: 3px solid var(--color-primary);
  line-height: 1.6;
  white-space: pre-wrap;
}
.yk-ai-msg--ai {
  align-self: flex-start;
  background: var(--color-white-alpha-03);
  border-inline-start: 3px solid var(--color-accent);
  line-height: 1.7;
}
.yk-ai-msg__label {
  font-size: 0.625rem;
  color: var(--color-text-muted);
  font-family: var(--font-mono);
  letter-spacing: 0.05em;
  text-transform: uppercase;
  margin-block-end: 2px;
}
.yk-ai-hr {
  border: none;
  border-top: 1px solid var(--color-outline-20);
  margin: 0.75em 0;
}
.yk-ai-h { display: block; margin-top: 0.75em; }
.yk-ai-h--2 { font-size: 1.05em; }
.yk-ai-h--3 { font-size: 1em; }
.yk-ai-li { margin-inline-start: 1.2em; }
.yk-ai-li--ul { list-style: disc; }
.yk-ai-li--ol { list-style: decimal; }
.yk-ai-code {
  background: var(--color-white-alpha-08);
  padding: 0.1em 0.3em;
  font-size: 0.85em;
  font-family: var(--font-code);
}
.yk-ai-msg a.yk-ai-linkcard {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-block: 6px;
  padding: 8px 10px;
  background: var(--color-bg-container, #1a1625);
  border: 1px solid var(--color-outline-20);
  border-inline-start: 3px solid var(--color-accent);
  color: var(--color-text-primary);
  text-decoration: none;
  font-size: 0.8125rem;
  transition: border-color var(--transition-fast);
}
@media (hover: hover) {
  .yk-ai-msg a.yk-ai-linkcard:hover { border-color: var(--color-primary); }
}
.yk-ai-msg a.yk-ai-linkcard:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}
.yk-ai-linkcard__icon { display: inline-flex; color: var(--color-accent); flex-shrink: 0; }
.yk-ai-linkcard__label {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.yk-ai-linkcard__arrow { flex-shrink: 0; color: var(--color-text-muted); }
[dir="rtl"] .yk-ai-linkcard__arrow { transform: scaleX(-1); display: inline-block; }
.yk-ai-msg a.yk-ai-extlink {
  color: var(--color-primary-light);
  text-decoration: underline;
  text-underline-offset: 2px;
}
.yk-ai-crisis {
  background: var(--color-danger-dark, #D32F2F);
  border: 1px solid var(--color-danger);
  color: #FFFFFF;
  padding: 10px 12px;
  font-family: var(--font-body);
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.yk-ai-crisis__title { font-weight: 700; font-size: 0.8125rem; color: #FFFFFF; margin: 0; }
.yk-ai-crisis__body { margin: 0; font-size: 0.75rem; line-height: 1.5; color: #FFFFFF; }
.yk-ai-crisis__list { display: flex; flex-direction: column; gap: 4px; }
.yk-ai-crisis__line {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-height: 44px;
  padding: 2px 8px;
  border: 1px solid rgba(255, 255, 255, 0.55);
  color: #FFFFFF;
  text-decoration: underline;
  text-underline-offset: 2px;
}
.yk-ai-crisis__line:focus-visible { outline: 3px solid #FFFFFF; outline-offset: 2px; }
.yk-ai-crisis__name { font-size: 0.75rem; line-height: 1.4; }
.yk-ai-crisis__num {
  font-family: var(--font-mono, monospace);
  font-weight: 700;
  font-size: 0.875rem;
  white-space: nowrap;
}
.yk-ai-crisis__note { margin: 0; font-size: 0.6875rem; line-height: 1.5; color: #FFFFFF; }
.yk-ai-thinking {
  display: flex;
  align-items: center;
  gap: 8px;
  align-self: flex-start;
  padding: 8px 12px;
  background: var(--color-accent-alpha-08);
  border-inline-start: 3px solid var(--color-accent);
  font-size: 0.75rem;
  color: var(--color-accent);
  font-family: var(--font-body);
}
.yk-ai-dots { display: inline-flex; gap: 3px; }
.yk-ai-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--color-accent);
  animation: ai-dot-bounce 1s ease infinite;
}
.yk-ai-dot:nth-child(2) { animation-delay: 0.15s; }
.yk-ai-dot:nth-child(3) { animation-delay: 0.3s; }
.yk-ai-error {
  background: var(--color-danger-alpha-10);
  border-inline-start: 4px solid var(--color-danger);
  padding: 6px 10px;
  color: var(--color-danger);
  font-size: 0.75rem;
  font-family: var(--font-body);
}
.yk-ai-ctx {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-block: 2px;
  padding-inline: 14px 6px;
  background: var(--color-white-alpha-03, rgba(255, 255, 255, 0.03));
  border-block-start: 1px solid var(--color-outline-20);
  font-size: 0.6875rem;
  color: var(--color-text-muted);
  font-family: var(--font-body);
  flex-shrink: 0;
}
.yk-ai-ctx__text {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.yk-ai-ctx__close {
  background: none;
  border: none;
  color: var(--color-text-secondary);
  cursor: pointer;
  min-width: 36px;
  min-height: 36px;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: color var(--transition-fast);
}
@media (hover: hover) {
  .yk-ai-ctx__close:hover { color: var(--color-primary); }
}
.yk-ai-inputrow {
  border-block-start: 1px solid var(--color-outline-20);
  padding: var(--space-md) var(--space-lg);
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}
.yk-ai--compact .yk-ai-inputrow { padding: 8px 10px; }
.yk-ai-input {
  flex: 1;
  min-width: 0;
  padding: 6px 10px;
  background: var(--color-bg-container);
  color: var(--color-text-primary);
  border: none;
  border-block-end: 2px solid var(--color-outline);
  font-family: var(--font-body);
  font-size: 0.875rem;
  outline: none;
  border-radius: 0;
  transition: border-color var(--transition-fast);
}
.yk-ai--compact .yk-ai-input { font-size: 0.8125rem; }
.yk-ai-input:focus { border-block-end-color: var(--color-primary); }
.yk-ai-send {
  padding: 6px 14px;
  background: var(--color-primary);
  color: var(--color-text-on-dark);
  border: none;
  font-family: var(--font-body);
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity var(--transition-fast);
  border-radius: 0;
  white-space: nowrap;
}
.yk-ai--compact .yk-ai-send { font-size: 0.8125rem; }
.yk-ai-send:disabled { opacity: 0.5; cursor: not-allowed; }
@media (prefers-reduced-motion: reduce) {
  .yk-ai-dot { animation: none; }
}
`;

/* ================================
   Component
   ================================ */

export default function AIAssistant({ compact = false, onClose }: AIAssistantProps) {
  const locale = getLocale();
  const ui = AI_COPY[locale];
  const crisisHotlines = useMemo<CrisisHotline[]>(() => getCrisisHotlines(locale), [locale]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /* 页面上下文：标题在挂载后读取（避免 SSR/hydration 不一致），
     关闭状态镜像模块级会话内存变量 */
  const [pageTitle, setPageTitle] = useState<string | null>(null);
  const [ctxOptOut, setCtxOptOut] = useState(pageContextOptOut);
  const messagesAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setPageTitle(getPageTitle());
  }, []);

  const scrollToBottom = useCallback(() => {
    const container = messagesAreaRef.current;
    if (container) {
      requestAnimationFrame(() => {
        container.scrollTop = container.scrollHeight;
      });
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  function dismissContext() {
    pageContextOptOut = true;
    setCtxOptOut(true);
  }

  async function sendMessage(text?: string) {
    const messageText = text ?? input.trim();
    if (!messageText || isLoading) return;

    setError(null);

    /* 页面上下文前缀 —— 拼接后超端点 4096 bytes/条限制则不拼 */
    let apiContent = messageText;
    if (!pageContextOptOut && pageTitle) {
      const prefixed = ui.contextPrefix.replace('{title}', pageTitle) + messageText;
      if (new TextEncoder().encode(prefixed).length <= MAX_CONTENT_BYTES) {
        apiContent = prefixed;
      }
    }

    /* 危机词本地拦截：命中立即渲染热线卡（不等 AI），消息照常发送 */
    const crisis = containsCrisisKeyword(messageText);

    const userMsg: Message = { role: 'user', content: messageText, apiContent, crisis };
    const newMessages = [...messages, userMsg];

    // Immediately show user message + empty assistant placeholder (loading state)
    setMessages([...newMessages, { role: 'assistant', content: '' }]);
    setInput('');
    setIsLoading(true);

    // Phase 12 §1.5: 3 次指数退避重试 — 仅对 fetch 网络错误 / 5xx 且尚未收到首 chunk
    const MAX_ATTEMPTS = 3;
    const BACKOFFS_MS = [500, 1500, 3000];
    let firstChunkReceived = false;
    let lastErr: Error | null = null;

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      try {
        const res = await fetch('/api/ai-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            /* 端点只消费最近 10 条（>20 条直接 400）——发送前裁剪，
               apiContent 优先（含页面上下文前缀），历史重发保持一致 */
            messages: newMessages
              .slice(-MAX_SENT_MESSAGES)
              .map(m => ({ role: m.role, content: m.apiContent ?? m.content })),
          }),
        });

        if (!res.ok) {
          // 429 / 4xx 永不重试（rate limit / 客户端错误）
          if (res.status === 429) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.error || ui.rateLimitError);
          }
          if (res.status >= 400 && res.status < 500) {
            throw new Error(`${ui.serviceUnavailable} (${res.status})`);
          }
          // 5xx 可重试
          lastErr = new Error(`${ui.serviceUnavailable} (${res.status})`);
          if (attempt < MAX_ATTEMPTS - 1) {
            setError(ui.retrying);
            await new Promise(r => setTimeout(r, BACKOFFS_MS[attempt]));
            continue;
          }
          throw lastErr;
        }

        if (!res.body) {
          lastErr = new Error('No response body');
          if (attempt < MAX_ATTEMPTS - 1) {
            setError(ui.retrying);
            await new Promise(r => setTimeout(r, BACKOFFS_MS[attempt]));
            continue;
          }
          throw lastErr;
        }

        // 流读取 — 首 chunk 之后任何中断不再重试（无法 resume）
        setError(null);
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let assistantContent = '';
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            firstChunkReceived = true;
            const chunk = decoder.decode(value, { stream: true });
            assistantContent += chunk;
            setMessages(prev => {
              const updated = [...prev];
              updated[updated.length - 1] = { role: 'assistant', content: assistantContent };
              return updated;
            });
          }
        } catch (streamErr: unknown) {
          // 流中断 — 已经显示了部分内容，告知用户不再重试
          const errMsg = streamErr instanceof Error ? streamErr.message : ui.unknownError;
          setError(`${errMsg}（${ui.streamInterrupted}）`);
          setIsLoading(false);
          inputRef.current?.focus();
          return;
        }

        if (!assistantContent) {
          setMessages(prev => {
            const updated = [...prev];
            updated[updated.length - 1] = {
              role: 'assistant',
              content: ui.emptyResponse,
            };
            return updated;
          });
        }
        // 成功路径 — 跳出 attempt 循环
        setIsLoading(false);
        inputRef.current?.focus();
        return;
      } catch (err: unknown) {
        lastErr = err instanceof Error ? err : new Error(ui.unknownError);
        // 收到首 chunk 后不重试（在 streamErr 分支已处理 return）
        if (firstChunkReceived) break;
        // 4xx / rate-limit 在 throw 前已 break 不会到这（不会被 retry）
        const isRetryable = /fetch|network|5\d\d/i.test(lastErr.message);
        if (isRetryable && attempt < MAX_ATTEMPTS - 1) {
          setError(ui.retrying);
          await new Promise(r => setTimeout(r, BACKOFFS_MS[attempt]));
          continue;
        }
        break;
      }
    }

    // 所有重试都失败 — 友好降级
    const errMsg = lastErr?.message ?? ui.unknownError;
    setError(`${errMsg}（${ui.retryHint}）`);
    setMessages(prev => {
      if (prev[prev.length - 1]?.role === 'assistant' && !prev[prev.length - 1]?.content) {
        return prev.slice(0, -1);
      }
      return prev;
    });
    setIsLoading(false);
    inputRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  const showCtxHint = !ctxOptOut && pageTitle !== null;

  return (
    <div
      className={`yk-ai ${compact ? 'yk-ai--compact' : 'yk-ai--page'}`}
      role="region"
      aria-label={ui.title}
    >
      <style>{BASE_CSS}</style>

      {/* Header */}
      <div className="yk-ai-header">
        <span className="yk-ai-header__icon">
          <AIChatIcon size={18} />
        </span>
        <span className="yk-ai-header__title">{ui.title}</span>
        <span className="yk-ai-header__badge">BETA</span>
        {onClose && (
          <button className="yk-ai-header__close" onClick={onClose} aria-label={ui.close}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>

      {/* Disclaimer —— 只能强化不能弱化 */}
      <div className="yk-ai-disclaimer">{ui.disclaimer}</div>

      {/* Messages — aria-live announces assistant responses to SR as they stream in */}
      <div
        ref={messagesAreaRef}
        className="yk-ai-log"
        role="log"
        aria-live="polite"
        aria-atomic="false"
        aria-relevant="additions text"
      >
        {messages.length === 0 ? (
          <div className="yk-ai-empty">
            <span className="yk-ai-empty__icon">
              <AIChatIcon size={compact ? 28 : 36} />
            </span>
            <div className="yk-ai-empty__text">
              {ui.emptyTitle}<br />
              {ui.emptySubtitle}
            </div>
            {/* 快捷问题 chips —— 一键发送 */}
            <div className="yk-ai-chips">
              {ui.suggestions.map((q, i) => (
                <button key={i} className="yk-ai-chip" onClick={() => sendMessage(q)}>
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div key={i} className="yk-ai-turn">
              {/* User message */}
              {msg.role === 'user' && (
                <div className="yk-ai-msg yk-ai-msg--user">
                  <div className="yk-ai-msg__label">YOU</div>
                  {msg.content}
                </div>
              )}

              {/* 危机热线卡 —— 本地秒级渲染（危险层规范：红底白字，不可爱化）。
                  数据 SSOT: hotlines.json；不可关闭。 */}
              {msg.role === 'user' && msg.crisis && (
                <div className="yk-ai-crisis" role="group" aria-label={ui.crisisTitle}>
                  <p className="yk-ai-crisis__title">{ui.crisisTitle}</p>
                  <p className="yk-ai-crisis__body">{ui.crisisBody}</p>
                  <div className="yk-ai-crisis__list">
                    {crisisHotlines.map(h => (
                      <a key={h.id} className="yk-ai-crisis__line" href={h.href}>
                        <span className="yk-ai-crisis__name">{h.name}</span>
                        <span className="yk-ai-crisis__num">{h.number}</span>
                      </a>
                    ))}
                  </div>
                  <p className="yk-ai-crisis__note">{ui.crisisOutside}</p>
                </div>
              )}

              {/* Assistant message */}
              {msg.role === 'assistant' && (
                msg.content ? (
                  <div className="yk-ai-msg yk-ai-msg--ai">
                    <div className="yk-ai-msg__label">AI ASSISTANT</div>
                    <div dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }} />
                  </div>
                ) : (
                  /* Thinking indicator — shown immediately after user sends */
                  <div className="yk-ai-thinking">
                    <span className="yk-ai-dots">
                      <span className="yk-ai-dot" />
                      <span className="yk-ai-dot" />
                      <span className="yk-ai-dot" />
                    </span>
                    {ui.thinking}
                  </div>
                )
              )}
            </div>
          ))
        )}

        {error && (
          <div className="yk-ai-error">
            {ui.errorPrefix}{error}
          </div>
        )}
      </div>

      {/* 页面上下文提示条 —— × 关闭后本次会话不再附带（仅内存，不落存储） */}
      {showCtxHint && (
        <div className="yk-ai-ctx">
          <span className="yk-ai-ctx__text">{ui.contextHint}</span>
          <button className="yk-ai-ctx__close" onClick={dismissContext} aria-label={ui.contextDismiss}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      )}

      {/* Input */}
      <div className="yk-ai-inputrow">
        <input
          ref={inputRef}
          className="yk-ai-input"
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={ui.inputPlaceholder}
          disabled={isLoading}
          maxLength={1300}
          aria-label={ui.inputLabel}
        />
        <button
          className="yk-ai-send"
          onClick={() => sendMessage()}
          disabled={isLoading || !input.trim()}
          aria-label={ui.sendLabel}
        >
          {isLoading ? ui.loading : ui.send}
        </button>
      </div>
    </div>
  );
}
