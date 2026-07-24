/**
 * localStorage-based persistence for the AI chat — device-only, opt-in, zero upload.
 *
 * Mirrors src/utils/blood/storage.ts (the one localStorage use CLAUDE.md whitelists):
 * SSR guard + try/catch silent degrade + versioned keys. The server stays stateless;
 * conversations are only written to disk after the user explicitly enables history
 * (AI_CHAT_CONSENT_KEY). See docs/specs/ai-chat-local-history.md and CONSTITUTION §6.
 */

export const AI_CHAT_KEY = 'yakuten_ai_chat_v1';
export const AI_CHAT_CONSENT_KEY = 'yakuten_ai_chat_consent_v1';

/** Persisted message — display text + crisis flag only. NEVER stores apiContent. */
export interface StoredMessage {
  role: 'user' | 'assistant';
  content: string;
  crisis?: boolean;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: StoredMessage[];
}

export interface ChatStoreV1 {
  version: 1;
  sessions: ChatSession[];
  activeId: string | null;
}

export const EMPTY_STORE: ChatStoreV1 = { version: 1, sessions: [], activeId: null };

/* Budget caps — trim before write to avoid blowing the ~5MB localStorage quota. */
const MAX_SESSIONS = 30;
const MAX_MESSAGES_PER_SESSION = 120;
const MAX_CHARS = 1_500_000; // soft budget on JSON.stringify length (chars ≈ bytes here)

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

/** Newest-first by updatedAt. */
function byNewest(a: ChatSession, b: ChatSession): number {
  return b.updatedAt - a.updatedAt;
}

/** Trim to the budget caps. Pure — returns a new store; activeId reconciled if dropped. */
export function trimStore(store: ChatStoreV1): ChatStoreV1 {
  let sessions = store.sessions.map((s) =>
    s.messages.length > MAX_MESSAGES_PER_SESSION
      ? { ...s, messages: s.messages.slice(-MAX_MESSAGES_PER_SESSION) }
      : s,
  );
  sessions = [...sessions].sort(byNewest).slice(0, MAX_SESSIONS);
  // Byte/char budget: drop oldest (last, since sorted newest-first) until under budget.
  while (sessions.length > 1 && JSON.stringify(sessions).length > MAX_CHARS) {
    sessions.pop();
  }
  // null activeId is intentional ("new chat" — no session selected yet); only
  // repair ids that point at a trimmed-away session.
  const activeId =
    store.activeId === null
      ? null
      : sessions.some((s) => s.id === store.activeId)
        ? store.activeId
        : sessions[0]?.id ?? null;
  return { version: 1, sessions, activeId };
}

export function aiLoadStore(): ChatStoreV1 {
  if (!isBrowser()) return { ...EMPTY_STORE };
  if (!aiHistoryEnabled()) return { ...EMPTY_STORE };
  try {
    const raw = window.localStorage.getItem(AI_CHAT_KEY);
    if (!raw) return { ...EMPTY_STORE };
    const parsed = JSON.parse(raw) as ChatStoreV1;
    if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.sessions)) {
      return { ...EMPTY_STORE };
    }
    return parsed;
  } catch {
    return { ...EMPTY_STORE };
  }
}

/**
 * Persist the store (only when history is enabled). Returns the store as actually
 * written (post-trim) so callers can keep in-memory state in sync with disk.
 * No-op that returns the trimmed store when history is disabled or on SSR.
 */
export function aiSaveStore(store: ChatStoreV1): ChatStoreV1 {
  const trimmed = trimStore(store);
  if (!isBrowser() || !aiHistoryEnabled()) return trimmed;
  try {
    window.localStorage.setItem(AI_CHAT_KEY, JSON.stringify(trimmed));
    return trimmed;
  } catch {
    // Quota / blocked — drop one more oldest session and retry once, then give up.
    try {
      const reduced: ChatStoreV1 = trimStore({
        ...trimmed,
        sessions: trimmed.sessions.slice(0, Math.max(1, trimmed.sessions.length - 1)),
      });
      window.localStorage.setItem(AI_CHAT_KEY, JSON.stringify(reduced));
      return reduced;
    } catch {
      return trimmed; // silent degrade — in-memory state still usable this session
    }
  }
}

export function aiHistoryEnabled(): boolean {
  if (!isBrowser()) return false;
  try {
    return window.localStorage.getItem(AI_CHAT_CONSENT_KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * Toggle device-local history. Turning OFF also wipes any stored conversations
 * (withdrawing consent = forgetting). Returns the effective state.
 */
export function aiSetHistoryEnabled(on: boolean): boolean {
  if (!isBrowser()) return false;
  try {
    if (on) {
      window.localStorage.setItem(AI_CHAT_CONSENT_KEY, '1');
      return true;
    }
    window.localStorage.removeItem(AI_CHAT_CONSENT_KEY);
    window.localStorage.removeItem(AI_CHAT_KEY);
    return false;
  } catch {
    return on;
  }
}

/** Clear all stored conversations but keep the opt-in preference. */
export function aiClearAll(): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(AI_CHAT_KEY);
  } catch {
    // ignore
  }
}

/** Export all sessions as a downloaded JSON file (Blob, zero upload). */
export function aiExportJSON(store: ChatStoreV1): void {
  if (!isBrowser()) return;
  const data = {
    app: 'HRT药典 · ai-chat',
    version: 1,
    exportedAt: new Date().toISOString(),
    sessions: store.sessions,
  };
  downloadBlob(
    JSON.stringify(data, null, 2),
    'application/json',
    `yakuten-ai-chat-${new Date().toISOString().slice(0, 10)}.json`,
  );
}

/** Export a single session as Markdown. */
export function aiExportMarkdown(session: ChatSession): void {
  if (!isBrowser()) return;
  const lines = [`# ${session.title}`, ''];
  for (const m of session.messages) {
    lines.push(m.role === 'user' ? '**You:**' : '**AI:**', '', m.content, '');
  }
  downloadBlob(
    lines.join('\n'),
    'text/markdown',
    `yakuten-ai-chat-${new Date().toISOString().slice(0, 10)}.md`,
  );
}

function downloadBlob(content: string, type: string, filename: string): void {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
