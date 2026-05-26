import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamText } from 'ai';

export const config = { runtime: 'edge' };

const google = createGoogleGenerativeAI({
  // GOOGLE_GENERATIVE_AI_API_KEY is set in Vercel environment variables
});

/* ================================
   Simple IP Rate Limiter
   Edge Function instances share memory within a region,
   but not across cold starts. Good enough for basic protection.
   ================================ */

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 5;        // max requests
const RATE_WINDOW_MS = 60000; // per 1 minute

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
  'https://yakuten.app',
  'https://www.yakuten.app',
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
const ALLOWED_ROLES = new Set(['user', 'model']);

type ChatMessage = { role: string; content: string };

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
    out.push({ role: m.role, content: m.content });
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

5. **如果用户描述紧急症状**（血栓症状、严重出血、意识模糊、自杀意念等），立即回应：
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

  // Fail fast if API key is missing
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    console.error('AI Chat error: GOOGLE_GENERATIVE_AI_API_KEY is not set');
    return new Response(
      JSON.stringify({ error: 'AI 服务未配置，请联系站点管理员' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } },
    );
  }

  try {
    const body = await req.json().catch(() => null);
    const rawMessages = body && typeof body === 'object' ? (body as { messages?: unknown }).messages : undefined;

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

    const result = streamText({
      model: google('gemini-3-flash-preview'),
      system: SYSTEM_PROMPT,
      messages: recentMessages,
      maxOutputTokens: 2048,
      temperature: 0.3,
    });

    // Consume first chunk to catch API errors before sending 200
    const reader = result.textStream.getReader();
    const firstChunk = await reader.read();

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
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
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
