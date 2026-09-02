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
   四层凭据注册表
   Per docs/specs/ai-chat-multi-tier-fallback.md §2.1
   key 存在性 = 唯一开关；不引入 ENABLE_* 独立开关（两个真值源必然漂移）。
   ================================ */

type Tier = 'free' | 'free-oai' | 'paid' | 'backup';
type ProviderId = 'google' | 'deepseek' | 'openai';

interface Credential {
  /** 稳定符号标签，用于 cooldown key / 日志 / 响应头。永远不是 key 本身 */
  id: 'g-free' | 'g-paid' | 'ds' | 'oai';
  tier: Tier;
  provider: ProviderId;
  apiKey: string;
}

function envStr(name: string): string | null {
  const v = process.env[name];
  return typeof v === 'string' && v.trim() !== '' ? v.trim() : null;
}

/* AI_TIERS 生效时的层列表，用于响应头 `x-yk-tiers`；未生效时保持 null（不发该头）。
   ⚠️ 这个头存在的理由来自一次真实踩坑：AI_TIERS 第一次配置时**没有生效**
   （面板保存失败），而端点照常 200、探针照常能跑完 —— 唯一能发现的方式是去翻
   Vercel 启动日志。也就是说，一个用来防止「以为测了其实没测」的开关，
   自己有着同一个失败模式。

   两个作用：
   1. 探针脚本开跑前先断言该头 == 待测层，不匹配直接 abort ——
      宁可不出报告，也不要出一份「打的其实是 Google」的绿色报告
   2. **生产环境出现这个头本身就是告警**：说明有人测完忘了删 AI_TIERS，
      生产链正被钉在单层上

   只在 AI_TIERS 生效时发送 —— 正常生产不新增任何信息披露面。
   声明必须在 CREDENTIALS 之前：那个 IIFE 会给它赋值，`let` 在 TDZ 内被赋值会抛
   ReferenceError，而那发生在模块加载期 —— 端点会直接起不来。 */
let RESTRICTED_TIERS: string | null = null;

