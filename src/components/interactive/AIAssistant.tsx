import { useState, useRef, useEffect, useCallback } from 'react';
import type { CSSProperties } from 'react';

/* ================================
   Simple Markdown Renderer
   ================================ */

function renderMarkdown(text: string): string {
  return text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/^---$/gm, '<hr style="border:none;border-top:1px solid var(--color-outline-20);margin:0.75em 0"/>')
    .replace(/^### (.+)$/gm, '<strong style="font-size:1em;display:block;margin-top:0.75em">$1</strong>')
    .replace(/^## (.+)$/gm, '<strong style="font-size:1.05em;display:block;margin-top:0.75em">$1</strong>')
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^[*\-] (.+)$/gm, '<li style="margin-left:1.2em;list-style:disc">$1</li>')
    .replace(/^\d+\.\s(.+)$/gm, '<li style="margin-left:1.2em;list-style:decimal">$1</li>')
    .replace(/`([^`]+)`/g, '<code style="background:rgba(255,255,255,0.08);padding:0.1em 0.3em;font-size:0.85em;font-family:var(--font-mono)">$1</code>')
    .replace(/\n/g, '<br/>');
}

/* ================================
   Types
   ================================ */

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface AIAssistantProps {
  /** Compact mode for floating widget */
  compact?: boolean;
  /** Close callback for floating widget */
  onClose?: () => void;
}

/* ================================
   Styles
   ================================ */

function getStyles(compact: boolean): Record<string, CSSProperties> {
  return {
    container: {
      background: compact ? 'var(--color-bg-container, #1a1625)' : 'var(--glass-bg)',
      backdropFilter: compact ? 'none' : 'var(--glass-blur)',
      WebkitBackdropFilter: compact ? 'none' : 'var(--glass-blur)',
      border: compact ? 'none' : 'var(--glass-border)',
      clipPath: compact ? 'none' : 'var(--clip-corner)',
      padding: 0,
      marginBlock: compact ? 0 : 'var(--space-xl)',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      overflow: 'hidden',
    },
    header: {
      padding: compact ? '10px 14px' : 'var(--space-md) var(--space-lg)',
      borderBottom: '1px solid var(--color-outline-20)',
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-sm)',
      flexShrink: 0,
    },
    headerIcon: {
      color: 'var(--color-accent)',
      display: 'inline-flex',
    },
    headerTitle: {
      fontFamily: 'var(--font-display)',
      fontSize: compact ? '0.875rem' : '1rem',
      fontWeight: 700,
      color: 'var(--color-text-primary)',
      flex: 1,
    },
    headerBadge: {
      display: 'inline-block',
      padding: '1px var(--space-sm)',
      fontSize: '0.6875rem',
      fontFamily: 'var(--font-mono)',
      color: 'var(--color-safe)',
      border: '1px solid rgba(76, 175, 80, 0.3)',
      letterSpacing: '0.05em',
    },
    disclaimer: {
      padding: '6px 14px',
      background: 'rgba(255, 152, 0, 0.08)',
      borderBottom: '1px solid var(--color-outline-20)',
      fontSize: '0.6875rem',
      color: 'var(--color-caution)',
      lineHeight: 1.4,
      fontFamily: 'var(--font-body)',
      flexShrink: 0,
    },
    messagesArea: {
      flex: 1,
      overflowY: 'auto' as const,
      padding: compact ? '10px' : 'var(--space-lg)',
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-sm)',
    },
    emptyState: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 'var(--space-sm)',
      color: 'var(--color-text-muted)',
      textAlign: 'center' as const,
      padding: compact ? '10px' : 'var(--space-xl)',
    },
    emptyIcon: {
      fontSize: compact ? '1.5rem' : '2rem',
      opacity: 0.5,
    },
    emptyText: {
      fontFamily: 'var(--font-body)',
      fontSize: compact ? '0.8125rem' : '0.875rem',
      lineHeight: 1.6,
    },
    suggestionsGrid: {
      display: 'flex',
      flexDirection: 'column',
      gap: '6px',
      marginTop: 'var(--space-xs)',
      width: '100%',
    },
    suggestionBtn: {
      background: 'var(--color-bg-container)',
      border: '1px solid var(--color-outline-20)',
      color: 'var(--color-text-secondary)',
      padding: '6px 10px',
      fontSize: '0.75rem',
      fontFamily: 'var(--font-body)',
      cursor: 'pointer',
      textAlign: 'left' as const,
      transition: 'border-color 0.15s, color 0.15s',
      borderRadius: 0,
    },
    msgUser: {
      alignSelf: 'flex-end',
      background: 'rgba(200, 75, 124, 0.15)',
      borderLeft: '3px solid var(--color-primary)',
      padding: '6px 10px',
      maxWidth: '90%',
      fontFamily: 'var(--font-body)',
      fontSize: compact ? '0.8125rem' : '0.875rem',
      lineHeight: 1.6,
      color: 'var(--color-text-primary)',
      whiteSpace: 'pre-wrap' as const,
    },
    msgAssistant: {
      alignSelf: 'flex-start',
      background: 'rgba(255,255,255,0.03)',
      borderLeft: '3px solid var(--color-accent)',
      padding: '6px 10px',
      maxWidth: '90%',
      fontFamily: 'var(--font-body)',
      fontSize: compact ? '0.8125rem' : '0.875rem',
      lineHeight: 1.7,
      color: 'var(--color-text-primary)',
    },
    msgLabel: {
      fontSize: '0.625rem',
      color: 'var(--color-text-muted)',
      fontFamily: 'var(--font-mono)',
      letterSpacing: '0.05em',
      textTransform: 'uppercase' as const,
      marginBottom: '2px',
    },
    inputArea: {
      borderTop: '1px solid var(--color-outline-20)',
      padding: compact ? '8px 10px' : 'var(--space-md) var(--space-lg)',
      display: 'flex',
      gap: '6px',
      flexShrink: 0,
    },
    textInput: {
      flex: 1,
      padding: '6px 10px',
      background: 'var(--color-bg-container)',
      color: 'var(--color-text-primary)',
      border: 'none',
      borderBottom: '2px solid var(--color-outline)',
      fontFamily: 'var(--font-body)',
      fontSize: compact ? '0.8125rem' : '0.875rem',
      outline: 'none',
      borderRadius: 0,
      transition: 'border-color 0.15s',
    },
    sendBtn: {
      padding: '6px 14px',
      background: 'var(--color-primary)',
      color: '#FFFFFF',
      border: 'none',
      fontFamily: 'var(--font-body)',
      fontSize: compact ? '0.8125rem' : '0.875rem',
      fontWeight: 600,
      cursor: 'pointer',
      transition: 'opacity 0.15s',
      borderRadius: 0,
      whiteSpace: 'nowrap' as const,
    },
    sendBtnDisabled: {
      opacity: 0.5,
      cursor: 'not-allowed',
    },
    thinkingBar: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      alignSelf: 'flex-start',
      padding: '8px 12px',
      background: 'rgba(212, 168, 83, 0.08)',
      borderLeft: '3px solid var(--color-accent)',
      fontSize: '0.75rem',
      color: 'var(--color-accent)',
      fontFamily: 'var(--font-body)',
    },
    dotContainer: {
      display: 'inline-flex',
      gap: '3px',
    },
    dot: {
      width: '5px',
      height: '5px',
      borderRadius: '50%',
      background: 'var(--color-accent)',
    },
    errorBox: {
      background: 'rgba(244, 67, 54, 0.1)',
      borderLeft: '4px solid var(--color-danger)',
      padding: '6px 10px',
      color: 'var(--color-danger)',
      fontSize: '0.75rem',
      fontFamily: 'var(--font-body)',
    },
  };
}

const SUGGESTIONS = [
  '雌二醇口服和舌下含服有什么区别？',
  '螺内酯的常见副作用有哪些？',
  '血检应该什么时候抽血？',
  'HRT 前需要做哪些检查？',
];

/* ================================
   Component
   ================================ */

export default function AIAssistant({ compact = false, onClose }: AIAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const s = getStyles(compact);

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

  async function sendMessage(text?: string) {
    const messageText = text ?? input.trim();
    if (!messageText || isLoading) return;

    setError(null);
    const userMsg: Message = { role: 'user', content: messageText };
    const newMessages = [...messages, userMsg];

    // Immediately show user message + empty assistant placeholder (loading state)
    setMessages([...newMessages, { role: 'assistant', content: '' }]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
        }),
      });

      if (!res.ok) {
        if (res.status === 429) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || '请求过于频繁，请稍后再试');
        }
        throw new Error(`服务暂时不可用 (${res.status})`);
      }

      if (!res.body) {
        throw new Error('No response body');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let assistantContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        assistantContent += chunk;
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: 'assistant', content: assistantContent };
          return updated;
        });
      }

      if (!assistantContent) {
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: 'assistant',
            content: '抱歉，无法获取回复。请稍后重试。',
          };
          return updated;
        });
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : '未知错误';
      setError(errMsg);
      // Remove the empty assistant placeholder on error
      setMessages(prev => {
        if (prev[prev.length - 1]?.role === 'assistant' && !prev[prev.length - 1]?.content) {
          return prev.slice(0, -1);
        }
        return prev;
      });
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <div style={s.container} role="region" aria-label="AI 问答助手">
      {/* Inline keyframes */}
      <style>{`
        @keyframes ai-dot-bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40% { transform: translateY(-4px); opacity: 1; }
        }
      `}</style>

      {/* Header */}
      <div style={s.header}>
        <span style={s.headerIcon}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </span>
        <span style={s.headerTitle}>AI 问答助手</span>
        <span style={s.headerBadge}>BETA</span>
        {onClose && (
          <button
            onClick={onClose}
            aria-label="关闭"
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-text-muted)',
              cursor: 'pointer',
              padding: '4px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginLeft: '4px',
              transition: 'color 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-primary)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-text-muted)'; }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>

      {/* Disclaimer */}
      <div style={s.disclaimer}>
        ⚠ 仅基于医学文献，不构成个人化医疗建议。对话不存储。紧急情况请拨 120。
      </div>

      {/* Messages */}
      <div ref={messagesAreaRef} style={s.messagesArea}>
        {messages.length === 0 ? (
          <div style={s.emptyState}>
            <div style={s.emptyIcon} aria-hidden="true">💊</div>
            <div style={s.emptyText}>
              基于循证医学文献的 AI 问答<br />
              你可以问任何关于 HRT 的安全问题
            </div>
            <div style={s.suggestionsGrid}>
              {SUGGESTIONS.map((q, i) => (
                <button
                  key={i}
                  style={s.suggestionBtn}
                  onClick={() => sendMessage(q)}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = 'var(--color-primary)';
                    e.currentTarget.style.color = 'var(--color-primary-light)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = 'var(--color-outline-20)';
                    e.currentTarget.style.color = 'var(--color-text-secondary)';
                  }}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div key={i}>
              {/* User message */}
              {msg.role === 'user' && (
                <div style={s.msgUser}>
                  <div style={s.msgLabel}>YOU</div>
                  {msg.content}
                </div>
              )}

              {/* Assistant message */}
              {msg.role === 'assistant' && (
                msg.content ? (
                  <div style={s.msgAssistant}>
                    <div style={s.msgLabel}>AI ASSISTANT</div>
                    <div dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }} />
                  </div>
                ) : (
                  /* Thinking indicator — shown immediately after user sends */
                  <div style={s.thinkingBar}>
                    <span style={s.dotContainer}>
                      <span style={{ ...s.dot, animation: 'ai-dot-bounce 1s ease infinite' }} />
                      <span style={{ ...s.dot, animation: 'ai-dot-bounce 1s ease 0.15s infinite' }} />
                      <span style={{ ...s.dot, animation: 'ai-dot-bounce 1s ease 0.3s infinite' }} />
                    </span>
                    正在思考...
                  </div>
                )
              )}
            </div>
          ))
        )}

        {error && (
          <div style={s.errorBox}>
            连接失败：{error}
          </div>
        )}
      </div>

      {/* Input */}
      <div style={s.inputArea}>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="输入你的问题..."
          style={s.textInput}
          disabled={isLoading}
          onFocus={e => { e.currentTarget.style.borderBottomColor = 'var(--color-primary)'; }}
          onBlur={e => { e.currentTarget.style.borderBottomColor = 'var(--color-outline)'; }}
          aria-label="输入问题"
        />
        <button
          onClick={() => sendMessage()}
          disabled={isLoading || !input.trim()}
          style={{
            ...s.sendBtn,
            ...(isLoading || !input.trim() ? s.sendBtnDisabled : {}),
          }}
          aria-label="发送"
        >
          {isLoading ? '思考中...' : '发送'}
        </button>
      </div>
    </div>
  );
}
