/* Cloudflare Pages Function 入口 —— 只做转发，逻辑全在 api/ai-chat.ts。
   Per docs/specs/cloudflare-migration.md §2.2。

   handler 读 process.env（模块加载期构造凭据表）。wrangler.toml 开了 nodejs_compat
   且 compatibility_date ≥ 2025-04-01，Workers 会用 Pages 的 vars / secrets 填充
   process.env —— preview 上以日志里的 `AI Chat: tiers armed = …` 行验证。
   405 / Origin / 限流等语义留在 handler 内，这里不重复。 */
import handler from '../../api/ai-chat';

export const onRequest = (ctx: { request: Request }): Promise<Response> => {
  const headers = new Headers(ctx.request.headers);
  // Only the Cloudflare edge-supplied address is trusted here. A caller can
  // otherwise send the Vercel-specific header which the shared handler prefers.
  const ip = headers.get('CF-Connecting-IP');
  headers.delete('x-vercel-forwarded-for');
  headers.delete('x-real-ip');
  headers.delete('x-forwarded-for');
  if (ip) headers.set('x-vercel-forwarded-for', ip);
  return handler(new Request(ctx.request, { headers }));
};
