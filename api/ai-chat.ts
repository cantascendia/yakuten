import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamText, APICallError } from 'ai';
import type { ModelMessage } from 'ai';

export const config = { runtime: 'edge' };

/* ============================================================================
   ⚠️ 隐私红线（本文件最易违反的一条，改动前必读）
   APICallError.requestBodyValues 携带完整 prompt（SYSTEM_PROMPT + 全部用户消息）。
   任何 console.error(err) / JSON.stringify(err) / err.stack / 记录 responseBody
   全文，都会把用户的 HRT 用药对话写进 Vercel 日志 —— 直接违反 CONSTITUTION §6
   「AI 问答不存储对话」。
   → 唯一允许接触 error 对象的函数是 logProbeFailure()，字段白名单见其实现。
   Per docs/specs/ai-chat-multi-tier-fallback.md §4
   ========================================================================== */

/* ================================
   三层凭据注册表
   Per docs/specs/ai-chat-multi-tier-fallback.md §2.1
   key 存在性 = 唯一开关；不引入 ENABLE_* 独立开关（两个真值源必然漂移）。
   ================================ */

type Tier = 'free' | 'paid' | 'backup';
type ProviderId = 'google' | 'deepseek';

interface Credential {
  /** 稳定符号标签，用于 cooldown key / 日志 / 响应头。永远不是 key 本身 */
  id: 'g-free' | 'g-paid' | 'ds';
  tier: Tier;
  provider: ProviderId;
  apiKey: string;
}

function envStr(name: string): string | null {
  const v = process.env[name];
  return typeof v === 'string' && v.trim() !== '' ? v.trim() : null;
}

const CREDENTIALS: Credential[] = (() => {
  const out: Credential[] = [];
  const gFree = envStr('GOOGLE_GENERATIVE_AI_API_KEY');
  const gPaid = envStr('GOOGLE_PAID_API_KEY');
  const ds = envStr('DEEPSEEK_API_KEY');

  if (gFree) out.push({ id: 'g-free', tier: 'free', provider: 'google', apiKey: gFree });

  // paid === free 说明配置错误（同一个 key 填了两处，或在同一个 GCP 项目上开了
  // billing —— 后者会让该项目免费额度立即消失）。宁可退化为单层也不静默错配。
  if (gPaid && gPaid !== gFree) {
    out.push({ id: 'g-paid', tier: 'paid', provider: 'google', apiKey: gPaid });
  } else if (gPaid && gPaid === gFree) {
    console.error('AI Chat config: GOOGLE_PAID_API_KEY equals the free key — paid tier disabled');
  }

  if (ds) out.push({ id: 'ds', tier: 'backup', provider: 'deepseek', apiKey: ds });
  return out;
})();

console.log('AI Chat: tiers armed =', CREDENTIALS.map((c) => `${c.tier}:${c.id}`).join(',') || 'none');

/* Google provider 实例缓存。
   ⚠️ 必须显式传 apiKey：@ai-sdk/provider-utils 的 loadApiKey 在 apiKey:undefined
   时会静默回退读 process.env.GOOGLE_GENERATIVE_AI_API_KEY —— 那会让「付费层」
   实际用免费 key 再跑一遍（响应头显示 paid、$10 永远用不到，全程无声）。 */
const googleProviders = new Map<string, ReturnType<typeof createGoogleGenerativeAI>>();
function googleFor(cred: Credential) {
  let p = googleProviders.get(cred.id);
  if (!p) {
    p = createGoogleGenerativeAI({ apiKey: cred.apiKey });
    googleProviders.set(cred.id, p);
  }
  return p;
}

/* ================================
   Simple IP Rate Limiter
   Edge Function instances share memory within a region,
   but not across cold starts. Good enough for basic protection.
   ================================ */

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 5;        // max requests
const RATE_WINDOW_MS = 60000; // per 1 minute

/* 日限额（spec §2.8）。配额来源：免费额度 ~9000 次/天 ÷ 目标支撑 300 人/天
   = 30，单人最多占 0.33%。与限流同款进程内 Map（Edge 跨实例不共享，尽力而为）。 */
