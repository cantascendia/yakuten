/**
 * localStorage-based persistence for the AI chat — device-only, opt-in, zero upload.
 *
 * Mirrors src/utils/blood/storage.ts (the one localStorage use CLAUDE.md whitelists):
 * SSR guard + try/catch silent degrade + versioned keys. The server stays stateless;
 * conversations are only written to disk after the user explicitly enables history
 * (AI_CHAT_CONSENT_KEY). See docs/specs/ai-chat-local-history.md and CONSTITUTION §6.
 */

import {
  SOMATIC_RULE_IDS,
  SOMATIC_TIERS,
  MAX_SOMATIC_HITS,
} from '../../components/interactive/somaticEmergency';
import type { SomaticHit } from '../../components/interactive/somaticEmergency';

export const AI_CHAT_KEY = 'yakuten_ai_chat_v1';
export const AI_CHAT_CONSENT_KEY = 'yakuten_ai_chat_consent_v1';

/** Persisted message — display text + safety flags only. NEVER stores apiContent. */
export interface StoredMessage {
  role: 'user' | 'assistant';
  content: string;
  crisis?: boolean;
  /** 躯体急症规则命中（docs/specs/ai-chat-somatic-emergency.md §4.2）。
   *  可选；缺失即视为空数组。存的是规则 id + tier，不存任何症状文本。 */
  somaticHits?: SomaticHit[];
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

/* Per-item shape guards — localStorage can be corrupted or hand-edited; a bad
   record must degrade to "dropped", never crash rendering or blow up memory. */
const MAX_STORED_CONTENT = 20_000;
function sanitizeMessage(m: unknown): StoredMessage | null {
  if (!m || typeof m !== 'object') return null;
  const msg = m as Record<string, unknown>;
  if (msg.role !== 'user' && msg.role !== 'assistant') return null;
  if (typeof msg.content !== 'string') return null;
  return {
    role: msg.role,
    content: msg.content.slice(0, MAX_STORED_CONTENT),
    crisis: msg.crisis === true ? true : undefined,
    /* 白名单校验：ruleId / tier 必须在 somaticEmergency.ts 的枚举内，且总数有上限
       —— 手改 localStorage 塞进来的垃圾数据不得进入渲染路径（同 crisis 字段纪律）。 */
    somaticHits: Array.isArray(msg.somaticHits)
      ? (msg.somaticHits as unknown[])
        .filter((h): h is SomaticHit => {
          if (!h || typeof h !== 'object') return false;
          const hit = h as Record<string, unknown>;
          return (
            SOMATIC_RULE_IDS.includes(hit.ruleId as SomaticHit['ruleId'])
            && SOMATIC_TIERS.includes(hit.tier as SomaticHit['tier'])
          );
        })
        .map((h) => ({
          ruleId: h.ruleId,
          tier: h.tier,
          // downgrade 只认严格 true，其余（'false' / 1 / undefined）一律丢弃 ——
          // 误把假值读成 true 会把 Tier-1 红卡降级成内联提示条，那是危险方向。
          ...(h.downgrade === true ? { downgrade: true as const } : {}),
        }))
        .slice(0, MAX_SOMATIC_HITS)
      : undefined,
  };
}
function sanitizeSession(s: unknown): ChatSession | null {
  if (!s || typeof s !== 'object') return null;
  const sess = s as Record<string, unknown>;
  if (typeof sess.id !== 'string' || !sess.id) return null;
  if (!Array.isArray(sess.messages)) return null;
  return {
    id: sess.id.slice(0, 64),
    title: typeof sess.title === 'string' ? sess.title.slice(0, 120) : '',
    createdAt: typeof sess.createdAt === 'number' ? sess.createdAt : 0,
    updatedAt: typeof sess.updatedAt === 'number' ? sess.updatedAt : 0,
    messages: sess.messages.map(sanitizeMessage).filter((m): m is StoredMessage => m !== null),
  };
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
    const sessions = parsed.sessions
      .map(sanitizeSession)
      .filter((s): s is ChatSession => s !== null);
    const activeId =
      typeof parsed.activeId === 'string' && sessions.some((s) => s.id === parsed.activeId)
        ? parsed.activeId
        : null;
    return { version: 1, sessions, activeId };
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

/** Export a single session as Markdown (labels supplied by caller for i18n). */
export function aiExportMarkdown(
  session: ChatSession,
  labels: { user: string; assistant: string } = { user: 'You', assistant: 'AI' },
): void {
  if (!isBrowser()) return;
  const lines = [`# ${session.title}`, ''];
  for (const m of session.messages) {
    lines.push(`**${m.role === 'user' ? labels.user : labels.assistant}:**`, '', m.content, '');
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
