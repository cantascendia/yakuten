import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { createPortal } from 'react-dom';
import { AIChatIcon } from './AIChatIcon';
import { getLocale, AI_COPY } from './aiChatL10n';

/* 聊天主体按需加载：FAB 挂全站（client:idle），若静态 import 会把整个
   chat 应用（组件+17 语字典+存储层）预载进每个页面。点击打开时再拉。 */
const AIAssistantLazy = lazy(() => import('./AIAssistant'));

/* ================================
   Floating AI Chat Widget
   Rendered via Portal to document.body
   to escape all Starlight stacking contexts

   双态皮肤：默认（米哈游）样式在下方 BASE_CSS（class 化基线，观感与旧
   inline 版一致）；sakura（乐园手账：白纸圆贴纸 FAB + 纸卡浮窗）覆盖层
   在 src/styles/sakura-ai.css（html.sakura 作用域）。
   ================================ */

const BASE_CSS = `
@keyframes ai-panel-in {
  from { opacity: 0; transform: translateY(12px) scale(0.96); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes ai-panel-out {
  from { opacity: 1; transform: translateY(0) scale(1); }
  to { opacity: 0; transform: translateY(12px) scale(0.96); }
}
.yk-ai-fab {
  position: fixed;
  /* Respect iOS safe-area-inset-bottom (home indicator on iPhone X+).
     Falls back to 24px on browsers without env() support. */
  inset-block-end: max(24px, calc(env(safe-area-inset-bottom, 0px) + 16px));
  inset-inline-end: max(24px, env(safe-area-inset-right, 24px));
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--color-primary), var(--color-primary-dark));
  color: var(--color-text-on-dark, #FFFFFF);
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 20px var(--color-primary-alpha-40);
  transition: transform var(--transition-fast), box-shadow var(--transition-fast);
  z-index: 99999;
}
@media (hover: hover) {
  .yk-ai-fab:hover {
    transform: scale(1.08);
    box-shadow: 0 6px 28px var(--color-primary-alpha-60);
  }
}
.yk-ai-fab:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 3px;
}
.yk-ai-panel {
  position: fixed;
  inset-block-end: 88px;
  inset-inline-end: 24px;
  width: 380px;
  height: 520px;
  max-height: calc(100vh - 120px);
  max-width: calc(100vw - 32px);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 8px 40px var(--color-black-alpha-50), 0 0 0 1px var(--color-white-alpha-06);
  z-index: 99999;
  display: flex;
  flex-direction: column;
  animation: ai-panel-in 0.25s ease-out;
}
.yk-ai-panel--closing {
  animation: ai-panel-out 0.2s ease-in forwards;
}
.yk-ai-panel--mobile {
  inset-block-end: 16px;
  inset-inline: 16px;
  width: auto;
  height: calc(100vh - 100px);
}
.yk-ai-overlay {
  position: fixed;
  inset: 0;
  background: var(--color-black-alpha-40);
  z-index: 99998;
}
/* WCAG 2.3.3 — collapse motion to opacity-only for reduced-motion users */
@media (prefers-reduced-motion: reduce) {
  @keyframes ai-panel-in { from { opacity: 0; } to { opacity: 1; } }
  @keyframes ai-panel-out { from { opacity: 1; } to { opacity: 0; } }
  .yk-ai-fab { transition: none; }
  .yk-ai-fab:hover { transform: none; }
}
`;

function FloatingAIChatInner() {
  const locale = getLocale();
  const ui = AI_COPY[locale];
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const fabRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  function handleOpen() {
    setIsOpen(true);
    setIsClosing(false);
  }

  function handleClose() {
    setIsClosing(true);
    setTimeout(() => {
      setIsOpen(false);
      setIsClosing(false);
    }, 200);
  }

  // Return focus to FAB on close (WCAG 2.4.3 Focus Order)。
  // 注：FAB 在浮窗打开期间是卸载的（{!isOpen && ...}），关闭回调里
  // fabRef.current 恒为 null —— 必须等重挂后在 effect 里聚焦。
  const wasOpenRef = useRef(false);
  useEffect(() => {
    if (isOpen) {
      wasOpenRef.current = true;
      return;
    }
    if (wasOpenRef.current) {
      wasOpenRef.current = false;
      fabRef.current?.focus();
    }
  }, [isOpen]);

  // Escape key closes the panel (WCAG 2.1.2 No Keyboard Trap)
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleClose();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen]);

  // Move focus into panel when it opens (WCAG 2.4.3)
  useEffect(() => {
    if (!isOpen || !panelRef.current) return;
    const first = panelRef.current.querySelector<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    first?.focus();
  }, [isOpen]);

  // Don't render on the AI assistant dedicated page
  if (typeof window !== 'undefined' && window.location.pathname.includes('/tools/ai-assistant')) {
    return null;
  }

  return (
    <>
      <style>{BASE_CSS}</style>

      {/* Floating Action Button —— 手账贴纸风图标（对话气泡 + 樱瓣） */}
      {!isOpen && (
        <button
          ref={fabRef}
          className="yk-ai-fab"
          onClick={handleOpen}
          aria-label={ui.fabOpen}
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          title={ui.title}
        >
          <AIChatIcon size={26} />
        </button>
      )}

      {/* Chat Panel */}
      {isOpen && (
        <>
          {isMobile && <div className="yk-ai-overlay" onClick={handleClose} />}

          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={ui.title}
            className={[
              'yk-ai-panel',
              isClosing ? 'yk-ai-panel--closing' : '',
              isMobile ? 'yk-ai-panel--mobile' : '',
            ].filter(Boolean).join(' ')}
          >
            <Suspense fallback={null}>
              <AIAssistantLazy compact onClose={handleClose} />
            </Suspense>
          </div>
        </>
      )}
    </>
  );
}

/* Portal wrapper — renders to document.body to escape stacking contexts */
export default function FloatingAIChat() {
  const [mounted, setMounted] = useState(false);
  const portalRoot = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const div = document.createElement('div');
    div.id = 'floating-ai-root';
    document.body.appendChild(div);
    portalRoot.current = div;
    setMounted(true);
    return () => {
      document.body.removeChild(div);
    };
  }, []);

  if (!mounted || !portalRoot.current) return null;

  return createPortal(<FloatingAIChatInner />, portalRoot.current);
}