const DAILY_LIMIT = 30;
const dailyMap = new Map<string, { day: string; count: number }>();

/** 用 UTC 日界：Edge 无固定时区，UTC 是唯一无依赖且各实例一致的选择。
 *  客户端计数器用本地时区（对用户更直观）—— 两者边界不同是有意的：
 *  服务端这道只在客户端被绕过（清缓存/无痕）时生效，边界更严格无害。 */
function utcDay(): string {
  return new Date().toISOString().slice(0, 10);
}

/** 检查并累加当日计数。超限返回 true。 */
function isDailyExceeded(ip: string): boolean {
  const day = utcDay();
  const rec = dailyMap.get(ip);
  if (!rec || rec.day !== day) {
    dailyMap.set(ip, { day, count: 1 });
    return false;
  }
  if (rec.count >= DAILY_LIMIT) return true;
  rec.count += 1;
  return false;
}

function cleanupDaily(): void {
  const day = utcDay();
  for (const [k, v] of dailyMap) if (v.day !== day) dailyMap.delete(k);
}

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }

  entry.count++;
  if (entry.count > RATE_LIMIT) {
    return true;
  }
  return false;
}

// Periodically clean up stale entries (prevent memory leak)
function cleanupRateLimit() {
  const now = Date.now();
  for (const [ip, entry] of rateLimitMap) {
    if (now > entry.resetAt) {
      rateLimitMap.delete(ip);
    }
  }
}

/* ================================
   Security: Origin allowlist + IP extraction
   Per SPEC-2026-05-26-security-hardening.md §2.1
   ================================ */

const DEFAULT_ALLOWED_ORIGINS = [
  'https://hrtyaku.com',
  'https://www.hrtyaku.com',
  'http://localhost:4321',
  'http://localhost:3000',
];

function getAllowedOrigins(): Set<string> {
  const fromEnv = process.env.ALLOWED_ORIGINS;
  const list = fromEnv
    ? fromEnv.split(',').map((s) => s.trim()).filter(Boolean)
    : DEFAULT_ALLOWED_ORIGINS;
  return new Set(list);
}

function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return false; // Browsers always send Origin on cross-origin POST
  return getAllowedOrigins().has(origin);
}

// Prefer Vercel-set XFF (rightmost = closest to edge, hardest to spoof end-to-end),
// then x-real-ip, then the rightmost token of standard x-forwarded-for as last resort.
function getClientIp(req: Request): string {
  const vercelXff = req.headers.get('x-vercel-forwarded-for');
  if (vercelXff) {
    const tokens = vercelXff.split(',').map((s) => s.trim()).filter(Boolean);
    if (tokens.length > 0) return tokens[tokens.length - 1];
  }
  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp.trim();
  const xff = req.headers.get('x-forwarded-for');
  if (xff) {
    const tokens = xff.split(',').map((s) => s.trim()).filter(Boolean);
    if (tokens.length > 0) return tokens[tokens.length - 1];
  }
  return 'unknown';
}

/* ================================
   Security: messages payload validation
   Per SPEC-2026-05-26-security-hardening.md §2.1
   ================================ */

const MAX_MESSAGES = 20;
const MAX_CONTENT_BYTES = 4096;
const ALLOWED_ROLES = new Set(['user', 'assistant']);

type ChatMessage = Extract<ModelMessage, { role: 'user' | 'assistant' }>;

/** 思考模式（客户端可选，缺省 fast）。Per spec §2.7 */
type ChatMode = 'fast' | 'think';
function parseMode(input: unknown): ChatMode {
  return input === 'think' ? 'think' : 'fast';
}

