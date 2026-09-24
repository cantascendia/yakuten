import { defineMiddleware } from 'astro:middleware';

/**
 * 乐园手账 (sakura) is the site's only design. All its CSS is scoped under
 * `html.sakura`, so bake the class into the static HTML at build time (Astro
 * runs middleware while prerendering) — crawlers, no-JS visitors and
 * screenshot tools get the real design, and there is no first-paint flash.
 * Head.astro keeps an inline classList.add() as a fallback.
 *
 * Skipped: the /zh/v2/ prototype and /dev/ mounts manage their own skin.
 */
const SKIP = /^\/(?:[a-z]{2,3}\/)?(?:v2|dev)(?:\/|$)/;

export const onRequest = defineMiddleware(async (context, next) => {
  const response = await next();
  const type = response.headers.get('content-type') ?? '';
  if (!type.includes('text/html') || SKIP.test(context.url.pathname)) return response;

  const html = await response.text();
  const patched = html.replace(/<html\b([^>]*)>/i, (_tag, rawAttrs: string) => {
    // Starlight hard-codes data-theme="dark" in static HTML; the site default is
    // light (ThemeProvider override applies the stored choice before paint).
    const attrs = rawAttrs.replace(/\sdata-theme="dark"/i, ' data-theme="light"');
    const tag = `<html${attrs}>`;
    const cls = attrs.match(/\sclass\s*=\s*"([^"]*)"/i);
    if (cls) {
      if (/(^|\s)sakura(\s|$)/.test(cls[1])) return tag;
      return tag.replace(cls[0], ` class="${`${cls[1]} sakura`.trim()}"`);
    }
    return `<html${attrs} class="sakura">`;
  });

  const headers = new Headers(response.headers);
  headers.delete('content-length');
  return new Response(patched, { status: response.status, statusText: response.statusText, headers });
});
