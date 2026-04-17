import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { CSSProperties } from 'react';
import AIAssistant from './AIAssistant';

/* ================================
   Floating AI Chat Widget
   Rendered via Portal to document.body
   to escape all Starlight stacking contexts
   ================================ */

const styles: Record<string, CSSProperties> = {
  fab: {
    position: 'fixed',
    bottom: '24px',
    right: '24px',
    width: '52px',
    height: '52px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))',
    color: 'var(--color-text-on-dark, #FFFFFF)',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 20px var(--color-primary-alpha-40)',
    transition: 'transform var(--transition-fast), box-shadow var(--transition-fast)',
    zIndex: 99999,
  },
  panel: {
    position: 'fixed',
    bottom: '88px',
    right: '24px',
    width: '380px',
    height: '520px',
    maxHeight: 'calc(100vh - 120px)',
    maxWidth: 'calc(100vw - 32px)',
    borderRadius: '12px',
    overflow: 'hidden',
    boxShadow: '0 8px 40px var(--color-black-alpha-50), 0 0 0 1px var(--color-white-alpha-06)',
    zIndex: 99999,
    display: 'flex',
    flexDirection: 'column',
    animation: 'ai-panel-in 0.25s ease-out',
  },
  panelClosing: {
    animation: 'ai-panel-out 0.2s ease-in forwards',
  },
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'var(--color-black-alpha-40)',
    zIndex: 99998,
  },
};

function FloatingAIChatInner() {
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

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

  // Don't render on the AI assistant dedicated page
  if (typeof window !== 'undefined' && window.location.pathname.includes('/tools/ai-assistant')) {
    return null;
  }

  return (
    <>
      <style>{`
        @keyframes ai-panel-in {
          from { opacity: 0; transform: translateY(12px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes ai-panel-out {
          from { opacity: 1; transform: translateY(0) scale(1); }
          to { opacity: 0; transform: translateY(12px) scale(0.96); }
        }
      `}</style>

      {/* Floating Action Button */}
      {!isOpen && (
        <button
          onClick={handleOpen}
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
          style={{
            ...styles.fab,
            ...(isHovering ? { transform: 'scale(1.08)', boxShadow: '0 6px 28px var(--color-primary-alpha-60)' } : {}),
          }}
          aria-label="打开 AI 问答助手"
          title="AI 问答助手"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </button>
      )}

      {/* Chat Panel */}
      {isOpen && (
        <>
          {isMobile && <div style={styles.overlay} onClick={handleClose} />}

          <div
            style={{
              ...styles.panel,
              ...(isClosing ? styles.panelClosing : {}),
              ...(isMobile ? {
                bottom: '16px',
                right: '16px',
                left: '16px',
                width: 'auto',
                height: 'calc(100vh - 100px)',
              } : {}),
            }}
          >
            <AIAssistant compact onClose={handleClose} />
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