function validateMessages(input: unknown): { ok: true; messages: ChatMessage[] } | { ok: false; reason: string } {
  if (!Array.isArray(input) || input.length === 0) {
    return { ok: false, reason: 'messages must be a non-empty array' };
  }
  if (input.length > MAX_MESSAGES) {
    return { ok: false, reason: `messages array too long (max ${MAX_MESSAGES})` };
  }
  const encoder = new TextEncoder();
  const out: ChatMessage[] = [];
  for (let i = 0; i < input.length; i++) {
    const m = input[i] as { role?: unknown; content?: unknown } | null;
    if (!m || typeof m !== 'object') {
      return { ok: false, reason: `messages[${i}] is not an object` };
    }
    if (typeof m.role !== 'string' || !ALLOWED_ROLES.has(m.role)) {
      return { ok: false, reason: `messages[${i}].role must be one of: ${[...ALLOWED_ROLES].join(', ')}` };
    }
    if (typeof m.content !== 'string') {
      return { ok: false, reason: `messages[${i}].content must be a string` };
    }
    const byteLen = encoder.encode(m.content).length;
    if (byteLen > MAX_CONTENT_BYTES) {
      return { ok: false, reason: `messages[${i}].content too large (max ${MAX_CONTENT_BYTES} bytes)` };
    }
    out.push({ role: m.role, content: m.content } as ChatMessage);
  }
  return { ok: true, messages: out };
}

/* ================================
   System Prompt
   ================================ */

const SYSTEM_PROMPT = `你是 HRT药典 的 AI 助手——一个面向中文圈跨性别女性的 HRT 安全底线信息站的问答机器人。

## 核心规则（必须严格遵守）

1. **只能基于循证医学文献回答**。你的知识来源仅限于以下指南和研究：
   - WPATH Standards of Care 8th Edition (Coleman et al., 2022)
   - Endocrine Society Clinical Practice Guidelines (Hembree et al., 2017)
   - UCSF Guidelines for Transgender Health (Deutsch, 2016)
   - 以及 HRT 相关的同行评审文献

2. **每个回答必须引用具体文献**（作者+年份）。例如："根据 Hembree et al. (2017)..."

3. **永远不要给出个人化用药建议**。绝对不能说"你应该服用 X mg"。只能说"指南建议的范围是..."

4. **如果问题超出文献范围**，说："目前我的文献库中没有相关信息，建议咨询专业医疗人员。"

5. **如果用户描述紧急症状**（血栓症状、严重出血、意识模糊、自杀意念、皮肤或眼白发黄等肝损伤体征、剧烈头痛伴视野缺损或视力骤降、心悸伴肌肉无力等高钾征兆等），立即回应：
   "⚠️ 这可能是紧急情况。请立即联系急救服务（120）或前往最近的急诊室。
   全国24小时心理援助热线：400-161-9995
   北京心理危机研究与干预中心：010-8295-1332"

6. **回答末尾固定附加免责声明**（除非是紧急情况回复）

7. **语言**：跟随用户语言。默认中文。

8. **语气**：温和、专业、不居高临下。理解用户可能处于困难环境。

9. **绝对禁止**：
   - 推荐购药渠道或链接
   - 推荐具体品牌（除非在讨论临床数据中的特定制剂）
   - 给出针对个人的剂量建议
   - 否定用户的性别认同
   - 任何商业推广

## 免责声明模板

回答末尾附加（简短版）：
"---
*以上信息仅供参考，不构成医疗建议。请在专业医疗人员指导下进行任何治疗决策。*"

## 回答格式
- **简洁优先**：直接回答问题，不要铺垫和重复，目标 200-400 字
- 使用清晰的段落结构，善用 Markdown 加粗和列表
- 关键数据用加粗
- 引用文献格式：(Author et al., Year)
- 如果涉及剂量范围，明确标注来源指南名称
- 不要在开头重复用户的问题`;

/* ================================
   降级引擎：候选链 / 错误分类 / 耗尽记忆 / DeepSeek 客户端
   Per docs/specs/ai-chat-multi-tier-fallback.md §2
   ================================ */

const MIN = 60_000;

/* —— 候选链（扁平一维表，顺序探测天然实现「层内穷尽→才跨层」）—— */

interface Candidate {
  cred: Credential;
  modelId: string;
  key: string; // `${credId}::${modelId}`
}

const G_FLASH = ['gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-2.5-flash'] as const;
const G_LITE = ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-2.5-flash-lite'] as const;
// 旧名 deepseek-chat 已于 2026-07-24 退役
const DS_MODEL = 'deepseek-v4-flash';