const CREDENTIALS: Credential[] = (() => {
  const out: Credential[] = [];
  const gFree = envStr('GOOGLE_GENERATIVE_AI_API_KEY');
  const gPaid = envStr('GOOGLE_PAID_API_KEY');
  const oai = envStr('OPENAI_API_KEY');
  const ds = envStr('DEEPSEEK_API_KEY');

  if (gFree) out.push({ id: 'g-free', tier: 'free', provider: 'google', apiKey: gFree });

  /* OpenAI 每日免费额度（Tier 1-2，条件为开启数据共享 —— owner 已知情开启，
     与 Google 免费层 / DeepSeek 同等对待）。计量单位是 **token** 不是请求数。
     缺失即跳过该层，语义与其余三层一致。

     ⚠️⚠️ **上线前置条件：必须在 OpenAI project 级配 hard spend limit。**
     帮助中心的描述是「超出免费额度后按正常费率计费」而不是返回错误（该页对
     抓取器 403，未能逐字验证）。若属实，免费池用尽后请求会**静默转为付费**，
     没有任何错误码能触发降级 —— 我们的「免费 → 付费 → 保底」链第一跳永远
     不会发生，账单却在涨。hard spend limit 把「静默计费」变成可检测的
     `429 insufficient_quota`，正是本降级链需要的信号。
     没配 spend limit 就上线 = 无声漏钱。见 spec §2.1。 */
  if (oai) out.push({ id: 'oai', tier: 'free-oai', provider: 'openai', apiKey: oai });

  // paid === free 说明配置错误（同一个 key 填了两处，或在同一个 GCP 项目上开了
  // billing —— 后者会让该项目免费额度立即消失）。宁可退化为单层也不静默错配。
  if (gPaid && gPaid !== gFree) {
    out.push({ id: 'g-paid', tier: 'paid', provider: 'google', apiKey: gPaid });
  } else if (gPaid && gPaid === gFree) {
    console.error('AI Chat config: GOOGLE_PAID_API_KEY equals the free key — paid tier disabled');
  }

  if (ds) out.push({ id: 'ds', tier: 'backup', provider: 'deepseek', apiKey: ds });

  /* ── AI_TIERS：把可用层限制为逗号分隔的白名单（如 `free-oai`）────────────
     存在的唯一理由是**让安全门控可重复执行**。spec §5 要求「DeepSeek / OpenAI
     层上线前必须过 P0 医疗安全探针」，但降级链的性质决定了上游层成功时下游层
     永远不会被走到 —— 没有这个开关，唯一的测法是把主 key 改坏，那会波及所有
     共用该 key 的环境，且每次重测都要重来一遍（改 SYSTEM_PROMPT 后、加新层时
     都必须重跑）。

     安全性：**只读 env，不接受任何请求侧输入**（若可按请求指定层，就成了让
     调用方绕开主层、直接压某个付费/未验证供应商的攻击面）。缺省即不生效，
     行为与今天逐字等价。白名单为空或全不匹配时**忽略该变量并告警** ——
     宁可退化成完整链，也不要因为一个拼错的层名让端点整体 503。 */
  const wanted = envStr('AI_TIERS');
  if (!wanted) return out;

  const allow = new Set(wanted.split(',').map((s) => s.trim()).filter(Boolean));
  const filtered = out.filter((c) => allow.has(c.tier));
  if (filtered.length === 0) {
    console.error(
      `AI Chat config: AI_TIERS="${wanted}" matched no armed tier — ignoring it. `
      + `Armed: ${out.map((c) => c.tier).join(',') || 'none'}`,
    );
    return out;
  }
  console.warn(`AI Chat: AI_TIERS restricts chain to ${[...allow].join(',')} — probe/testing mode`);
  RESTRICTED_TIERS = [...new Set(filtered.map((c) => c.tier))].join(',');
  return filtered;
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

/* ================================
   两级滚动配额（spec §2.8）—— owner 2026-07-29：「5 小时窗口 + 每周额度」
   （Claude 模式）。两级都是**滚动窗口**：从该窗口内第一次使用起算，窗口结束
   后整体恢复，下次使用再开新窗口。不是自然日 —— 自然日会让"差 10 分钟到午夜"
   变成可用量翻倍，且重置时刻与用户的使用节奏无关。
   任一级超限即拒绝；两级各自的 resetInMs 都回给客户端，Retry-After 取**已超限
   的那些窗口里更近的一个**（先恢复的那个才是用户真正的等待起点）。
   与限流同款进程内 Map（Edge 跨实例不共享，尽力而为）。
   ================================ */

/* 配额数值依据（GA4 property 541902985，近 28 天：日活 ~180-270、峰值 510、
   28 天独立用户 4831、回访率仅 15%）。AI 问答此前无埋点 → 按面板打开率 3-8%
   × 发消息转化 ~50% × 平均 3-6 轮估算 = 60-360 请求/天，而免费侧容量
   ≈ 9000/天。**限额的目的不是分配稀缺资源，而是防单 IP 刷爆**（现有
   5 req/min 允许单 IP 理论 7200/天）→ 给真实用户留足余量，只掐异常量。 */
/** 25：真实深度会话（贴血检数值 + 追问 + 换个说法再问）上限约 15-20 轮，
 *  25 留 ~25% 余量，正常用户碰不到。 */
const SESSION_LIMIT = 25;
/** 150 = 6 个满额 5h 窗口/周。单 IP 最坏持续 ~21 次/天；即使 50 个恶意 IP
 *  也仅 1050/天，占 9000 免费容量的 12%。 */
const WEEKLY_LIMIT = 150;

const SESSION_WINDOW_MS = 5 * 60 * 60 * 1000;
const WEEKLY_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

interface QuotaWindow { start: number; used: number }
/** s = 5h 时段窗口，w = 7d 周窗口 */
const quotaMap = new Map<string, { s: QuotaWindow; w: QuotaWindow }>();

type QuotaScope = 'session' | 'weekly';

interface QuotaVerdict {
  exceeded: boolean;
  /** 先被打满的那一级（仅 exceeded 时有意义），用于客户端选文案 */
  scope: QuotaScope;
  sessionResetInMs: number;
  weeklyResetInMs: number;
  /** 建议等待毫秒：已超限窗口中较近的一个 */
  retryInMs: number;
}

/** 窗口过期则就地重开（used 归零）。 */
function rollWindow(w: QuotaWindow, windowMs: number, now: number): void {
  if (now - w.start >= windowMs) { w.start = now; w.used = 0; }
}

/** 检查并累加两级计数。任一级超限则**两级都不累加**（拒绝的请求不该扣额度）。 */
function checkQuota(ip: string): QuotaVerdict {
  const now = Date.now();
  let rec = quotaMap.get(ip);
  if (!rec) {
    rec = { s: { start: now, used: 0 }, w: { start: now, used: 0 } };
    quotaMap.set(ip, rec);
  }
  rollWindow(rec.s, SESSION_WINDOW_MS, now);
  rollWindow(rec.w, WEEKLY_WINDOW_MS, now);

  const sessionResetInMs = rec.s.start + SESSION_WINDOW_MS - now;
  const weeklyResetInMs = rec.w.start + WEEKLY_WINDOW_MS - now;
  const sOver = rec.s.used >= SESSION_LIMIT;
  const wOver = rec.w.used >= WEEKLY_LIMIT;

  if (sOver || wOver) {
    const scope: QuotaScope = !sOver ? 'weekly' : !wOver ? 'session'
      : weeklyResetInMs < sessionResetInMs ? 'weekly' : 'session';
    return {
      exceeded: true,
      scope,
      sessionResetInMs,
      weeklyResetInMs,
      retryInMs: scope === 'weekly' ? weeklyResetInMs : sessionResetInMs,
    };
  }

  /* 注意：这里**只判定不扣减**。扣减由 commitQuota 在确认要返回可用回复时执行。
     早扣的两个问题（线上实测）：① 400 坏请求也吃额度；② 客户端对 5xx/网络失败
     最多自动重试 3 次，一次提问能扣掉三份，约 9 次失败后用户被锁 5 小时，
     而这期间服务可能早就恢复了。 */
  return { exceeded: false, scope: 'session', sessionResetInMs, weeklyResetInMs, retryInMs: 0 };
}

/** 真正扣减。只在确认要向用户交付回复时调用 —— 失败一律不计费。 */
function commitQuota(ip: string): void {
  const rec = quotaMap.get(ip);
  if (!rec) return;
  rec.s.used += 1;
  rec.w.used += 1;
}

/** 周窗口过期即整条记录作废（周窗口一定不早于时段窗口结束）。 */
function cleanupQuota(): void {
  const now = Date.now();
  for (const [k, v] of quotaMap) if (now - v.w.start >= WEEKLY_WINDOW_MS) quotaMap.delete(k);
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
  /** 是否支持图片输入。带图请求只能路由到 true 的候选。
   *  DeepSeek v4 不支持视觉 —— 带图请求降级到它会静默返回无视图片的
   *  文本回答（用户问「看看我的化验单」，得到一段套话），这是最难被发现的
   *  一类故障，故必须显式标记而非运行时试探。
   *  ⚠️ 本 PR 只放元数据，**不实现任何图片路径**；过滤逻辑与消息校验的
   *  图片 schema 在 #136 实现，见 docs/specs/ai-chat-image-input.md。 */
  vision: boolean;
}

/** 视觉能力按 provider 判定：Google 全系与 gpt-5.6 三档官方 features 均含
 *  image_input；DeepSeek v4 不含。 */
const PROVIDER_VISION: Record<ProviderId, boolean> = {
  google: true,
  openai: true,
  deepseek: false,
};

type Grade = 'medical' | 'smalltalk';

/* ⚠️ 模型可用性**必须实打验证**（真发一次 generateContent），不能靠读文档或读
   ListModels：`gemini-2.5-flash` 与 `gemini-2.5-flash-lite` 至今**仍被 ListModels
   列出**，但真调用返回
     404 NOT_FOUND: This model ... is no longer available to new users.
   2026-07-29 用本地免费 key 逐模型实打的结果：
     ✅ gemini-3.6-flash / gemini-3.5-flash / gemini-3-flash-preview
     ✅ gemini-3.5-flash-lite / gemini-3.1-flash-lite / gemini-3.1-flash-lite-preview
     ❌ gemini-2.5-flash / gemini-2.5-flash-lite（404，已从链中移除）

   第 3 顺位用 preview 而非 `gemini-flash-latest` 这类别名：别名背后的模型会
   **静默变化**，而本站的医疗安全探针是针对具体模型验证的 —— 模型换了而我们
   不知道 = 探针结论过期且无人察觉，医疗产品上不可接受；且别名是否与目标模型
   共享同一配额 bucket 无法确认（若共享，加了等于没加）。preview 被撤下的风险
   存在，但它们处在各池第 3 顺位（前两个都失败才轮到），撤下的表现就是 404 →
   next-model，链本身能吸收。

   顺带一条「配额确实是 per-model 独立」的直接实证（比引文档更硬）：同一时刻
   `gemini-2.0-flash` 与 `gemini-2.0-flash-lite` 返回 429 RESOURCE_EXHAUSTED，
   而其余模型同时 200。 */
const G_FLASH = ['gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-3-flash-preview'] as const;
const G_LITE = ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-3.1-flash-lite-preview'] as const;
// 旧名 deepseek-chat 已于 2026-07-24 退役
const DS_MODEL = 'deepseek-v4-flash';
/* GPT-5.6 三档（$/1M in-out，2026-07-30 降价后）：
   sol   旗舰     $5 / $30      （未降）
   terra 平衡     $2 / $12      （原 $2.50 / $15，-20%）
   luna  最快最省 $0.20 / $1.20 （原 $1 / $6，-80%）

   ⚠️ **降价不改变本文件的任何一行逻辑**，理由见下方 ② 与 spec §2.2a：
   链序的依据是**免费池大小**（2.5M vs 250K），不是单价，而池大小没变。

   三者的 context(1.05M) / max output(128K) / cutoff / vision / streaming /
   Tier1 RPM·TPM **完全一致**，差异只在价格与能力档。

   免费额度池归属 —— **来源是 owner 账号侧观测，不是官方文档**（官方可抓取的
   部分未记载 gpt-5.6 系列的池归属，帮助中心那页 403）。不可当成公开保证；
   官方随时可能调整，届时以降级链的 429 / insufficient_quota 行为为准：
     大池   250K tok/天 → sol
     小模型池 2.5M tok/天 → terra、luna
   按单次请求 ≈ 4.3K tok（system ~2.5K + 对话 ~1K + 输出 ~0.8K）折算：
     sol ≈ 58 次/天（稀缺）  terra+luna ≈ 580 次/天（充裕）。
   ⚠️ 主用 terra/luna **不是因为它们便宜**，而是因为它们在 2.5M 的大池里、
   sol 在 250K 的小池里 —— 免费额度差 10 倍，这比单价重要得多。
   （2026-07-30 luna 降价 80% 后这句依然成立，且不再有张力：luna 现在既在大池
   里、单价又最低，两个理由同向。terra 仍排在 luna 前是**质量**决定的 ——
   二者共用同一个 2.5M 池，先用便宜的那个省不出任何免费额度。） */
const OAI_SOL = 'gpt-5.6-sol';
const OAI_TERRA = 'gpt-5.6-terra';
const OAI_LUNA = 'gpt-5.6-luna';

/** 免费层配额是 per-project-per-model → 6 个模型 = 6 份独立 ~1500 RPD。
 *  4-6 位是「换池」：Flash 全系 RPM 撞墙时 Lite 池仍空闲，仍在免费层内。
 *  付费层只放 1 个：其失败几乎必然是余额耗尽，换模型救不了。
 *  寒暄的付费层用 lite（同句成本差 ~4×）。 */
const TIER_MODELS: Record<Tier, Record<Grade, readonly string[]>> = {
  /* smalltalk 的第 3 位是免费 flash：Google lite 双双限流时若直接落到 OpenAI，
     就会拿 token 池去付一句「你好」，而 9000 次/天的免费 flash 池还空着。
     多挂一个免费候选几乎零成本。 */
  free: { medical: [...G_FLASH, ...G_LITE], smalltalk: [G_LITE[0], G_LITE[1], G_FLASH[1]] },
  'free-oai': { medical: [OAI_TERRA, OAI_LUNA], smalltalk: [OAI_LUNA] },
  paid: { medical: ['gemini-3.6-flash'], smalltalk: ['gemini-3.5-flash-lite'] },
  backup: { medical: [DS_MODEL], smalltalk: [DS_MODEL] },
};

/* —— 显式候选顺序表（spec §2.2）——
   加入 OpenAI 层后，链不再是「按 tier 顺序遍历 CREDENTIALS」：OpenAI 按 token
   计量而 Google 免费层按请求数计量，两者稀缺性完全不同。三条设计理由：
   ① **sol 只服务思考模式**。思考模式由用户主动开启、频次低（估 10-20%，
      即 6-70 次/天），质量诉求最高 —— 正好吃满 58 次/天的稀缺大池，且不会被
      日常问答挤占；
   ② **terra / luna 排在 paid 之前**。2.5M 小模型池是 use-it-or-lose-it，
      每天不用即作废；放在付费层前面能让 owner 每月 $10 的 credits 几乎永远
      动不到 —— 「最大化白嫖」的直接兑现；
   ③ **日常问答仍以 Google 免费打头**。~9000 次/天 是最大的一份免费额度。
   段 = [tier, 该段模型]；对应 cred 缺失时整段跳过。 */
type ChainPlan = ReadonlyArray<readonly [Tier, readonly string[]]>;

const CHAIN_PLANS: Record<'think' | 'medical' | 'smalltalk', ChainPlan> = {
  think: [
    ['free-oai', [OAI_SOL]],
    // Google 段只取 3.6-flash（thinkingLevel:'high'）：lite 在 high 档下既不省
    // 额度也给不出思考深度，放进来只会拖长首字节延迟
    ['free', [G_FLASH[0]]],
    ['free-oai', [OAI_TERRA]],
    ['paid', TIER_MODELS.paid.medical],
    ['backup', TIER_MODELS.backup.medical],
  ],
  medical: [
    ['free', TIER_MODELS.free.medical], // flash×3 → lite×3
    ['free-oai', TIER_MODELS['free-oai'].medical], // terra → luna
    ['paid', TIER_MODELS.paid.medical],
    ['backup', TIER_MODELS.backup.medical],
  ],
  smalltalk: [
    ['free', TIER_MODELS.free.smalltalk], // lite×2
    ['free-oai', TIER_MODELS['free-oai'].smalltalk], // luna
    ['paid', TIER_MODELS.paid.smalltalk],
    ['backup', TIER_MODELS.backup.smalltalk],
  ],
};

/** tier → cred。每 tier 至多一把 key（§2.1），首个胜出。 */
const CRED_BY_TIER = new Map<Tier, Credential>();
for (const c of CREDENTIALS) if (!CRED_BY_TIER.has(c.tier)) CRED_BY_TIER.set(c.tier, c);

function buildChain(grade: Grade, mode: ChatMode): Candidate[] {
  const plan = CHAIN_PLANS[grade === 'smalltalk' ? 'smalltalk' : mode === 'think' ? 'think' : 'medical'];
  const out: Candidate[] = [];
  for (const [tier, models] of plan) {
    const cred = CRED_BY_TIER.get(tier);
    if (!cred) continue; // 该层未配置 key → 整段跳过
    for (const modelId of models) {
      out.push({
        cred,
        modelId,
        key: `${cred.id}::${modelId}`,
        vision: PROVIDER_VISION[cred.provider],
      });
    }
  }
  return out;
}

/* —— 耗尽记忆（进程内，Edge 跨实例不共享）——
   冷却只会让链变短，永不改变最终成败：命中→少探几次；未命中（冷启动/换实例）
   → 退化成改造前行为。严格 Pareto 改进，最坏等于现状。
   key 来自闭集常量（≤4 cred × ≤6 model + 4 cred key，上界 28 条），攻击者无法
   注入 —— 与按 IP 索引的限流 Map 不同。 */

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

/* —— OpenAI 语义补充（只在 provider === 'openai' 时生效，不触碰 Google 既有分支）——

   ⚠️ **429 必须按 `error.code` 分流**，两种完全不同的情况共用这个状态码：
     · `insufficient_quota` —— 配额/余额耗尽、撞 spend limit。判 **next-model +
       model 级冷却**（不是 cred 级）：sol 在 250K 大池、terra/luna 在 2.5M 小
       池，**两池独立**，一个池耗尽不代表另一个也耗尽。
       猜错的代价严重不对称：猜成 cred 级但实际是池级 → 白丢整个 2.5M 免费池、
       流量落到付费层（真金白银）；猜成 model 级但实际是账户级 → 多探 2 次
       ≈300ms，且下一句里的 all-quota 收敛（见 handler）一轮就自愈。
       官方 spend-limits 页逐字确认该 code 与 429 的绑定。
     · 其他 —— RPM/TPM 限流（Tier 1 是 500 RPM / 500K TPM）。换模型/退避有用。
   **不硬匹配 `rate_limit_exceeded`**：官方 error-codes 页只给了人类可读的
   "Rate limit reached for requests"，并未把它列为机器可读 code。故按
   「非 insufficient_quota 即限流」来写。
   401 invalid_api_key / 404 model_not_found 已被既有的 sc===401 / sc===404 覆盖。 */
const OAI_QUOTA_RE = /insufficient_quota|exceeded your current quota/i;
/* 参数被该代模型改名/移除（temperature、max_tokens…）。Google 的 400 一律 abort
   是对的（坏请求换供应商救不了），但 OpenAI 侧的参数漂移是**模型级**不兼容：
   换下一个候选很可能就通了，abort 会让一个参数问题打掉整条链。 */
const OAI_PARAM_RE = /unsupported[_ ](parameter|value)|unrecognized request argument|not supported with this model/i;

/** 从 responseBody 里取 `error.code`。只回传枚举式短串，绝不回传原文（隐私红线）。 */
function oaiErrorCode(body: string): string {
  try {
    const j = JSON.parse(body) as { error?: { code?: unknown } };
    const c = j.error?.code;
    return typeof c === 'string' ? c : '';
  } catch { return ''; }
}

function classifyOpenAI(sc: number | undefined, body: string): Classification | null {
  const code = oaiErrorCode(body);

  /* 额度耗尽：以 error.code 为准，正则只作 JSON 解析失败时的兜底。
     判 model 级而非 cred 级 —— 见上方「代价不对称」论证。真·账户级耗尽
     （余额/spend limit）由 handler 里的 all-quota 收敛补上。 */
  if (code === 'insufficient_quota' || OAI_QUOTA_RE.test(body)) {
    return { verdict: 'next-model', scope: 'model', cooldownMs: 15 * MIN, code: 'oai-quota' };
  }
  // 其余 429 一律当 RPM/TPM 限流：换模型 + 短退避（限流是 per-model 维度的）
  if (sc === 429) {
    return { verdict: 'next-model', scope: 'model', cooldownMs: 60_000, code: 'oai-ratelimit' };
  }
  if (sc === 400 && (OAI_PARAM_RE.test(body) || code === 'unsupported_parameter' || code === 'unsupported_value')) {
    return { verdict: 'next-model', scope: 'model', cooldownMs: 30 * MIN, code: '400-oai-param' };
  }
  return null;
}

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

  if (cred.provider === 'openai') {
    const oai = classifyOpenAI(sc, body);
    if (oai) return oai;
  }

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

/** 成功路径的结构化日志。字段白名单与 logProbeFailure 同级：
 *  route / model / probes / mode 都是闭集常量，ms 与 msgs 是数字。
 *  **msgs 只记条数，绝不记内容**；本函数不接触 error 对象，也不接触任何消息文本。
 *  用途：Vercel 日志里直接回答「各层占比 / 平均探测几次 / p95 延迟」，
 *  也是回滚触发条件（backup 占比异常升高）的观测面。 */
function logServed(cand: Candidate, probes: number, mode: ChatMode, ms: number, msgs: number): void {
  console.log(
    `AI:served route=${cand.cred.tier}/${cand.cred.provider} model=${cand.modelId}`
    + ` probes=${probes} mode=${mode} ms=${ms} msgs=${msgs}`,
  );
}

/** 唯一允许接触 error 对象的函数。字段白名单——见文件头隐私红线。
 *
 *  ⚠️ 残余风险与其缓解：即便只取 `err.message`（不碰 error 对象本身、不碰
 *  responseBody），供应商仍有可能在错误文案里**回显触发错误的输入片段**
 *  （内容策略拒绝类错误尤其可能）。对本站而言那就是用户的 HRT 用药对话。
 *
 *  缓解：记录前**只保留可打印 ASCII**，其余一律替换。
 *
 *  为什么用白名单而不是「剥掉 CJK」：本站有 17 个语种。黑名单式地列举中日韩，
 *  会漏掉俄语 / 阿拉伯语 / 泰语 / 印地语 / 越南语用户的输入 —— 而那些用户
 *  同样在描述自己的用药情况。白名单一次覆盖全部非拉丁文字，且**零排障损失**：
 *  三家供应商的 API 错误文案、配额度量名、模型 id 全是 ASCII。实测逐字完整保留：
 *    · "Quota exceeded for quota metric 'Generate requests' and limit
 *       'GenerateRequestsPerDayPerProjectPerModel-FreeTier'"
 *    · "API key not valid. Please pass a valid API key."
 *    · "insufficient_quota: You exceeded your current quota"
 *
 *  **诚实的局限：这道闸门不完整。** 数字与拉丁字母会幸存 —— 假想的回显
 *  「…policy — 我今天吃了 4mg 补佳乐，E2 只有 90」会被记成
 *  「…policy — ..... 4mg ...... E2 .. 90」；西语 / 法语 / 德语等拉丁语系用户的
 *  输入也会大部分幸存。而剥离拉丁字母等于剥离全部排障信息，不可行。
 *  故：闸门只是把最大的一块在源头掐掉，**真正的兜底仍是上线后 grep 日志特征串**
 *  （见 spec §5 验收项）。 */
const NON_ASCII_RE = /[^\x20-\x7E]/g;

function scrubForLog(s: string): string {
  return s.replace(NON_ASCII_RE, '.').slice(0, 200);
}

function logProbeFailure(cand: Candidate, cls: Classification, err: unknown): void {
  const msg = err instanceof Error ? err.message : String(err);
  console.error(
    `AI Chat probe failed: ${cand.key} code=${cls.code} -> ${cls.verdict} cd=${cls.cooldownMs}ms`,
    scrubForLog(msg),
  );
}

/* —— 思考模式参数（spec §2.7）——
   thinkingLevel（Gemini 3.x）与 thinkingBudget（2.5 系）不可同时传。
   免费层限的是请求数不是 token 数 → 思考模式不额外消耗免费额度，只增延迟。
   注：2.5 系已于 2026-07-29 全部退出候选链（对新用户 404），故 thinkingBudget
   分支当前是死路；保留它是为将来接入非 gen3 模型时不必重写分派。 */

function thinkingConfigFor(modelId: string, mode: ChatMode, isSmallTalk: boolean) {
  const isGen3 = /^gemini-3/.test(modelId);
  if (isSmallTalk) return isGen3 ? { thinkingLevel: 'minimal' as const } : { thinkingBudget: 0 };
  if (mode === 'think') return isGen3 ? { thinkingLevel: 'high' as const } : { thinkingBudget: -1 };
  return isGen3 ? { thinkingLevel: 'low' as const } : { thinkingBudget: 0 };
}

/* —— OpenAI 兼容 SSE 引擎（零依赖 fetch）——
   @ai-sdk/deepseek 全系列依赖 @ai-sdk/provider@4.x，与本项目 ai@6（provider@3.0.8）
   代际不兼容 → 直接打 OpenAI 兼容端点，产出与 Google 路径同形的 ReadableStream。

   本函数只做三件事：发请求、把非 2xx 转成 APICallError、解析
   `chat/completions` 风格 SSE（`choices[0].delta.content`）。**请求体由调用方
   整体传入**（见 deepseekStream / openaiStream）—— 这样每家供应商的字段争议
   都集中在各自的一个 body 字面量里，改起来只动一处。 */

const DEEPSEEK_URL = 'https://api.deepseek.com/chat/completions';

interface CompatStreamOptions {
  /** 供应商短标签，只进错误 message（闭集常量，不含 key 材料） */
  label: string;
  /** 完整端点 URL */
  url: string;
  apiKey: string;
  /** 已构造完毕的请求体（含 model / messages / stream:true） */
  body: Record<string, unknown>;
}

/* 手写流的超时。刻意分成「首包」与「分块」两档，**没有 totalMs** —— 与 Google
   侧 timeout.chunkMs 的语义保持一致：整体超时会把正常的长回答拦腰截断，在医疗站
   上截断一句剂量说明是患者安全事故，比多等几秒严重得多。
   超时以 AbortError/TimeoutError 抛出，classify() 判 next-model，链继续往下走。 */
const COMPAT_FIRST_BYTE_MS = 8_000;
const COMPAT_CHUNK_MS = 8_000;

function openaiCompatStream(o: CompatStreamOptions): ReadableStream<string> {
  return new ReadableStream<string>({
    async start(controller) {
      /* 单个 controller 管住整条请求：首包用它，之后每收到一块就重新武装。
         不这样做的话，供应商接受连接后不发数据（或中途静默停发），fetch 与
         reader.read() 都会无限等待 —— PROBE_BUDGET_MS 只在候选开始前检查，
         中断不了已经在等的候选，结果是卡到 Vercel 硬超时、客户端无限转圈。 */
      const ac = new AbortController();
      let stallTimer: ReturnType<typeof setTimeout> | undefined;
      const armStall = (ms: number) => {
        clearTimeout(stallTimer);
        stallTimer = setTimeout(() => {
          ac.abort(new DOMException(`${o.label} stream stalled`, 'TimeoutError'));
        }, ms);
      };

      armStall(COMPAT_FIRST_BYTE_MS);
      let res: Response;
      try {
        res = await fetch(o.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${o.apiKey}` },
          body: JSON.stringify(o.body),
          signal: ac.signal,
        });
      } catch (e) {
        clearTimeout(stallTimer);
        throw e;
      }

      if (!res.ok || !res.body) {
        clearTimeout(stallTimer);
        throw new APICallError({
          message: `${o.label} ${res.status}`,
          url: o.url,
          requestBodyValues: {}, // 刻意留空：绝不把 prompt 塞进错误对象（隐私红线）
          statusCode: res.status,
          responseBody: (await res.text().catch(() => '')).slice(0, 2000),
        });
      }

      /* 主动观测剩余额度：比等 429 早一步，且是纯数字（无内容、无 key 材料）。
         只在逼近上限时打一行，正常流量下零噪声。 */
      const remReq = Number(res.headers.get('x-ratelimit-remaining-requests'));
      const remTok = Number(res.headers.get('x-ratelimit-remaining-tokens'));
      if ((Number.isFinite(remReq) && remReq < 50) || (Number.isFinite(remTok) && remTok < 50_000)) {
        console.warn(`AI:ratelimit-low ${o.label} req=${remReq} tok=${remTok}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder(); // 复用同一实例：跨 chunk 保持多字节状态
      let buf = '';
      try {
        for (;;) {
          armStall(COMPAT_CHUNK_MS); // 每块重新计时：只掐「停发」，不限总时长
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true }); // stream:true 防半个汉字被切断
          let nl: number;
          while ((nl = buf.indexOf('\n')) >= 0) {
            const line = buf.slice(0, nl).replace(/\r$/, ''); // 兼容 \r\n
            buf = buf.slice(nl + 1);
            if (!line.startsWith('data:')) continue; // 跳过空行 / event: / 心跳
            const payload = line.slice(5).trim();
            /* 终止信号有三种，任一到达都算结束 —— 官方参考页并未把 `[DONE]`
               记载为契约（虽然实务上存在），所以不能只认它：
               ① `[DONE]` 哨兵  ② finish_reason 落定  ③ 流自然关闭（外层 done） */
            if (payload === '[DONE]') return;
            try {
              const j = JSON.parse(payload) as {
                choices?: Array<{ delta?: { content?: string }; finish_reason?: string | null }>;
              };
              const choice = j.choices?.[0];
              const t = choice?.delta?.content;
              if (t) controller.enqueue(t);
              // include_usage 的 usage 只在最后一个 chunk，且流中断就收不到
              // → 本解析器不依赖它，见到 finish_reason 即可收工
              if (typeof choice?.finish_reason === 'string' && choice.finish_reason) return;
            } catch { /* 半包或心跳，忽略 */ }
          }
        }
      } finally {
        clearTimeout(stallTimer);
        controller.close();
      }
    },
  });
}

/** DeepSeek 请求体。字段形态已在线上验证过，不要跟着 OpenAI 一起改。 */
function deepseekStream(
  apiKey: string,
  model: string,
  messages: ChatMessage[],
  maxOutputTokens: number,
  mode: ChatMode,
  isSmallTalk: boolean,
): ReadableStream<string> {
  return openaiCompatStream({
    label: 'DeepSeek',
    url: DEEPSEEK_URL,
    apiKey,
    body: {
      model,
      stream: true,
      temperature: 0.3,
      max_tokens: maxOutputTokens,
      thinking: mode === 'think' && !isSmallTalk ? 'enabled' : 'disabled',
      messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
    },
  });
}

/* ============================================================================
   ⚠️ OpenAI 请求体 —— 唯一需要按官方文档调参的地方，改动请只动本函数
   ----------------------------------------------------------------------------
   端点：走 `/v1/chat/completions`（官方确认 gpt-5.6 全系仍支持）。官方虽推荐
   Responses，但其 raw SSE wire 格式官方文档没有逐字示例，而我们是手写解析器
   —— 拿没文档的格式赌线上不划算。风险因此被控制在"参数改名"这一类。

   **禁止携带的字段**（带了是未知风险，去掉一定安全）：
   · `temperature` —— 官方对 gpt-5.6 是否接受**未记载**，推理模型历史上硬拒。
     想控制风格改用 `verbosity`。DeepSeek 与 Google 路径仍固定 0.3，本站的
     确定性基线不变。
   · `top_p` / `presence_penalty` / `frequency_penalty` —— 同上。
   · `max_tokens` —— 官方已标 deprecated，用 `max_completion_tokens`。

   **`max_completion_tokens` 把 reasoning tokens 算进上限**，这是接入后最常见的
   「AI 没反应」故障源：给 1024、模型花 900 在思考，用户只看到 124 token 甚至
   空白 —— 症状与上月修的 `ensureSession` 空 id P0 极难分辨。故本函数强制
   ≥ OAI_MIN_COMPLETION_TOKENS，并显式压低 reasoning_effort。

   兜底：classifyOpenAI() 对参数类 400 判 next-model 而非 abort，所以即便某个
   字段被官方改名，链只是少一个候选，不会整条断掉。
   ========================================================================== */
const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';

/** reasoning tokens 也吃这个预算 → 地板值必须够高，否则推理吃光=空回复。 */
const OAI_MIN_COMPLETION_TOKENS = 4096;

/* reasoning_effort 取值集（gpt-5.6）：none | low | medium | high | xhigh | max。
   ⚠️ **不要用 `minimal`** —— 那是 GPT-5 初代的值，5.6 支持列表里没有。

   ⚠️ **寒暄档也用 `low`，不用 `none`**（刻意的安全裕度，勿"优化"回去）：
   寒暄分级器是一条窄正则，它误判的方向是**把医疗问题当成寒暄** —— 那种请求
   若拿到零推理，在一个需要交叉核对剂量与禁忌的站点上是安全问题，不是性能问题。
   一句问候上 low 与 none 的成本/延迟差异可忽略，用它换掉这个风险面是划算的。
   （Google 侧的 thinkingLevel:'minimal' 保持不变 —— Gemini 最低档仍产出完整
   回答，行为变化没这么剧烈。） */
type OaiEffort = 'low' | 'high';
function reasoningEffortFor(mode: ChatMode, isSmallTalk: boolean): OaiEffort {
  if (isSmallTalk) return 'low';
  return mode === 'think' ? 'high' : 'low';
}

/** verbosity 是**顶层**字段（`text.verbosity` 那是 Responses 的形态）。 */
function verbosityFor(isSmallTalk: boolean): 'low' | 'medium' {
  return isSmallTalk ? 'low' : 'medium';
}

function oaiTokenBudget(maxOutputTokens: number): number {
  return Math.max(maxOutputTokens, OAI_MIN_COMPLETION_TOKENS);
}

/* prompt caching 白拿：自动生效，门槛 ≥1024 token（SYSTEM_PROMPT 够），
   cached input 便宜 90%。5.6 起 cache write 收 1.25×，但我们同一 prompt 高频
   复用，净收益明显。prompt_cache_key 提高命中率 —— 只放 SYSTEM_PROMPT 的版本
   标识，**绝不放用户内容 / 语言以外的任何请求特征**（缓存键会进 OpenAI 侧日志）。
   TTL 固定 30m，无需配置。 */
const OAI_PROMPT_CACHE_KEY = 'yakuten-sys-v1';

function openaiStream(
  apiKey: string,
  model: string,
  messages: ChatMessage[],
  maxOutputTokens: number,
  mode: ChatMode,
  isSmallTalk: boolean,
): ReadableStream<string> {
  return openaiCompatStream({
    label: 'OpenAI',
    url: OPENAI_URL,
    apiKey,
    body: {
      model,
      stream: true,
      // temperature / top_p / penalties：刻意不传，见上方说明
      max_completion_tokens: oaiTokenBudget(maxOutputTokens),
      reasoning_effort: reasoningEffortFor(mode, isSmallTalk),
      verbosity: verbosityFor(isSmallTalk),
      // usage 只在最后一个 chunk 到；流中断就收不到 —— 解析器不依赖它
      stream_options: { include_usage: true },
      prompt_cache_key: OAI_PROMPT_CACHE_KEY,
      messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
    },
  });
}

/** 统一入口：三条路径都产出 ReadableStream<string>，下游探错与流重组逻辑通用。 */
function openStream(
  cand: Candidate,
  messages: ChatMessage[],
  maxOutputTokens: number,
  mode: ChatMode,
  isSmallTalk: boolean,
): ReadableStream<string> {
  const { provider, apiKey } = cand.cred;
  if (provider === 'deepseek') {
    return deepseekStream(apiKey, cand.modelId, messages, maxOutputTokens, mode, isSmallTalk);
  }
  if (provider === 'openai') {
    return openaiStream(apiKey, cand.modelId, messages, maxOutputTokens, mode, isSmallTalk);
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

  /* Fail fast：服务完全未配置时先返回，**不要先扣配额**。
     顺序有意义（双签评审 P2）：若 checkQuota 排在前面，一个配置缺失的部署会
     让每个访客白白消耗掉自己的 5 小时/每周额度，而他们连一次回答都没拿到 ——
     等配置修好，这些人还在冷却里。 */
  if (CREDENTIALS.length === 0) {
    console.error('AI Chat error: no API key configured (GOOGLE_GENERATIVE_AI_API_KEY is required)');
    return new Response(
      JSON.stringify({ error: 'AI 服务未配置，请联系站点管理员' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } },
    );
  }

  // 两级滚动配额（spec §2.8）：与限流同款进程内 Map，尽力而为。
  // 善意用户的主防线是客户端本地计数器；这道只挡简单滥用。
  const quota = checkQuota(ip);
  if (quota.exceeded) {
    const toMin = (ms: number) => Math.max(1, Math.ceil(ms / 60_000));
    return new Response(
      // resetInMinutes 交给客户端渲染本地化的「约 X 后恢复」；
      // error 是无客户端时的兜底文案（客户端命中 x-yk-quota 时不使用它）。
      JSON.stringify({
        error: '提问次数已达上限，额度会在当前窗口结束后恢复。',
        scope: quota.scope,
        resetInMinutes: toMin(quota.retryInMs),
        sessionResetInMinutes: toMin(quota.sessionResetInMs),
        weeklyResetInMinutes: toMin(quota.weeklyResetInMs),
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'x-yk-daily': 'exceeded', // 保留：既有 spec §2.8 契约
          'x-yk-quota': quota.scope,
          'Retry-After': String(Math.max(1, Math.ceil(quota.retryInMs / 1000))),
        },
      },
    );
  }

  try {
    cleanupQuota();
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

    /* Limit conversation length to prevent token overflow.
       顺带守住 OpenAI 的计价悬崖：input > 272K token 的请求**整个请求**按
       2× input / 1.5× output 计价。这里 10 条 × 4096 B 上限 ≈ 40KB ≈ 10-20K
       token，离 272K 有两个数量级余量 —— 但放宽 MAX_MESSAGES / MAX_CONTENT_BYTES
       时必须重新核算。 */
    const recentMessages = messages.slice(-10);

    /* 任务分级（spec §2.2）：纯寒暄走 Lite 池省主力额度；其余一律主力链 ——
       保守窄召回：宁可把寒暄给主力模型，绝不把医疗问题给 lite。 */
    const lastUser = [...recentMessages].reverse().find((m) => m.role === 'user');
    const rawContent = lastUser?.content;
    const lastText = typeof rawContent === 'string' ? rawContent.trim() : '';
    const GREETING_RE = /^(你好|您好|hi|hello|hey|嗨|哈喽|在吗|谢谢|感谢|thanks|thank you|辛苦了|早上好|晚上好|好的|ok|okay)[!！。.~？? ]*$/i;
    const isSmallTalk = lastText.length <= 14 && GREETING_RE.test(lastText);
    const maxTokens = isSmallTalk ? 512 : mode === 'think' ? 4096 : 2048;

    const chain = buildChain(isSmallTalk ? 'smalltalk' : 'medical', mode);

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
    /* 本次请求内已判定为凭证级失效的 cred。思考模式链里 free-oai 出现两次
       （sol 段与 terra 段被 Google 免费段隔开），既有的「连续段跳过」
       只能跳掉相邻的那一段 —— 冷却 Map 通常会补上，但 AI_COOLDOWN_DISABLED=1
       时不会。用请求内的 Set 兜住，保证同一次请求绝不重试已死的 key。 */
    const deadCreds = new Set<Credential>();

    /* all-quota 收敛：`insufficient_quota` 单条判 model 级（两个 token 池独立，
       一个耗尽不代表另一个也耗尽）。但若**某 cred 的全部候选**都以该 code 失败，
       那就不是「某个池空了」而是账户余额 / spend limit 到顶 —— 此时才升级为
       cred 级：本次请求标 dead + 写 15min cred 冷却，后续请求直接跳过整层。 */
    const quotaFails = new Map<Credential, number>();
    const credCandidateTotal = new Map<Credential, number>();
    for (const c of chain) credCandidateTotal.set(c.cred, (credCandidateTotal.get(c.cred) ?? 0) + 1);

    while (i < chain.length) {
      const cand = chain[i];
      const now = Date.now();
      const isLastResort = i === chain.length - 1;

      if (deadCreds.has(cand.cred)) { i++; continue; }
      if (isCooled(cand, now)) { i++; continue; }
      /* 预算耗尽 → 直接跳到链尾的保底层，而不是放弃整条链。
         用 break 会让「保底层豁免预算」这条注释失效：医疗链光免费层就有 6 个
         候选，Google 额度耗尽（线上实际发生过）时探满 5 次即退出，OpenAI /
         付费 / DeepSeek 一个都不会试，直接 503 —— 加了保底反而没保底。 */
      if (!isLastResort && (probes >= MAX_PROBES || now - t0 > PROBE_BUDGET_MS)) {
        i = chain.length - 1;
        continue;
      }

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

        /* all-quota 收敛（见上方声明处）。计数按 cred 累加；一旦该 cred 在本次
           请求里的候选**全部**以 quota 失败，判定为账户级耗尽并升级到 cred 级。 */
        if (cls.code === 'oai-quota') {
          const n = (quotaFails.get(cand.cred) ?? 0) + 1;
          quotaFails.set(cand.cred, n);
          const total = credCandidateTotal.get(cand.cred) ?? 0;
          /* `total >= 2` 是必需的护栏：寒暄链里 OpenAI 只有 luna 一个候选，
             它一条失败只能证明「luna 所在的池空了」，推不出账户级耗尽。没有这个
             条件，一句问候撞上小池耗尽就会连坐冻结整层 15 分钟（含思考模式要用的
             sol）—— 正是本次改判 model 级所要避免的那种连坐。 */
          if (total >= 2 && n >= total) {
            deadCreds.add(cand.cred);
            // 复用既有冷却写入路径：cred scope + 15min，只延长不缩短
            markCooled(cand, { verdict: 'next-cred', scope: 'cred', cooldownMs: 15 * MIN, code: 'oai-quota-all' }, Date.now());
            console.warn(`AI Chat: cred ${cand.cred.id} exhausted (all candidates insufficient_quota)`);
          }
        }

        if (cls.verdict === 'abort') break;
        if (cls.verdict === 'next-cred') {
          // 凭证级失效：跳过同一把 key 的全部剩余候选
          const cur = cand.cred;
          const from = cur.id;
          deadCreds.add(cur);
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

    /* 扣额度：到这里才算真正交付。放在 503 / 空流两个分支之后，
       所以链耗尽与安全拦截都不计费，客户端的自动重试也就不会重复扣。 */
    commitQuota(ip);

    // ms = 从进入降级链到首 chunk 落袋的耗时（探测 + 首字节），不含后续流式时长
    logServed(served, probes, mode, Date.now() - t0, recentMessages.length);

    return new Response(stream, {
      /* x-yk-model 格式不变 —— 它是用户可见 UI（客户端渲染成 poweredBy 文案）。
         tier/provider 走新增头。三者都是闭集常量，不含任何 key 材料。 */
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'x-yk-model': served.modelId,
        'x-yk-route': `${served.cred.tier}/${served.cred.provider}`,
        'x-yk-probes': String(probes),
        // 只在 AI_TIERS 生效时出现。见其声明处的注释：探针据此断言「打的确实是待测层」，
        // 且它出现在生产响应里本身就是「测完忘删」的告警。
        ...(RESTRICTED_TIERS ? { 'x-yk-tiers': RESTRICTED_TIERS } : {}),
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('AI Chat error:', scrubForLog(message)); // 同 logProbeFailure 的 CJK 闸门
    return new Response(JSON.stringify({ error: 'AI 服务暂时不可用' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
