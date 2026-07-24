/**
 * aiMarkdown — the AI chat's message renderer.
 *
 * Rich path: marked (GFM: tables, nested lists, fenced code) → DOMPurify sanitize
 * (AI output is treated as untrusted) → DOM post-process (in-site link cards,
 * table scroll wrappers, code-block copy buttons). marked + DOMPurify are loaded
 * via dynamic import() so they stay OUT of the initial island bundle (the FAB is
 * global) — ensureRichMarkdown() is called on mount and rendering upgrades once
 * ready. Until then (and if the import fails) a lightweight escape-first regex
 * fallback keeps messages readable.
 *
 * Neither marked (v12+) nor DOMPurify use eval/new Function, so both are compatible
 * with the site CSP (`script-src 'self' 'unsafe-inline'`, no unsafe-eval).
 */

const DOC_ICON_SVG =
  '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>';
const COPY_ICON_SVG =
  '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';

let copyLabel = 'Copy';
/** Component sets the localized aria-label for code-block copy buttons. */
export function setCopyLabel(label: string): void {
  copyLabel = label;
}

/* ---- rich renderer (lazy) ------------------------------------------------ */

type MarkedParse = (src: string, opts?: Record<string, unknown>) => string;
type Sanitize = (dirty: string, cfg?: Record<string, unknown>) => string;

let markedParse: MarkedParse | null = null;
let sanitize: Sanitize | null = null;
let loadPromise: Promise<void> | null = null;

export function isRichReady(): boolean {
  return markedParse !== null && sanitize !== null;
}

/** Dynamically load + configure marked and DOMPurify. Idempotent. */
export function ensureRichMarkdown(): Promise<void> {
  if (isRichReady()) return Promise.resolve();
  if (loadPromise) return loadPromise;
  if (typeof window === 'undefined') return Promise.resolve();
  loadPromise = Promise.all([import('marked'), import('dompurify')])
    .then(([markedMod, purifyMod]) => {
      const marked = markedMod.marked;
      marked.setOptions({ gfm: true, breaks: true });
      markedParse = (src) => marked.parse(src, { async: false }) as string;
      const DOMPurify = purifyMod.default;
      sanitize = (dirty) => DOMPurify.sanitize(dirty, { USE_PROFILES: { html: true } });
    })
    .catch(() => {
      // leave fallback in place
      markedParse = null;
      sanitize = null;
    });
  return loadPromise;
}

/** Public entry: rich if loaded, else lightweight fallback. */
export function renderMarkdown(text: string): string {
  if (markedParse && sanitize) {
    try {
      const clean = sanitize(markedParse(text));
      return postProcess(clean);
    } catch {
      /* fall through to fallback */
    }
  }
  return fallbackRender(text);
}

/* ---- DOM post-process (client only; rich path) --------------------------- */

function isInternal(href: string): boolean | null {
  if (href.startsWith('/')) return true;
  try {
    const u = new URL(href);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
    return /(^|\.)hrtyaku\.com$/i.test(u.hostname);
  } catch {
    return null;
  }
}

function postProcess(html: string): string {
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html');
  const root = doc.body.firstElementChild as HTMLElement;
  if (!root) return html;

  // Anchors → in-site link cards / external links.
  root.querySelectorAll('a').forEach((a) => {
    const href = a.getAttribute('href') || '';
    const label = a.textContent || href;
    const internal = isInternal(href);
    if (internal === null) {
      a.replaceWith(doc.createTextNode(label));
      return;
    }
    if (internal) {
      const card = doc.createElement('a');
      card.className = 'yk-ai-linkcard';
      card.setAttribute('href', href);
      const icon = doc.createElement('span');
      icon.className = 'yk-ai-linkcard__icon';
      icon.setAttribute('aria-hidden', 'true');
      icon.innerHTML = DOC_ICON_SVG;
      const lab = doc.createElement('span');
      lab.className = 'yk-ai-linkcard__label';
      lab.textContent = label;
      const arr = doc.createElement('span');
      arr.className = 'yk-ai-linkcard__arrow';
      arr.setAttribute('aria-hidden', 'true');
      arr.textContent = '→';
      card.append(icon, lab, arr);
      a.replaceWith(card);
    } else {
      a.className = 'yk-ai-extlink';
      a.setAttribute('rel', 'noopener noreferrer');
      a.setAttribute('target', '_blank');
    }
  });

  // Tables → horizontal-scroll wrapper (mobile never overflows the page body).
  root.querySelectorAll('table').forEach((table) => {
    table.classList.add('yk-ai-table');
    const wrap = doc.createElement('div');
    wrap.className = 'yk-ai-tablewrap';
    table.replaceWith(wrap);
    wrap.appendChild(table);
  });

  // Fenced code → wrapper + copy button (component delegates [data-yk-copy] click).
  root.querySelectorAll('pre').forEach((pre) => {
    const wrap = doc.createElement('div');
    wrap.className = 'yk-ai-prewrap';
    pre.replaceWith(wrap);
    wrap.appendChild(pre);
    const btn = doc.createElement('button');
    btn.className = 'yk-ai-copybtn';
    btn.type = 'button';
    btn.setAttribute('data-yk-copy', '');
    btn.setAttribute('aria-label', copyLabel);
    btn.innerHTML = COPY_ICON_SVG;
    wrap.appendChild(btn);
  });

  return root.innerHTML;
}

/* ---- lightweight fallback (escape-first regex; no external deps) ---------- */

function escapeAttr(url: string): string {
  return url.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

function buildLinkHtml(label: string, hrefRaw: string): string {
  const href = hrefRaw.replace(/&amp;/g, '&');
  const internal = isInternal(href);
  if (internal === null) return label;
  const attr = escapeAttr(href);
  if (internal) {
    return (
      `<a class="yk-ai-linkcard" href="${attr}">` +
      `<span class="yk-ai-linkcard__icon" aria-hidden="true">${DOC_ICON_SVG}</span>` +
      `<span class="yk-ai-linkcard__label">${label}</span>` +
      `<span class="yk-ai-linkcard__arrow" aria-hidden="true">→</span>` +
      `</a>`
    );
  }
  return `<a class="yk-ai-extlink" href="${attr}" rel="noopener noreferrer" target="_blank">${label}</a>`;
}

function fallbackRender(text: string): string {
  return text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/^---$/gm, '<hr class="yk-ai-hr"/>')
    .replace(/^### (.+)$/gm, '<strong class="yk-ai-h yk-ai-h--3">$1</strong>')
    .replace(/^## (.+)$/gm, '<strong class="yk-ai-h yk-ai-h--2">$1</strong>')
    .replace(
      /\[([^\]]+)\]\((https?:\/\/[^\s<>()]+|\/[^\s<>()]*)\)/g,
      (_m, label: string, href: string) => buildLinkHtml(label, href),
    )
    .replace(
      /(^|[\s])(https?:\/\/[^\s<>()]+)/g,
      (_m, pre: string, url: string) =>
        pre + buildLinkHtml(url.replace(/^https?:\/\/(www\.)?/i, '').slice(0, 64), url),
    )
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^[*\-] (.+)$/gm, '<li class="yk-ai-li yk-ai-li--ul">$1</li>')
    .replace(/^\d+\.\s(.+)$/gm, '<li class="yk-ai-li yk-ai-li--ol">$1</li>')
    .replace(/`([^`]+)`/g, '<code class="yk-ai-code">$1</code>')
    .replace(/\n/g, '<br/>');
}