/** 免费层配额是 per-project-per-model → 6 个模型 = 6 份独立 ~1500 RPD。
 *  4-6 位是「换池」：Flash 全系 RPM 撞墙时 Lite 池仍空闲，仍在免费层内。
 *  付费层只放 1 个：其失败几乎必然是余额耗尽，换模型救不了。
 *  寒暄的付费层用 lite（同句成本差 ~4×）。 */
const TIER_MODELS: Record<Tier, Record<'medical' | 'smalltalk', readonly string[]>> = {
  free: { medical: [...G_FLASH, ...G_LITE], smalltalk: [...G_LITE, G_FLASH[0]] },
  paid: { medical: ['gemini-3.6-flash'], smalltalk: ['gemini-3.5-flash-lite'] },
  backup: { medical: [DS_MODEL], smalltalk: [DS_MODEL] },
};

function buildChain(grade: 'medical' | 'smalltalk'): Candidate[] {
  const out: Candidate[] = [];
  for (const cred of CREDENTIALS) {
    for (const modelId of TIER_MODELS[cred.tier][grade]) {
      out.push({ cred, modelId, key: `${cred.id}::${modelId}` });
    }
  }
  return out;
}

/* —— 耗尽记忆（进程内，Edge 跨实例不共享）——
   冷却只会让链变短，永不改变最终成败：命中→少探几次；未命中（冷启动/换实例）
   → 退化成改造前行为。严格 Pareto 改进，最坏等于现状。
   key 来自闭集常量（≤21 条），攻击者无法注入 —— 与按 IP 索引的限流 Map 不同。 */

const MAX_COOLDOWN_MS = 30 * MIN; // 硬上限：任何路径都不得封锁候选超过半小时
const cooldownMap = new Map<string, number>();

const credCooldownKey = (c: Credential) => `${c.id}::*`;

function isCooled(cand: Candidate, now: number): boolean {
  if (process.env.AI_COOLDOWN_DISABLED === '1') return false; // kill switch
  const byCred = cooldownMap.get(credCooldownKey(cand.cred));
  if (byCred !== undefined && byCred > now) return true;
  const byModel = cooldownMap.get(cand.key);
  return byModel !== undefined && byModel > now;
}

function markCooled(cand: Candidate, cls: Classification, now: number): void {
  if (cls.scope === null || cls.cooldownMs <= 0) return;
  const ms = Math.min(cls.cooldownMs, MAX_COOLDOWN_MS);
  const key = cls.scope === 'cred' ? credCooldownKey(cand.cred) : cand.key;
  const until = now + ms;
  if (until > (cooldownMap.get(key) ?? 0)) cooldownMap.set(key, until); // 只延长不缩短
}

function cleanupCooldown(): void {
  const now = Date.now();
  for (const [k, until] of cooldownMap) if (until <= now) cooldownMap.delete(k);
}

/* —— 429 配额元数据解析 ——
   quotaId / retryDelay 只在 responseBody 原始字符串里：@ai-sdk/google 的
   googleErrorDataSchema 只解析 {error:{code,message,status}}，details[] 被 zod 丢弃。 */

interface QuotaInfo {
  kind: 'minute' | 'day' | 'unknown';
  retryDelaySec?: number;
}

function parseGoogleQuota(body: string): QuotaInfo {
  if (!body) return { kind: 'unknown' };
  let kind: QuotaInfo['kind'] = 'unknown';
  let retryDelaySec: number | undefined;

  try {
    const j = JSON.parse(body) as { error?: { details?: Array<Record<string, unknown>> } };
    for (const d of j.error?.details ?? []) {
      const t = String(d['@type'] ?? '');
      if (t.endsWith('QuotaFailure')) {
        for (const v of (d.violations as Array<{ quotaId?: string }> | undefined) ?? []) {
          const id = v.quotaId ?? '';
          // minute 优先：冷却更短，误判代价远小于反向（判成 day 会白丢一天额度）
          if (/PerMinute/i.test(id)) { kind = 'minute'; break; }
          if (/PerDay/i.test(id)) kind = 'day';
        }
      }
      if (t.endsWith('RetryInfo')) {
        const m = /^(\d+(?:\.\d+)?)s$/.exec(String(d.retryDelay ?? ''));
        if (m) retryDelaySec = Number(m[1]);
      }
    }
  } catch { /* 落到正则兜底 */ }

  if (kind === 'unknown') {
    if (/PerMinute/i.test(body)) kind = 'minute';
    else if (/PerDay/i.test(body)) kind = 'day';
  }
  if (retryDelaySec === undefined) {
    const m = /retry in (\d+(?:\.\d+)?)\s*s/i.exec(body);
    if (m) retryDelaySec = Number(m[1]);
  }
  return { kind, retryDelaySec };
}

