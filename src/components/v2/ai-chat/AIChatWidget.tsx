/**
 * AIChatWidget — 浮动 AI 助手问答（FAB + 对话面板，合并为单岛）
 * 移植自 design_files/ui_kits/yakuten/ai-chat.jsx (117 行)
 *
 * ── 为什么 AIChat 与 AIChatFab 合并成一个组件 ──────────────────────────
 * 原型里两者是兄弟组件，靠 index.html 的 App 持有 chatOpen state 联系。
 * MPA 下没有 App 根组件 → 两个独立岛无法共享 state → 必须合并。
 *
 * ── 后端 ───────────────────────────────────────────────────────────────
 * 原型用 window.claude.complete（原型宿主注入，真站不存在）。
 * 改接仓库既有的 /api/ai-chat（Vercel Edge，Gemini 流式）。
 * api/ 是 forbidden 路径（CONSTITUTION §4，改动需 spec + 双签）→ 本文件只做
 * 前端对接，【不碰】该端点一个字节。
 *
 * 实测端点契约（api/ai-chat.ts）：
 *   · 仅 POST，body = { messages: [{role:'user'|'assistant', content:string}] }
 *   · 成功 → 流式【纯文本】(text/plain)，不是 SSE、不是 JSON
 *   · 失败 → JSON { error }，状态码 403/429/500/503
 *   · MAX_MESSAGES=20 / MAX_CONTENT_BYTES=4096 / RATE_LIMIT=5 次每分钟
 *   · 系统提示【硬编码在服务端】，含急症→120 引导、禁个性化剂量、禁购药渠道、
 *     强制免责声明 —— 与原型 YK_AI_SYSTEM 的安全规则同源且更严格
 *
 * ── AI 助手人设：为什么不注入 YK_AI_SYSTEM ─────────────────────────────
 * 原型把人设提示词拼进单条 prompt。改接真实端点后，唯一的注入点是首轮 user
 * 消息 —— 刻意【不做】：
 *   · 那等于往一个我们无权修改、无法测试的【医疗安全端点】里注入第二套安全指令。
 *     两套规则从不同强度的通道（system vs user）下达，措辞一旦分歧，模型行为未定义。
 *     而它们【已经分歧】：YK_AI_SYSTEM 说「150 字以内」，服务端说「200-400 字」。
 *     这类分歧若出现在剂量/急症措辞上就是安全事故。
 *   · 服务端 SYSTEM_PROMPT 已含功能等价且更严格的规则（禁个性化剂量、急症列举
 *     + 120 + 热线号码、禁购药渠道、语气「温和、专业、不居高临下」）。
 * → 保留 AI 助手的可见人格（中性化后）（头像 / 欢迎语 / 思考态 / 免责 / 视觉）逐字不变，
 *   模型腔调交由服务端既有 prompt。这正是 DESIGN_SYSTEM 第一原则
 *   「可爱属于容器，严肃属于内容」。
 *   给端点加白名单 persona 参数是正解，但须走 §4 spec + 双签 → 另开 PR。
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import { Icon } from '../Primitives';

/* 端点契约常量 —— 与 api/ai-chat.ts 保持同步（只读，不改服务端） */
const MAX_MESSAGES = 20;
const MAX_CONTENT_BYTES = 4096;
const MAX_ATTEMPTS = 3;
const BACKOFFS_MS = [500, 1500];

interface Msg {
  role: 'user' | 'assistant';
  text: string;
}

const WELCOME: Msg = {
  role: 'assistant',
  text: '你好，我是 AI 助手 ✿ 可以问我关于 HRT 的一般性问题。我不能替代医生，也不会给出个性化剂量哦。',
};

/**
 * 极简 Markdown 渲染。
 *
 * 【必须有】：服务端 SYSTEM_PROMPT 明确要求「善用 Markdown 加粗和列表」并以
 * `---` + 斜体免责声明收尾。原型 ai-chat.jsx:76 直接 {m.text} 纯文本渲染 ——
 * 直接移植会让用户看到字面量的 **粗体** 和 --- 。
 *
 * 【为什么不复用 AIAssistant.tsx:128 的同名函数】：那份用的是米哈游主题的令牌
 * （--color-outline-20 / --color-white-alpha-08 / --font-code），在 v2 设计系统里
 * 不存在 → 会渲染出无样式元素。此处改用 v2 令牌。
 *
 * XSS：先转义 & < > 再解析，与 AIAssistant 同策略。输入仅来自我们自己的端点。
 */
