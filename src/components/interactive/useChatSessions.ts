/**
 * useChatSessions — shared session-management hook for the AI chat.
 *
 * Backs both AIAssistant (full page) and FloatingAIChat (FAB) via the same
 * device-local, opt-in localStorage layer (src/utils/ai-chat/storage.ts).
 *
 * Design:
 *  - Sessions always live in React state; the storage layer only WRITES to disk
 *    when the user has enabled history (opt-in). With history off, the current
 *    conversation still works in memory but is lost on reload (= today's behavior).
 *  - "New chat" deselects to activeId:null (ChatGPT-style); a session is only
 *    created once the first message is sent (setActiveMessages auto-creates).
 *  - Streaming chunk updates pass persist=false (no disk write per token); turn
 *    boundaries persist=true.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AI_CHAT_KEY,
  AI_CHAT_CONSENT_KEY,
  EMPTY_STORE,
  aiClearAll,
  aiExportJSON,
  aiExportMarkdown,
  aiHistoryEnabled,
  aiLoadStore,
  aiSaveStore,
  aiSetHistoryEnabled,
  type ChatSession,
  type ChatStoreV1,
  type StoredMessage,
} from '../../utils/ai-chat/storage';

const TITLE_MAX = 24;

function genId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `s-${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
}

/** First user message → session title (trimmed). */
function deriveTitle(messages: StoredMessage[]): string {
  const firstUser = messages.find((m) => m.role === 'user');
  if (!firstUser) return '';
  const t = firstUser.content.replace(/\s+/g, ' ').trim();
  return t.length > TITLE_MAX ? `${t.slice(0, TITLE_MAX)}…` : t;
}

export interface UseChatSessions {
  historyEnabled: boolean;
  setHistoryEnabled: (on: boolean) => void;

  sessions: ChatSession[];
  activeId: string | null;
  activeSession: ChatSession | null;
  messages: StoredMessage[];

  newSession: () => void;
  switchSession: (id: string) => void;
  renameSession: (id: string, title: string) => void;
  deleteSession: (id: string) => void;
  clearAll: () => void;

  /** Mutate the active session's messages (auto-creating one if none). */
  setActiveMessages: (
    updater: (prev: StoredMessage[]) => StoredMessage[],
    persist?: boolean,
  ) => void;
  /** Force-write current state to disk (used at stop/error boundaries). */
  flush: () => void;

  exportAll: () => void;
  exportActiveMarkdown: () => void;
}

export function useChatSessions(): UseChatSessions {
  const [store, setStore] = useState<ChatStoreV1>(() => aiLoadStore());
  const [historyEnabled, setHistoryEnabledState] = useState<boolean>(() => aiHistoryEnabled());

  // Cross-tab sync: another tab enabled/cleared/updated history.
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === AI_CHAT_KEY || e.key === AI_CHAT_CONSENT_KEY || e.key === null) {
        setHistoryEnabledState(aiHistoryEnabled());
        setStore(aiLoadStore());
      }
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const activeSession = useMemo(
    () => store.sessions.find((s) => s.id === store.activeId) ?? null,
    [store],
  );

  const setHistoryEnabled = useCallback((on: boolean) => {
    const eff = aiSetHistoryEnabled(on);
    setHistoryEnabledState(eff);
    setStore((prev) => (eff ? aiSaveStore(prev) : { ...EMPTY_STORE }));
  }, []);

  const setActiveMessages = useCallback(
    (updater: (prev: StoredMessage[]) => StoredMessage[], persist = true) => {
      setStore((prev) => {
        let sessions = prev.sessions;
        let activeId = prev.activeId;
        let active = sessions.find((s) => s.id === activeId);
        const now = Date.now();
        if (!active) {
          activeId = genId();
          active = { id: activeId, title: '', createdAt: now, updatedAt: now, messages: [] };
          sessions = [active, ...sessions];
        }
        const nextMessages = updater(active.messages);
        const title = active.title || deriveTitle(nextMessages);
        const nextSessions = sessions.map((s) =>
          s.id === activeId ? { ...s, messages: nextMessages, title, updatedAt: now } : s,
        );
        const next: ChatStoreV1 = { version: 1, sessions: nextSessions, activeId };
        return persist ? aiSaveStore(next) : next;
      });
    },
    [],
  );

  const flush = useCallback(() => setStore((prev) => aiSaveStore(prev)), []);

  const newSession = useCallback(() => {
    setStore((prev) => (prev.activeId === null ? prev : aiSaveStore({ ...prev, activeId: null })));
  }, []);

  const switchSession = useCallback((id: string) => {
    setStore((prev) => aiSaveStore({ ...prev, activeId: id }));
  }, []);

  const renameSession = useCallback((id: string, title: string) => {
    const clean = title.replace(/\s+/g, ' ').trim();
    setStore((prev) =>
      aiSaveStore({
        ...prev,
        sessions: prev.sessions.map((s) =>
          s.id === id ? { ...s, title: clean || s.title, updatedAt: Date.now() } : s,
        ),
      }),
    );
  }, []);

  const deleteSession = useCallback((id: string) => {
    setStore((prev) => {
      const sessions = prev.sessions.filter((s) => s.id !== id);
      const activeId = prev.activeId === id ? sessions[0]?.id ?? null : prev.activeId;
      return aiSaveStore({ ...prev, sessions, activeId });
    });
  }, []);

  const clearAll = useCallback(() => {
    aiClearAll();
    setStore({ ...EMPTY_STORE });
  }, []);

  const exportAll = useCallback(() => setStore((prev) => (aiExportJSON(prev), prev)), []);
  const exportActiveMarkdown = useCallback(
    () =>
      setStore((prev) => {
        const active = prev.sessions.find((s) => s.id === prev.activeId);
        if (active) aiExportMarkdown(active);
        return prev;
      }),
    [],
  );

  return {
    historyEnabled,
    setHistoryEnabled,
    sessions: store.sessions,
    activeId: store.activeId,
    activeSession,
    messages: activeSession?.messages ?? [],
    newSession,
    switchSession,
    renameSession,
    deleteSession,
    clearAll,
    setActiveMessages,
    flush,
    exportAll,
    exportActiveMarkdown,
  };
}