/* —— 错误分类矩阵 ——
   改造前的实现把 401/403 当「立即失败」——单 key 时正确，多 key 下会让保底层
   永远走不到，且表现为「看起来像配置问题的 503」，无告警。 */

type Verdict = 'next-model' | 'next-cred' | 'abort';

interface Classification {
  verdict: Verdict;
  scope: 'model' | 'cred' | null; // null → 不记冷却
  cooldownMs: number;
  code: string; // 极短诊断码，进日志；绝不含 key / 对话内容
}

const KEY_BAD_RE = /api[_ ]?key|credential|unregistered|suspended|disabled|consumer/i;

function classify(err: unknown, cred: Credential, consecutive5xx: number): Classification {
  if (!APICallError.isInstance(err)) {
    const name = (err as { name?: string } | null)?.name;
    if (name === 'AbortError' || name === 'TimeoutError') {
      return { verdict: 'next-model', scope: null, cooldownMs: 0, code: 'timeout' };
    }
    // 未知错误不轮询：防止 bug 变成对上游的重试风暴
    return { verdict: 'abort', scope: null, cooldownMs: 0, code: 'unknown' };
  }

  const sc = err.statusCode;
  // responseBody 只用于「匹配」，绝不整体记日志（隐私红线）
  const body = typeof err.responseBody === 'string' ? err.responseBody : '';

  if (sc === 400) {
    // Google 把无效 key 报成 400 INVALID_ARGUMENT，不是 401
    return KEY_BAD_RE.test(body) && /invalid|not valid/i.test(body)
      ? { verdict: 'next-cred', scope: 'cred', cooldownMs: 10 * MIN, code: '400-keybad' }
      // 坏请求 / 内容策略拒绝：换供应商救不了，且会把同一份用户输入再发给
      // 第二个第三方 —— 隐私暴露面翻倍且零收益
      : { verdict: 'abort', scope: null, cooldownMs: 0, code: '400-badreq' };
  }
  if (sc === 401) return { verdict: 'next-cred', scope: 'cred', cooldownMs: 10 * MIN, code: '401' };
  if (sc === 403) {
    return KEY_BAD_RE.test(body)
      ? { verdict: 'next-cred', scope: 'cred', cooldownMs: 10 * MIN, code: '403-key' }
      // 模型级 PERMISSION_DENIED：不能因此丢掉整层免费额度
      : { verdict: 'next-model', scope: 'model', cooldownMs: 30 * MIN, code: '403-model' };
  }
  if (sc === 404) return { verdict: 'next-model', scope: 'model', cooldownMs: 30 * MIN, code: '404' };
  if (sc === 402) return { verdict: 'next-cred', scope: 'cred', cooldownMs: 15 * MIN, code: '402' };
  if (sc === 408) return { verdict: 'next-model', scope: null, cooldownMs: 0, code: '408' };

  if (sc === 429) {
    if (cred.tier !== 'free') {
      // 付费/保底层的 429 = 余额耗尽，换模型无意义
      return { verdict: 'next-cred', scope: 'cred', cooldownMs: 15 * MIN, code: '429-balance' };
    }
    const q = parseGoogleQuota(body);
    if (q.kind === 'minute') {
      const ms = Math.min(Math.max((q.retryDelaySec ?? 60) * 1000 + 2000, 5_000), 90_000);
      return { verdict: 'next-model', scope: 'model', cooldownMs: ms, code: '429-rpm' };
    }
    if (q.kind === 'day') {
      return { verdict: 'next-model', scope: 'model', cooldownMs: 30 * MIN, code: '429-rpd' };
    }
    // 无法解析：保守取 RPM 时长（误判成 PerDay 会白丢一天免费额度，代价不对称）
    return { verdict: 'next-model', scope: 'model', cooldownMs: 60_000, code: '429-?' };
  }

  if (sc != null && sc >= 500) {
    return consecutive5xx >= 1
      ? { verdict: 'next-cred', scope: 'cred', cooldownMs: 2 * MIN, code: '5xx-cred' }
      : { verdict: 'next-model', scope: 'model', cooldownMs: 30_000, code: '5xx' };
  }
  return { verdict: 'abort', scope: null, cooldownMs: 0, code: `sc${sc ?? 'na'}` };
}