function renderMarkdown(text: string): string {
  return text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/^---$/gm, '<hr style="border:none;border-top:1px solid var(--ink-faint);margin:0.6em 0"/>')
    .replace(/^### (.+)$/gm, '<strong style="display:block;margin-top:0.6em">$1</strong>')
    .replace(/^## (.+)$/gm, '<strong style="display:block;margin-top:0.6em">$1</strong>')
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^[*\-] (.+)$/gm, '<li style="margin-left:1.1em;list-style:disc">$1</li>')
    .replace(/^\d+\.\s(.+)$/gm, '<li style="margin-left:1.1em;list-style:decimal">$1</li>')
    .replace(/`([^`]+)`/g, '<code style="font-family:var(--font-hud);font-size:0.85em">$1</code>')
    .replace(/\n/g, '<br/>');
}

const byteLen = (s: string) => new TextEncoder().encode(s).length;

export default function AIChatWidget() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([WELCOME]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const listRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const fabRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  /* ToolsScreen 是零 JS 静态屏，无法直接调本岛的 setState。
     它把「AI 问答助手」横幅渲染成 <button data-yk-open-chat>，此处用事件委托接住。 */
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null;
      if (t?.closest('[data-yk-open-chat]')) setOpen(true);
    };
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, []);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [msgs, open]);

  const close = useCallback(() => {
    setOpen(false);
    fabRef.current?.focus(); /* WCAG 2.4.3：关闭后焦点归还触发元素 */
  }, []);

  /* a11y：原型只有 role="dialog" + aria-label，缺 Esc / 焦点陷阱 / 打开移焦。
     仓库既有的 FloatingAIChat.tsx 已确立这条基线（且 tests/mobile-a11y.spec.ts
     对其做了回归断言）→ v2 必须达到同一条线。 */
  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        close();
        return;
      }
      /* 焦点陷阱：aria-modal="true" 承诺了模态语义，不实现陷阱是比不加更糟的谎报 */
      if (e.key !== 'Tab' || !panelRef.current) return;
      const f = panelRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
      );
      if (!f.length) return;
      const first = f[0];
      const last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, close]);

  const send = async () => {
    const q = input.trim();
    if (!q || busy) return;
    if (byteLen(q) > MAX_CONTENT_BYTES) {
      setError('这条太长了 —— 分成几句问我吧 ✿');
      return;
    }
    setInput('');
    setError(null);
    const next: Msg[] = [...msgs, { role: 'user', text: q }];
    setMsgs([...next, { role: 'assistant', text: '' }]);
    setBusy(true);

    /* 服务端 MAX_MESSAGES=20，超了直接 400 → 发送前截断。
       首条欢迎语是本地 UI 文案，不必送模型。 */
    const payload = next
      .filter((m) => m !== WELCOME)
      .slice(-MAX_MESSAGES)
      .map((m) => ({ role: m.role, content: m.text }));

    let firstChunk = false;
    let lastErr: Error | null = null;

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      try {
        const res = await fetch('/api/ai-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: payload }),
        });

        if (!res.ok) {
          /* 429 = 限流（5 次/分钟），4xx = 客户端错误 → 永不重试 */
          if (res.status === 429) {
            const d = await res.json().catch(() => ({} as { error?: string }));
            throw new Error(d.error || '问得有点快 —— 请稍等，一分钟后再问吧 ✿');
          }
          if (res.status >= 400 && res.status < 500) {
            throw new Error(`助手暂时没法回答（${res.status}）`);
          }
          lastErr = new Error(`助手暂时没法回答（${res.status}）`);
          if (attempt < MAX_ATTEMPTS - 1) {
            await new Promise((r) => setTimeout(r, BACKOFFS_MS[attempt]));
            continue;
          }
          throw lastErr;
        }
        if (!res.body) throw new Error('没有收到回复内容');

        /* 成功是【流式纯文本】，不是 SSE、不要 JSON.parse */
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let acc = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          firstChunk = true;
          acc += decoder.decode(value, { stream: true });
          setMsgs((prev) => {
            const u = [...prev];
            u[u.length - 1] = { role: 'assistant', text: acc };
            return u;
          });
        }
        setBusy(false);
        return;
      } catch (e) {
        lastErr = e instanceof Error ? e : new Error('未知错误');
        /* 首 chunk 之后中断不可重试（流无法 resume） */
        if (firstChunk) break;
        if (attempt < MAX_ATTEMPTS - 1 && !/\d{3}/.test(lastErr.message)) {
          await new Promise((r) => setTimeout(r, BACKOFFS_MS[attempt]));
          continue;
        }
        break;
      }
    }

    setMsgs((prev) => {
      const u = [...prev];
      if (u[u.length - 1]?.role === 'assistant' && !u[u.length - 1].text) u.pop();
      return u;
    });
    setError(lastErr?.message || '呜……连接出了点问题，稍后再试试？');
    setBusy(false);
  };

  return (
    <>
      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-label="AI 问答助手"
          aria-busy={busy}
          className="yk-paper"
          data-paper="true"
          style={{
            position: 'fixed', right: 20, bottom: 86, zIndex: 'var(--z-overlay)' as unknown as number,
            width: 'min(360px, calc(100vw - 40px))',
            background: 'var(--ivory)', border: '2px solid var(--ink)',
            borderRadius: 16, boxShadow: '6px 6px 0 var(--ink)',
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
          }}
        >
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
            background: 'var(--butter)', borderBottom: '2px solid var(--ink)',
          }}>
            <Icon name="sparkles" size={22} color="var(--ink)" />
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 15, color: 'var(--ink)', flex: 1 }}>
              AI 问答助手 · BETA
            </span>
            {/* 视觉保持 28px 圆钮（1:1），但 44×44 透明命中区满足 WCAG 2.5.8 */}
            <button
              type="button"
              onClick={close}
              aria-label="关闭"
              style={{
                width: 28, height: 28, minWidth: 44, minHeight: 44,
                borderRadius: 999, cursor: 'pointer',
                background: 'var(--ivory)', border: '2px solid var(--ink)',
                fontFamily: 'var(--font-ui-accent)', fontWeight: 700, lineHeight: 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: 0,
              }}
            >✕</button>
          </div>

          {/* 流式回复必须对读屏可感知 —— 原型缺 live region */}
          <div
            ref={listRef}
            role="log"
            aria-live="polite"
            aria-relevant="additions text"
            style={{
              height: 280, overflowY: 'auto', padding: 14,
              display: 'flex', flexDirection: 'column', gap: 10, background: 'var(--cream)',
            }}
          >
            {msgs.map((m, i) => (
              <div
                key={i}
                style={{
                  alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '85%',
                  padding: '8px 13px', borderRadius: 14,
                  /* AA：原型用户气泡是 #fff on --sakura-pink = 1.80:1（不可读）
                     → --sakura-pink-aa 白字 5.39:1 */
                  background: m.role === 'user' ? 'var(--sakura-pink-aa)' : 'var(--ivory)',
                  color: m.role === 'user' ? '#fff' : 'var(--fg-1)',
                  border: '2px solid var(--ink)',
                  fontSize: 13, lineHeight: 1.65,
                  boxShadow: '2px 2px 0 var(--ink)',
                }}
              >
                {m.role === 'assistant'
                  ? <span dangerouslySetInnerHTML={{ __html: renderMarkdown(m.text) }} />
                  : m.text}
              </div>
            ))}
            {busy && (
              <div style={{ alignSelf: 'flex-start', fontFamily: 'var(--font-hand)', fontSize: 15, color: 'var(--fg-2)' }}>
                思考中…✿
              </div>
            )}
            {error && (
              <div role="alert" style={{
                alignSelf: 'flex-start', maxWidth: '85%',
                padding: '8px 13px', borderRadius: 14,
                background: 'var(--ink)', color: 'var(--cream)',
                border: '2px solid var(--danger)', fontSize: 13, lineHeight: 1.6,
              }}>{error}</div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 8, padding: 12, borderTop: '2px solid var(--ink)', background: 'var(--ivory)' }}>
            <input
              ref={inputRef}
              className="yk-input"
              value={input}
              aria-label="向 AI 助手提问"
              placeholder="例如：贴片和口服哪个更安全？"
              style={{ fontFamily: 'var(--font-body)', fontWeight: 500, fontSize: 13 }}
              onChange={(e) => setInput(e.target.value)}
              /* 原型漏了 shiftKey 判断 → Shift+Enter 也会发送 */
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send(); } }}
            />
            <button
              type="button"
              onClick={() => void send()}
              disabled={busy}
              className="btn-flame"
              style={{ minHeight: 44, padding: '8px 18px', fontSize: 13 }}
            >发送</button>
          </div>

          <div style={{ padding: '6px 12px 10px', fontSize: 10.5, color: 'var(--fg-2)', background: 'var(--ivory)', lineHeight: 1.5 }}>
            回答仅供参考，不构成医疗建议。本站不存储对话；回答由第三方 AI 服务生成，请勿输入个人身份信息。
          </div>
        </div>
      )}

      {/* FAB —— 原型缺 aria-haspopup / aria-expanded；对齐仓库既有 FloatingAIChat 的基线。
          不用 createPortal：那是 FloatingAIChat 为逃逸 Starlight 层叠上下文才需要的，
          /v2 的 DOM 由我们完全掌控，position:fixed + --z-overlay 直接生效。 */}
      <button
        ref={fabRef}
        type="button"
        onClick={() => (open ? close() : setOpen(true))}
        aria-label={open ? '关闭 AI 问答' : '打开 AI 问答'}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="yk-chat-fab"
        style={{
          position: 'fixed', right: 20, bottom: 20, zIndex: 'var(--z-overlay)' as unknown as number,
          width: 56, height: 56, borderRadius: 999, cursor: 'pointer',
          background: open ? 'var(--ink)' : 'var(--ivory)',
          border: '2.5px solid var(--ink)',
          boxShadow: '3px 3px 0 var(--ink)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        {open
          ? <span style={{ color: '#fff', fontSize: 20, fontWeight: 700 }}>✕</span>
          : <Icon name="sparkles" size={30} color="var(--ink)" />}
      </button>
    </>
  );
}
