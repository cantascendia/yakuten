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

/**
 * Streaming entry: regex-only renderer for in-flight chunks.
 * Rich rendering (marked + DOMPurify + DOMParser postProcess) on EVERY chunk
 * rebuilds the whole DOM dozens of times per second — text becomes unselectable
 * and low-end devices choke. Use this during the stream; the final flush
 * re-renders once through renderMarkdown().
 */
export function renderMarkdownStreaming(text: string): string {
  return fallbackRender(text);
}

/* ---- DOM post-process (client only; rich path) --------------------------- */

/**
 * Same-origin check via the URL parser — string prefix checks are spoofable:
 * `//evil.example` and `/\evil.example` start with '/' yet navigate off-site,
 * and would otherwise get the trusted in-site card look (phishing surface).
 * Returns true=in-site, false=external http(s), null=reject (other schemes).
 */
function isInternal(href: string): boolean | null {
  try {
    const base = typeof location !== 'undefined' ? location.origin : 'https://hrtyaku.com';
    const u = new URL(href, base);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
    return /(^|\.)hrtyaku\.com$/i.test(u.hostname) || (typeof location !== 'undefined' && u.origin === location.origin);
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
  // tabindex=0 makes the scroll port keyboard-reachable (WCAG 2.1.1 — an
  // overflow:auto region a keyboard user cannot focus is content they cannot
  // reach). Deliberately NO role="region": a landmark role requires an
  // accessible name, which would mean a new string in all 17 locales; a bare
  // focusable scroll container already satisfies 2.1.1.
  root.querySelectorAll('table').forEach((table) => {
    table.classList.add('yk-ai-table');
    const wrap = doc.createElement('div');
    wrap.className = 'yk-ai-tablewrap';
    wrap.setAttribute('tabindex', '0');
    table.replaceWith(wrap);
    wrap.appendChild(table);
  });

  // Fenced code → wrapper + copy button (component delegates [data-yk-copy] click).
  root.querySelectorAll('pre').forEach((pre) => {
    const wrap = doc.createElement('div');
    wrap.className = 'yk-ai-prewrap';
    pre.replaceWith(wrap);
    wrap.appendChild(pre);
    pre.setAttribute('tabindex', '0'); // same rationale as .yk-ai-tablewrap above
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

/**
 * Merge the inline-level fallback output into the SAME block structure marked
 * produces: runs of <li> get wrapped in <ul>/<ol>, blank lines split <p>, and
 * <hr>/heading lines stay outside paragraphs.
 *
 * Why this exists: the stream renders through fallbackRender and the final
 * flush through marked. When the two emit different block shapes, the last
 * frame of every answer re-lays-out the whole message (paragraph margins
 * appear, list indent shifts). Converging the shapes here removes that jump.
 *
 * NOTE: this pairs with deleting `.yk-ai-li { margin-inline-start:1.2em }` in
 * BASE_CSS — once the <li> lives inside a <ul>, indent is owned by
 * `ul { padding-inline-start:1.4em }` and the old margin double-indents.
 */
function blockify(html: string): string {
  const out: string[] = [];
  let listBuf: string[] = [];
  let listTag: 'ul' | 'ol' | null = null;
  let paraBuf: string[] = [];

  const flushList = () => {
    if (listTag && listBuf.length) out.push(`<${listTag}>${listBuf.join('')}</${listTag}>`);
    listBuf = [];
    listTag = null;
  };
  const flushPara = () => {
    if (paraBuf.length) out.push(`<p>${paraBuf.join('<br/>')}</p>`);
    paraBuf = [];
  };

  for (const line of html.split('\n')) {
    const li = /^<li class="yk-ai-li yk-ai-li--(ul|ol)">/.exec(line);
    if (li) {
      flushPara();
      const tag = li[1] as 'ul' | 'ol';
      if (listTag && listTag !== tag) flushList();
      listTag = tag;
      listBuf.push(line);
      continue;
    }
    flushList();
    if (!line.trim()) {
      flushPara();
      continue;
    }
    if (/^<(hr|strong class="yk-ai-h)/.test(line)) {
      flushPara();
      out.push(line);
      continue;
    }
    paraBuf.push(line);
  }
  flushList();
  flushPara();
  return out.join('');
}

function fallbackRender(text: string): string {
  const inline = text
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
    .replace(/`([^`]+)`/g, '<code class="yk-ai-code">$1</code>');
  // Newlines are consumed by blockify (it turns intra-paragraph ones into <br/>).
  return blockify(inline);
}

/** Test-only export: blockify is a pure function and is unit-verified. */
export const __test__ = { blockify, fallbackRender };