/** 唯一允许接触 error 对象的函数。字段白名单——见文件头隐私红线。 */
function logProbeFailure(cand: Candidate, cls: Classification, err: unknown): void {
  const msg = err instanceof Error ? err.message : String(err);
  console.error(
    `AI Chat probe failed: ${cand.key} code=${cls.code} -> ${cls.verdict} cd=${cls.cooldownMs}ms`,
    msg.slice(0, 200),
  );
}

/* —— 思考模式参数（spec §2.7）——
   thinkingLevel（Gemini 3.x）与 thinkingBudget（2.5 系）不可同时传。
   免费层限的是请求数不是 token 数 → 思考模式不额外消耗免费额度，只增延迟。 */

function thinkingConfigFor(modelId: string, mode: ChatMode, isSmallTalk: boolean) {
  const isGen3 = /^gemini-3/.test(modelId);
  if (isSmallTalk) return isGen3 ? { thinkingLevel: 'minimal' as const } : { thinkingBudget: 0 };
  if (mode === 'think') return isGen3 ? { thinkingLevel: 'high' as const } : { thinkingBudget: -1 };
  return isGen3 ? { thinkingLevel: 'low' as const } : { thinkingBudget: 0 };
}

/* —— DeepSeek 客户端（零依赖 fetch）——
   @ai-sdk/deepseek 全系列依赖 @ai-sdk/provider@4.x，与本项目 ai@6（provider@3.0.8）
   代际不兼容 → 直接打 OpenAI 兼容端点，产出与 Google 路径同形的 ReadableStream。 */

const DEEPSEEK_URL = 'https://api.deepseek.com/chat/completions';

function deepseekStream(
  apiKey: string,
  modelId: string,
  system: string,
  messages: ChatMessage[],
  maxOutputTokens: number,
  mode: ChatMode,
  isSmallTalk: boolean,
): ReadableStream<string> {
  return new ReadableStream<string>({
    async start(controller) {
      const res = await fetch(DEEPSEEK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: modelId,
          stream: true,
          temperature: 0.3,
          max_tokens: maxOutputTokens,
          thinking: mode === 'think' && !isSmallTalk ? 'enabled' : 'disabled',
          messages: [{ role: 'system', content: system }, ...messages],
        }),
      });

      if (!res.ok || !res.body) {
        throw new APICallError({
          message: `DeepSeek ${res.status}`,
          url: DEEPSEEK_URL,
          requestBodyValues: {}, // 刻意留空：绝不把 prompt 塞进错误对象（隐私红线）
          statusCode: res.status,
          responseBody: (await res.text().catch(() => '')).slice(0, 2000),
        });
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder(); // 复用同一实例：跨 chunk 保持多字节状态
      let buf = '';
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true }); // stream:true 防半个汉字被切断
          let nl: number;
          while ((nl = buf.indexOf('\n')) >= 0) {
            const line = buf.slice(0, nl).replace(/\r$/, ''); // 兼容 \r\n
            buf = buf.slice(nl + 1);
            if (!line.startsWith('data:')) continue; // 跳过空行 / event: / 心跳
            const payload = line.slice(5).trim();
            if (payload === '[DONE]') return;
            try {
              const j = JSON.parse(payload) as { choices?: Array<{ delta?: { content?: string } }> };
              const t = j.choices?.[0]?.delta?.content;
              if (t) controller.enqueue(t);
            } catch { /* 半包或心跳，忽略 */ }
          }
        }
      } finally {
        controller.close();
      }
    },
  });
}

