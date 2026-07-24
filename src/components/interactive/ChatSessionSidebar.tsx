/**
 * ChatSessionSidebar — conversation list for the AI chat.
 *
 * variant 'rail'   → persistent desktop column (full-page chat).
 * variant 'drawer' → overlay drawer (mobile page + compact FAB), focus-trapped,
 *                     closes on Esc / backdrop click.
 *
 * Presentational: all session state + handlers come from useChatSessions via props.
 * Styling: default (二相乐园) class baseline here; sakura overrides in sakura-ai.css.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import type { AIChatCopy } from './aiChatL10n';
import type { ChatSession } from '../../utils/ai-chat/storage';

interface Props {
  variant: 'rail' | 'drawer';
  open?: boolean;
  onClose?: () => void;
  ui: AIChatCopy;
  sessions: ChatSession[];
  activeId: string | null;
  historyEnabled: boolean;
  onNewChat: () => void;
  onSelect: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
  onClearAll: () => void;
  onExportAll: () => void;
  onToggleHistory: (on: boolean) => void;
}

type Group = 'today' | 'yesterday' | 'prev7' | 'older';

function groupOf(ts: number, now: number): Group {
  const n = new Date(now);
  const startToday = new Date(n.getFullYear(), n.getMonth(), n.getDate()).getTime();
  if (ts >= startToday) return 'today';
  if (ts >= startToday - 86_400_000) return 'yesterday';
  if (ts >= startToday - 6 * 86_400_000) return 'prev7';
  return 'older';
}

const SIDEBAR_CSS = `
.yk-ai-side {
  display: flex;
  flex-direction: column;
  inline-size: 280px;
  min-inline-size: 280px;
  background: var(--color-bg-container, #1a1625);
  border-inline-end: 1px solid var(--color-outline-20);
  overflow: hidden;
}
.yk-ai-side__head {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-md);
  border-block-end: 1px solid var(--color-outline-20);
  flex-shrink: 0;
}
.yk-ai-newbtn {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 40px;
  padding: 8px 12px;
  background: var(--color-primary);
  color: var(--color-text-on-dark, #fff);
  border: none;
  font-family: var(--font-body);
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
  border-radius: 0;
  transition: opacity var(--transition-fast);
}
.yk-ai-newbtn:hover { opacity: 0.9; }
.yk-ai-side__closebtn {
  background: none; border: none; color: var(--color-text-secondary);
  cursor: pointer; min-width: 40px; min-height: 40px;
  display: inline-flex; align-items: center; justify-content: center;
}
.yk-ai-search {
  margin: var(--space-sm) var(--space-md);
  padding: 7px 10px;
  background: var(--color-bg, #12101a);
  color: var(--color-text-primary);
  border: 1px solid var(--color-outline-20);
  font-family: var(--font-body);
  font-size: 0.8125rem;
  outline: none;
  border-radius: 0;
  flex-shrink: 0;
}
.yk-ai-search:focus { border-color: var(--color-primary); }
.yk-ai-list { flex: 1; overflow-y: auto; padding: 0 var(--space-sm) var(--space-sm); }
.yk-ai-group__label {
  font-size: 0.6875rem;
  color: var(--color-text-muted);
  font-family: var(--font-mono);
  letter-spacing: 0.05em;
  text-transform: uppercase;
  padding: var(--space-sm) var(--space-sm) 4px;
}
.yk-ai-sess {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 10px;
  cursor: pointer;
  color: var(--color-text-secondary);
  border-inline-start: 2px solid transparent;
  transition: background var(--transition-fast), color var(--transition-fast);
}
.yk-ai-sess:hover { background: var(--color-white-alpha-03); color: var(--color-text-primary); }
.yk-ai-sess--active {
  background: var(--color-primary-alpha-15);
  border-inline-start-color: var(--color-primary);
  color: var(--color-text-primary);
}
.yk-ai-sess__title {
  flex: 1; min-width: 0;
  font-family: var(--font-body); font-size: 0.8125rem; line-height: 1.4;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  background: none; border: none; color: inherit; text-align: start; cursor: pointer; padding: 0;
}
.yk-ai-sess__rename {
  flex: 1; min-width: 0;
  font-family: var(--font-body); font-size: 0.8125rem;
  background: var(--color-bg, #12101a); color: var(--color-text-primary);
  border: 1px solid var(--color-primary); outline: none; padding: 2px 6px; border-radius: 0;
}
.yk-ai-sess__act {
  background: none; border: none; color: var(--color-text-muted);
  cursor: pointer; min-width: 30px; min-height: 30px; padding: 0;
  display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0;
  opacity: 0; transition: opacity var(--transition-fast), color var(--transition-fast);
}
.yk-ai-sess:hover .yk-ai-sess__act,
.yk-ai-sess--active .yk-ai-sess__act { opacity: 1; }
.yk-ai-sess__act:hover { color: var(--color-primary); }
.yk-ai-sess__act:focus-visible { opacity: 1; outline: 2px solid var(--color-accent); outline-offset: 1px; }
.yk-ai-sess__confirm {
  display: inline-flex; gap: 2px; flex-shrink: 0;
}
.yk-ai-sess__confirm button {
  background: none; border: none; cursor: pointer; font-size: 0.6875rem;
  min-height: 30px; padding: 0 6px; font-family: var(--font-body);
}
.yk-ai-sess__confirm .yk-ai-danger { color: var(--color-danger); font-weight: 700; }
.yk-ai-sess__confirm .yk-ai-muted { color: var(--color-text-muted); }
.yk-ai-side__empty {
  padding: var(--space-lg) var(--space-md);
  color: var(--color-text-muted);
  font-family: var(--font-body); font-size: 0.8125rem; text-align: center;
}
.yk-ai-side__foot {
  border-block-start: 1px solid var(--color-outline-20);
  padding: var(--space-md);
  flex-shrink: 0;
  display: flex; flex-direction: column; gap: 8px;
}
.yk-ai-optin { display: flex; align-items: flex-start; gap: 8px; cursor: pointer; }
.yk-ai-optin input { margin-block-start: 3px; flex-shrink: 0; accent-color: var(--color-primary); }
.yk-ai-optin__text { display: flex; flex-direction: column; gap: 2px; }
.yk-ai-optin__label { font-family: var(--font-body); font-size: 0.75rem; color: var(--color-text-primary); }
.yk-ai-optin__body { font-size: 0.6875rem; line-height: 1.5; color: var(--color-text-muted); }
.yk-ai-side__tools { display: flex; gap: 8px; }
.yk-ai-side__tool {
  flex: 1; background: none; border: 1px solid var(--color-outline-20);
  color: var(--color-text-secondary); cursor: pointer; min-height: 34px;
  font-family: var(--font-body); font-size: 0.75rem; border-radius: 0;
  transition: border-color var(--transition-fast), color var(--transition-fast);
}
.yk-ai-side__tool:hover { border-color: var(--color-primary); color: var(--color-primary-light); }
.yk-ai-side__tool--danger:hover { border-color: var(--color-danger); color: var(--color-danger); }
.yk-ai-side__offhint { font-size: 0.6875rem; color: var(--color-caution); line-height: 1.4; }

/* drawer variant */
.yk-ai-drawer-overlay { position: absolute; inset: 0; background: var(--color-black-alpha-40); z-index: 20; }
.yk-ai-side--drawer {
  position: absolute; inset-block: 0; inset-inline-start: 0; z-index: 21;
  inline-size: min(300px, 82%);
  box-shadow: 0 0 40px var(--color-black-alpha-50);
  animation: yk-ai-drawer-in 0.22s ease-out;
}
@keyframes yk-ai-drawer-in {
  from { transform: translateX(-100%); opacity: 0.4; }
  to { transform: translateX(0); opacity: 1; }
}
[dir="rtl"] .yk-ai-side--drawer { animation-name: yk-ai-drawer-in-rtl; }
@keyframes yk-ai-drawer-in-rtl {
  from { transform: translateX(100%); opacity: 0.4; }
  to { transform: translateX(0); opacity: 1; }
}
@media (prefers-reduced-motion: reduce) {
  .yk-ai-side--drawer { animation: none; }
}
`;

export default function ChatSessionSidebar(props: Props) {
  const {
    variant, open = true, onClose, ui, sessions, activeId, historyEnabled,
    onNewChat, onSelect, onRename, onDelete, onClearAll, onExportAll, onToggleHistory,
  } = props;

  const [query, setQuery] = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameText, setRenameText] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const isDrawer = variant === 'drawer';

  // Drawer: Esc to close + focus first control on open.
  useEffect(() => {
    if (!isDrawer || !open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose?.(); }
    };
    document.addEventListener('keydown', onKey);
    const first = panelRef.current?.querySelector<HTMLElement>('button, input');
    first?.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, [isDrawer, open, onClose]);

  const grouped = useMemo(() => {
    const now = Date.now();
    const q = query.trim().toLowerCase();
    const filtered = q
      ? sessions.filter(
          (s) =>
            s.title.toLowerCase().includes(q) ||
            s.messages.some((m) => m.content.toLowerCase().includes(q)),
        )
      : sessions;
    const order: Group[] = ['today', 'yesterday', 'prev7', 'older'];
    const labels: Record<Group, string> = {
      today: ui.groupToday, yesterday: ui.groupYesterday, prev7: ui.groupPrev7, older: ui.groupOlder,
    };
    const buckets: Record<Group, ChatSession[]> = { today: [], yesterday: [], prev7: [], older: [] };
    [...filtered]
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .forEach((s) => buckets[groupOf(s.updatedAt, now)].push(s));
    return order
      .filter((g) => buckets[g].length > 0)
      .map((g) => ({ group: g, label: labels[g], items: buckets[g] }));
  }, [sessions, query, ui]);

  function startRename(s: ChatSession) {
    setRenamingId(s.id);
    setRenameText(s.title);
    setConfirmDeleteId(null);
  }
  function commitRename() {
    if (renamingId) onRename(renamingId, renameText);
    setRenamingId(null);
  }

  const body = (
    <div
      ref={panelRef}
      className={`yk-ai-side ${isDrawer ? 'yk-ai-side--drawer' : ''}`}
      role={isDrawer ? 'dialog' : 'complementary'}
      aria-modal={isDrawer ? true : undefined}
      aria-label={ui.historyTitle}
    >
      <div className="yk-ai-side__head">
        <button className="yk-ai-newbtn" onClick={() => { onNewChat(); if (isDrawer) onClose?.(); }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          {ui.newChat}
        </button>
        {isDrawer && (
          <button className="yk-ai-side__closebtn" onClick={onClose} aria-label={ui.closeSidebar}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>

      <input
        className="yk-ai-search"
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={ui.searchPlaceholder}
        aria-label={ui.searchPlaceholder}
      />

      <div className="yk-ai-list">
        {sessions.length === 0 ? (
          <div className="yk-ai-side__empty">{ui.emptyHistory}</div>
        ) : (
          grouped.map(({ group, label, items }) => (
            <div key={group} className="yk-ai-group">
              <div className="yk-ai-group__label">{label}</div>
              {items.map((s) => (
                <div key={s.id} className={`yk-ai-sess ${s.id === activeId ? 'yk-ai-sess--active' : ''}`}>
                  {renamingId === s.id ? (
                    <input
                      className="yk-ai-sess__rename"
                      value={renameText}
                      autoFocus
                      onChange={(e) => setRenameText(e.target.value)}
                      onBlur={commitRename}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') { e.preventDefault(); commitRename(); }
                        if (e.key === 'Escape') { e.preventDefault(); setRenamingId(null); }
                      }}
                      aria-label={ui.renameLabel}
                    />
                  ) : (
                    <button
                      className="yk-ai-sess__title"
                      onClick={() => { onSelect(s.id); if (isDrawer) onClose?.(); }}
                    >
                      {s.title || ui.untitledChat}
                    </button>
                  )}

                  {confirmDeleteId === s.id ? (
                    <span className="yk-ai-sess__confirm">
                      <button className="yk-ai-danger" onClick={() => { onDelete(s.id); setConfirmDeleteId(null); }}>
                        {ui.deleteChat}
                      </button>
                      <button className="yk-ai-muted" onClick={() => setConfirmDeleteId(null)}>
                        {ui.cancel}
                      </button>
                    </span>
                  ) : renamingId !== s.id ? (
                    <>
                      <button className="yk-ai-sess__act" onClick={() => startRename(s)} aria-label={ui.rename}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z" />
                        </svg>
                      </button>
                      <button
                        className="yk-ai-sess__act"
                        onClick={() => { setConfirmDeleteId(s.id); setRenamingId(null); }}
                        aria-label={ui.deleteChat}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      </button>
                    </>
                  ) : null}
                </div>
              ))}
            </div>
          ))
        )}
      </div>

      <div className="yk-ai-side__foot">
        <label className="yk-ai-optin">
          <input
            type="checkbox"
            checked={historyEnabled}
            onChange={(e) => onToggleHistory(e.target.checked)}
          />
          <span className="yk-ai-optin__text">
            <span className="yk-ai-optin__label">{ui.historyToggleLabel}</span>
            <span className="yk-ai-optin__body">{ui.historyOptInBody}</span>
          </span>
        </label>
        {!historyEnabled && <div className="yk-ai-side__offhint">{ui.historyOffHint}</div>}
        <div className="yk-ai-side__tools">
          <button className="yk-ai-side__tool" onClick={onExportAll} disabled={sessions.length === 0}>
            {ui.exportChat}
          </button>
          <button
            className="yk-ai-side__tool yk-ai-side__tool--danger"
            onClick={() => { if (confirmClear()) onClearAll(); }}
            disabled={sessions.length === 0}
          >
            {ui.clearHistory}
          </button>
        </div>
      </div>
    </div>
  );

  function confirmClear(): boolean {
    // Lightweight blocking confirm for the destructive clear-all.
    return typeof window === 'undefined' ? false : window.confirm(ui.clearConfirm);
  }

  return (
    <>
      <style>{SIDEBAR_CSS}</style>
      {isDrawer ? (
        open ? (
          <>
            <div className="yk-ai-drawer-overlay" onClick={onClose} />
            {body}
          </>
        ) : null
      ) : (
        body
      )}
    </>
  );
}