/** 统一入口：两条路径都产出 ReadableStream<string>，下游探错与流重组逻辑通用。 */
function openStream(
  cand: Candidate,
  messages: ChatMessage[],
  maxOutputTokens: number,
  mode: ChatMode,
  isSmallTalk: boolean,
): ReadableStream<string> {
  if (cand.cred.provider === 'deepseek') {
    return deepseekStream(cand.cred.apiKey, cand.modelId, SYSTEM_PROMPT, messages, maxOutputTokens, mode, isSmallTalk);
  }
  return streamText({
    model: googleFor(cand.cred)(cand.modelId),
    system: SYSTEM_PROMPT,
    messages,
    maxOutputTokens,
    temperature: 0.3,
    maxRetries: 0, // 重试语义由本降级链统一承担（SDK 默认 2 次会把链放大数倍）
    // ⚠️ 必须是对象形式的 chunkMs，不是 timeout: 8000（number = totalMs 语义）——
    // totalMs 会把正在正常流式输出的长回答拦腰截断，在医疗站上截断一句剂量红线
    // 或急症引导是真实的患者安全事故。chunkMs 只在相邻 chunk 间隔超时时中止。
    timeout: { chunkMs: 8000 },
    providerOptions: {
      google: { thinkingConfig: thinkingConfigFor(cand.modelId, mode, isSmallTalk) },
    },
  }).textStream;
}

/* ================================
   Handler
   ================================ */

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Origin / CSRF check (Per SPEC-2026-05-26-security-hardening.md §2.1)
  const origin = req.headers.get('origin');
  if (!isOriginAllowed(origin)) {
    // Log server-side for ops, do not echo origin back to client
    console.warn('AI Chat: rejected origin', { origin });
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Rate limiting (Per SPEC-2026-05-26-security-hardening.md §2.1)
  const ip = getClientIp(req);

  cleanupRateLimit();
  cleanupCooldown();

  if (isRateLimited(ip)) {
    return new Response(
      JSON.stringify({ error: '请求过于频繁，请稍后再试（每分钟最多 5 次）' }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': '60',
        },
      },
    );
  }

  // 日限额（spec §2.8）：与限流同款进程内 Map，尽力而为。
  // 善意用户的主防线是客户端本地计数器；这道只挡简单滥用。
  if (isDailyExceeded(ip)) {
    return new Response(
      JSON.stringify({ error: '今日提问次数已达上限，明天会重置。你可以先查阅站内文档。' }),
      {
        status: 429,
        headers: { 'Content-Type': 'application/json', 'x-yk-daily': 'exceeded' },
      },
    );
  }

  // Fail fast if no credential tier is configured
  if (CREDENTIALS.length === 0) {
    console.error('AI Chat error: no API key configured (GOOGLE_GENERATIVE_AI_API_KEY is required)');
    return new Response(
      JSON.stringify({ error: 'AI 服务未配置，请联系站点管理员' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } },
    );
  }

  try {
    cleanupDaily();
    const body = await req.json().catch(() => null);
    const rawMessages = body && typeof body === 'object' ? (body as { messages?: unknown }).messages : undefined;
    const mode = parseMode(body && typeof body === 'object' ? (body as { mode?: unknown }).mode : undefined);

    // Validate messages payload (Per SPEC-2026-05-26-security-hardening.md §2.1)
    const validation = validateMessages(rawMessages);
    if (!validation.ok) {
      return new Response(JSON.stringify({ error: validation.reason }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const { messages } = validation;

    // Limit conversation length to prevent token overflow
    const recentMessages = messages.slice(-10);

    /* 任务分级（spec §2.2）：纯寒暄走 Lite 池省主力额度；其余一律主力链 ——
       保守窄召回：宁可把寒暄给主力模型，绝不把医疗问题给 lite。 */
    const lastUser = [...recentMessages].reverse().find((m) => m.role === 'user');
    const rawContent = lastUser?.content;
    const lastText = typeof rawContent === 'string' ? rawContent.trim() : '';
    const GREETING_RE = /^(你好|您好|hi|hello|hey|嗨|哈喽|在吗|谢谢|感谢|thanks|thank you|辛苦了|早上好|晚上好|好的|ok|okay)[!！。.~？? ]*$/i;
    const isSmallTalk = lastText.length <= 14 && GREETING_RE.test(lastText);
    const maxTokens = isSmallTalk ? 512 : mode === 'think' ? 4096 : 2048;

    const chain = buildChain(isSmallTalk ? 'smalltalk' : 'medical');

    /* 链长与延迟预算（spec §2.5）。保底层（链尾）豁免这两个限制 ——
       否则「加了保底反而没保底」。 */
    const MAX_PROBES = 5;
    const PROBE_BUDGET_MS = 12_000;
    const t0 = Date.now();

    let reader: ReadableStreamDefaultReader<string> | null = null;
    let firstChunk: ReadableStreamReadResult<string> | null = null;
    let served: Candidate | null = null;
    let lastCode = 'none';
    let probes = 0;
    let consecutive5xx = 0;
    let emptyRetryUsed = false;
    let i = 0;

    while (i < chain.length) {
      const cand = chain[i];
      const now = Date.now();
      const isLastResort = i === chain.length - 1;

      if (isCooled(cand, now)) { i++; continue; }
      if (!isLastResort && (probes >= MAX_PROBES || now - t0 > PROBE_BUDGET_MS)) break;

      probes++;
      try {
        const candidateReader = openStream(cand, recentMessages, maxTokens, mode, isSmallTalk).getReader();
        // Consume first chunk to catch API errors before sending 200
        const candidateFirst = await candidateReader.read();

        /* 空回复：Gemini 安全拦截会返回空流而非报错。允许降级一次以降低出错率，
           但只在同一 provider 内 —— 把 Gemini 拒答的医疗问题转投未验证的
           DeepSeek 是医疗安全反模式（spec §2.5）。 */
        if (candidateFirst.done && !emptyRetryUsed) {
          const next = chain[i + 1];
          if (next && next.cred.provider === cand.cred.provider) {
            emptyRetryUsed = true;
            await candidateReader.cancel().catch(() => {});
            lastCode = 'empty';
            i++;
            continue;
          }
        }

        reader = candidateReader;
        firstChunk = candidateFirst;
        served = cand;
        break;
      } catch (modelError: unknown) {
        const cls = classify(modelError, cand.cred, consecutive5xx);
        logProbeFailure(cand, cls, modelError);
        markCooled(cand, cls, Date.now());
        lastCode = cls.code;
        consecutive5xx = cls.code.startsWith('5xx') ? consecutive5xx + 1 : 0;

        if (cls.verdict === 'abort') break;
        if (cls.verdict === 'next-cred') {
          // 凭证级失效：跳过同一把 key 的全部剩余候选
          const cur = cand.cred;
          const from = cur.id;
          while (i < chain.length && chain[i].cred === cur) i++;
          consecutive5xx = 0;
          if (i < chain.length) {
            console.warn(`AI Chat: cred switch ${from} -> ${chain[i].cred.id} cause=${cls.code}`);
          }
        } else {
          i++;
        }
      }
    }

    if (!reader || !firstChunk || !served) {
      console.error(`AI Chat: chain exhausted code=${lastCode} probes=${probes}`);
      return new Response(JSON.stringify({ error: 'AI 服务暂时不可用' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (firstChunk.done) {
      return new Response('抱歉，AI 暂时无法回复。请稍后重试。', {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    // Re-assemble the stream: first chunk + remaining chunks
    const stream = new ReadableStream({
      async start(controller) {
        controller.enqueue(new TextEncoder().encode(firstChunk.value));
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            controller.enqueue(new TextEncoder().encode(value));
          }
        } catch {
          controller.enqueue(new TextEncoder().encode('\n\n[回复中断，请重试]'));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      /* x-yk-model 格式不变 —— 它是用户可见 UI（客户端渲染成 poweredBy 文案）。
         tier/provider 走新增头。三者都是闭集常量，不含任何 key 材料。 */
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'x-yk-model': served.modelId,
        'x-yk-route': `${served.cred.tier}/${served.cred.provider}`,
        'x-yk-probes': String(probes),
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('AI Chat error:', message);
    return new Response(JSON.stringify({ error: 'AI 服务暂时不可用' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
