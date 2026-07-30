import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { getLocale, AI_COPY } from './aiChatL10n';
import type { AIChatCopy } from './aiChatL10n';
import { containsCrisisKeyword, getCrisisHotlines } from './crisisSupport';
import type { CrisisHotline } from './crisisSupport';
import { detectSomaticEmergency } from './somaticEmergency';
import SomaticEmergencyCard from './SomaticEmergencyCard';
import { useChatSessions } from './useChatSessions';
import type { StoredMessage } from '../../utils/ai-chat/storage';
import ChatSessionSidebar from './ChatSessionSidebar';
import { renderMarkdown, renderMarkdownStreaming, ensureRichMarkdown, isRichReady, setCopyLabel } from './aiMarkdown';

/* =========================================================================
   AIAssistant — 产品级 AI 对话（claude.ai / chatgpt 式全屏窗口 + 手机适配）
   ------------------------------------------------------------------------
   · 端点契约零改动：POST /api/ai-chat {messages}，流式纯文本。
   · 隐私红线：会话仅在用户 opt-in 后存本机 localStorage（useChatSessions），
     默认零存储；apiContent（页面上下文前缀）绝不落盘。
   · 保留：流式 + 指数退避重试、危机词本地拦截热线卡、页面上下文注入、
     站内链接卡、17 语、双主题、完整 a11y。
   · 新增（产品级）：多会话侧栏、复制 / 重新生成 / 编辑重发、停止生成、
     自增长输入、自动滚动 + 回到底部、模型徽章、限流倒计时、离线条、
     富 Markdown（表格 / 代码块 / 嵌套列表，marked+DOMPurify）。
   · page 模式（!compact）= 全屏两栏；compact 模式 = FAB 单栏 + 抽屉历史。
   ========================================================================= */

let pageContextOptOut = false;

import { AIChatIcon } from './AIChatIcon';
export { AIChatIcon };

/** 清洗 document.title：去站名后缀；专用工具页 / 异常标题返回 null。 */
function getPageTitle(): string | null {
  if (typeof document === 'undefined' || typeof window === 'undefined') return null;
  if (window.location.pathname.includes('/tools/ai-assistant')) return null;
  let t = (document.title || '').split('|')[0];
  t = t.replace(/\s*[-–—·]\s*HRT药典\s*$/, '').trim();
  if (!t || t === 'HRT药典' || t.length > 120) return null;
  return t;
}

const MAX_CONTENT_BYTES = 4096; // 端点单条上限
const MAX_SENT_MESSAGES = 10; // 端点只用最近 10 条
const byteLen = (s: string) => new TextEncoder().encode(s).length;

/* =========================================================================
   本地用量记账（隐私：只存计数，绝不存对话内容，绝不上报任何 analytics）
   ------------------------------------------------------------------------
   两级**滚动窗口**（owner 2026-07-29，Claude 模式）：
   · session — 5 小时窗口，从该窗口内第一次提问起算
   · weekly  — 7 天窗口，同上
   任一级用满即停；窗口结束后该级整体恢复，下次提问再开新窗口。
   不用自然日：那会让"差 10 分钟到午夜"变成可用量翻倍，重置时刻也与用户的
   使用节奏无关。
   配额数值与 api/ai-chat.ts 的 SESSION_LIMIT / WEEKLY_LIMIT 必须保持一致，
   推导依据写在该文件（限额目的是防单 IP 刷爆，不是分配稀缺资源）。
   ========================================================================= */
/** 深度会话上限约 15-20 轮，25 留 ~25% 余量 —— 正常用户碰不到 */
const SESSION_QUOTA = 25;
/** = 6 个满额 5h 窗口/周 */
const WEEKLY_QUOTA = 150;
const SESSION_WINDOW_MS = 5 * 60 * 60 * 1000;
const WEEKLY_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const USAGE_KEY = 'yk-ai-usage';
/** 思考模式偏好（UI 偏好，非健康数据；与会话内容完全无关） */
const MODE_KEY = 'yk-ai-mode';

/** start = 0 表示尚未开窗（全新用户 / 窗口已过期）。 */
interface UsageWindow { start: number; used: number }
interface UsageRecord { s: UsageWindow; w: UsageWindow }

const EMPTY_WINDOW: UsageWindow = { start: 0, used: 0 };
const EMPTY_USAGE: UsageRecord = { s: EMPTY_WINDOW, w: EMPTY_WINDOW };

/** 单个窗口的解析 + 过期归零。未来时间戳（用户改过系统时钟）也按过期处理，
 *  否则额度会被永久锁死。 */
function parseWindow(raw: unknown, windowMs: number): UsageWindow {
  const w = raw as Partial<UsageWindow> | null | undefined;
  const start = w?.start;
  const used = w?.used;
  if (typeof start !== 'number' || !Number.isFinite(start) || start <= 0) return EMPTY_WINDOW;
  if (typeof used !== 'number' || !Number.isFinite(used)) return EMPTY_WINDOW;
  const age = Date.now() - start;
  if (age < 0 || age >= windowMs) return EMPTY_WINDOW;
  return { start, used: Math.max(0, Math.floor(used)) };
}

/** 读取两级计数。旧格式（`{day,used}` 或 `{windowStart,used}`）没有 s/w 字段 →
 *  parseWindow 直接落到"尚未开窗"，下次提问重新开窗。对用户只会更宽松，且不必
 *  为一次性迁移引入日期换算。 */
function readUsage(): UsageRecord {
  if (typeof localStorage === 'undefined') return EMPTY_USAGE;
  try {
    const raw = localStorage.getItem(USAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<UsageRecord> | null;
      return {
        s: parseWindow(parsed?.s, SESSION_WINDOW_MS),
        w: parseWindow(parsed?.w, WEEKLY_WINDOW_MS),
      };
    }
  } catch { /* 隐私模式 / 配额满 / 脏数据 / 旧格式：静默回落到未开窗 */ }
  return EMPTY_USAGE;
}

function writeUsage(rec: UsageRecord): void {
  if (typeof localStorage === 'undefined') return;
  try { localStorage.setItem(USAGE_KEY, JSON.stringify(rec)); } catch { /* ignore */ }
}

/** 该窗口距恢复的剩余毫秒；未开窗返回 0。 */
function windowResetInMs(w: UsageWindow, windowMs: number): number {
  if (w.start <= 0) return 0;
  return Math.max(0, w.start + windowMs - Date.now());
}

/** 时段级剩余毫秒 → 「约 X 小时 Y 分后恢复」。不足 1 分按 1 分（不出现 0）。 */
function formatSessionResetIn(ms: number, ui: AIChatCopy): string {
  const totalMin = Math.max(1, Math.ceil(ms / 60_000));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h > 0 && m > 0) return ui.usageResetIn.replace('{h}', String(h)).replace('{m}', String(m));
  if (h > 0) return ui.usageResetInHours.replace('{h}', String(h));
  return ui.usageResetInMinutes.replace('{m}', String(m));
}

/** 周级剩余毫秒 → 「约 X 天后恢复」；不足 1 天降级到小时（周窗口末尾说"1 天"
 *  会让用户以为还要等整整一天）。 */
function formatWeeklyResetIn(ms: number, ui: AIChatCopy): string {
  const HOUR = 60 * 60 * 1000;
  if (ms >= 24 * HOUR) {
    return ui.usageWeeklyResetInDays.replace('{d}', String(Math.ceil(ms / (24 * HOUR))));
  }
  return ui.usageWeeklyResetInHours.replace('{h}', String(Math.max(1, Math.ceil(ms / HOUR))));
}

function formatQuotaResetIn(scope: 'session' | 'weekly', ms: number, ui: AIChatCopy): string {
  return scope === 'weekly' ? formatWeeklyResetIn(ms, ui) : formatSessionResetIn(ms, ui);
}

/* =========================================================================
   GA4 用量埋点 —— 纯计数，零内容
   ------------------------------------------------------------------------
   ⚠️ 红线（CONSTITUTION §6 / CLAUDE.md「第三方分析只限聚合指标」）：
   · 参数值**必须是本文件里写死的字面量或数字**。绝不接受任何来自用户输入或
     模型输出的字符串 —— 一个自由文本字段都不能有。新增事件前先问：这个值有
     没有可能承载用户说了什么？有 → 不发。
   · **不发 x-yk-route / x-yk-model**：那是排障信息，与用户身份关联后可推断
     行为，只走服务端日志（api/ai-chat.ts 的 logServed）。
   · 复用 Head.astro 已装载的 gtag 通路（同一 dataLayer、同一 `ga-disable-`
     开关），不新起 gtag 脚本或 config；`yakuten-dev` opt-out 再显式挡一道。
   ⚠️ 站内目前没有共享的 GA 封装模块（Head.astro 里是 inline gtag），故本
     helper 就地实现；日后若抽出公共封装，此处应替换为调用它。
   ========================================================================= */
type TrackEvent = 'ai_chat_open' | 'ai_chat_send' | 'ai_chat_reply' | 'ai_chat_error' | 'ai_chat_limit';

function track(event: TrackEvent, params?: Record<string, string | number | boolean>): void {
  try {
    if (typeof window === 'undefined') return;
    if (localStorage.getItem('yakuten-dev') === '1') return;
    const gtag = (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag;
    if (typeof gtag === 'function') gtag('event', event, params ?? {});
  } catch { /* 隐私模式 / 拦截器 / GA 未加载：埋点失败绝不影响对话 */ }
}

/** 耗时取整到 100ms —— 毫秒级精度对分析无用，粒度越粗越难反推个体。 */
const roundMs = (ms: number) => Math.round(ms / 100) * 100;

/* =========================================================================
   Icon —— 操作条 / 开关统一图标源（20px 线性图标，避免 JSX 里堆 path）
   所有使用处必须自带 aria-label + title；图标本身 aria-hidden。
   ========================================================================= */
type IconName = 'copy' | 'check' | 'regen' | 'edit' | 'stop' | 'close' | 'think';

const ICON_PATHS: Record<IconName, React.ReactNode> = {
  // 复制 = 双叠圆角矩形
  copy: (<><rect x="9" y="9" width="12.5" height="12.5" rx="2.5" /><path d="M5.5 15H4.5A2.5 2.5 0 0 1 2 12.5v-8A2.5 2.5 0 0 1 4.5 2h8A2.5 2.5 0 0 1 15 4.5v1" /></>),
  check: (<polyline points="20 6 9.5 17 4 11.5" />),
  // 重新生成 = 环形箭头
  regen: (<><path d="M20.5 12a8.5 8.5 0 1 1-2.6-6.1L20.5 8" /><polyline points="20.5 3.2 20.5 8 15.7 8" /></>),
  edit: (<><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z" /></>),
  stop: (<rect x="6.5" y="6.5" width="11" height="11" rx="2.5" />),
  close: (<><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>),
  // 深度思考 = 灯泡
  think: (<><path d="M9.5 18h5" /><path d="M10.5 21.5h3" /><path d="M15.2 14.2c.2-1.1.75-1.95 1.55-2.75A5.2 5.2 0 0 0 18.3 7.8a6.3 6.3 0 0 0-12.6 0c0 1.4.5 2.65 1.55 3.65.8.8 1.35 1.65 1.55 2.75" /></>),
};

function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {ICON_PATHS[name]}
    </svg>
  );
}

/** dialog 内 Tab 循环（focus trap）：挂在弹层容器的 onKeyDown。 */
function trapTab(e: React.KeyboardEvent<HTMLElement>) {
  if (e.key !== 'Tab') return;
  const els = e.currentTarget.querySelectorAll<HTMLElement>(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
  );
  if (!els.length) return;
  const first = els[0];
  const last = els[els.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
}

interface AIAssistantProps {
  compact?: boolean;
  onClose?: () => void;
}

/**
 * 等待耗时（秒）—— 挂在 AI 气泡既有的 label 行内，不新增任何一行布局。
 * 自己持有 interval：如果把秒数提到父组件，流式期间每秒会重渲染整个消息列表。
 * 3s 阈值让快回答不闪计数器。
 *
 * 刻意**不做**阶段性假文案（"正在检索指南…"）：端点是纯文本流，不返回任何阶段
 * 信号，写出来的每一句都是编的。在一个"每条医学声明必须挂 DOI"的产品里，界面
 * 声称"正在检索文献"而实际没有，用户会据此高估回答的证据基础 —— 这是可信度事故。
 */
function ElapsedBadge({ since, unit }: { since: number | null; unit: string }) {
  const [sec, setSec] = useState(0);
  useEffect(() => {
    if (!since) { setSec(0); return; }
    const tick = () => setSec(Math.floor((Date.now() - since) / 1000));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [since]);
  if (!since || sec < 3) return null;
  return <span className="yk-ai-msg__elapsed"> · {unit.replace('{s}', String(sec))}</span>;
}

/**
 * 流式正文 —— 已完成的部分走富渲染，只有正在写的那一块走轻渲染。
 *
 * 为什么要拆：流式走 fallbackRender、完成走 marked，两者块结构一致（批次 1 的
 * blockify）但表格/代码块只有 marked 认识。不拆的话一个含表格的回答会在结束那
 * 一帧从"若干行裸竖线文本"整体重排成带边框圆角的滚动卡。
 *
 * head 必须缓存成**同一个 React element 对象**，不能只缓存 __html 字符串：
 * React 19 的 updateProperties 对 dangerouslySetInnerHTML 是无条件重写的 ——
 * 实测同一字符串每 chunk 仍会走一次 `domElement.innerHTML = html`，把已完成段落
 * 的子节点整体销毁重建，鼠标选区随之丢失。返回恒等的 element 让 props 对象引用
 * 也恒等，命中 beginWork 的 oldProps === newProps 提前返回，那棵子树整个不进
 * commit —— 选区才真的留得住（顺带省掉每 chunk 重新 parse 整段已完成正文）。
 */
function StreamBody({ content }: { content: string }) {
  const [head, tail] = useMemo<[string, string]>(() => {
    const cut = content.lastIndexOf('\n\n');
    if (cut <= 0) return ['', content];
    const h = content.slice(0, cut);
    /* 围栏代码块未闭合时不切：marked 会把 head 末尾的开围栏一路吞成代码块，
       切点落在块中间反而制造一次更大的重排。等围栏配平了再切。 */
    if (((h.match(/^```/gm) || []).length) % 2 !== 0) return ['', content];
    return [h, content.slice(cut + 2)];
  }, [content]);
  const headEl = useMemo(
    () => (head ? <div dangerouslySetInnerHTML={{ __html: renderMarkdown(head) }} /> : null),
    [head],
  );
  return (
    <>
      {headEl}
      <div dangerouslySetInnerHTML={{ __html: renderMarkdownStreaming(tail) }} />
    </>
  );
}

/** 替换 messages 末尾 assistant 的内容（流式增量用）。 */
function replaceLastAssistant(prev: StoredMessage[], content: string): StoredMessage[] {
  const u = [...prev];
  const last = u[u.length - 1];
  if (last && last.role === 'assistant') u[u.length - 1] = { role: 'assistant', content };
  return u;
}

const BASE_CSS = `
@keyframes ai-msg-in { from{opacity:0; transform:translateY(8px);} to{opacity:1; transform:none;} }
/* 新挂载区块的统一入场（对话态 log / dock、回底钮、用量条） */
@keyframes ai-enter { from{opacity:0; transform:translateY(6px);} to{opacity:1; transform:none;} }
/* 光标呼吸：谷底停在 .25 而非 0 —— 任何一帧都看得见"还在生成"，又不是终端"等你输入"的硬闪 */
@keyframes ai-caret { 0%,100%{opacity:1} 50%{opacity:.25} }
@keyframes ai-hero-in { from{opacity:0; transform:translateY(16px);} to{opacity:1; transform:none;} }
/* 等待态占位条扫光（只动 transform） */
@keyframes ai-shimmer     { from { transform: translateX(-120%) } to { transform: translateX(320%)  } }
@keyframes ai-shimmer-rtl { from { transform: translateX(120%)  } to { transform: translateX(-320%) } }
.yk-ai {
  display:flex; flex-direction:column; block-size:100%; overflow:hidden; margin:0;
  /* 弹簧缓动 —— ChatGPT 生产实测 linear() 曲线（微交互/常规/回弹三档） */
  --spring-fast: linear(0, .07956 4.02%, .47488 13.851%, .79653 25.733%, .9246 36.734%, .98361 52.535%, .99988);
  --spring-common: linear(0, .08322 5.391%, .46561 17.652%, .76663 31.093%, .92965 47.845%, .99189 74.867%, .9991);
  --spring-bounce: linear(0, .10318 4.799%, .43592 14.679%, .84264 27.782%, 1.02066 38.732%, 1.04598 46.128%, 1.02446 58.294%, .99913 76.919%, 1);
  /* 等待态占位条的皮肤无关局部变量（sakura 在 sakura-ai.css §8 覆盖） */
  --yk-ai-skeleton: var(--color-white-alpha-08, rgba(255,255,255,.08));
  --yk-ai-skeleton-sweep: var(--color-accent-alpha-30, rgba(212,168,83,.3));
}
[data-theme='light'] .yk-ai { --yk-ai-skeleton: var(--color-outline-20); }
/* 中和 Starlight prose 给 .sl-markdown-content 内所有块级元素注入的 margin-top —
   它会逐层撑破全屏布局。消息体/侧栏的显式 margin 由更高（或后载同级）优先级规则恢复。 */
.yk-ai * { margin: 0; }
/* 深空舞台：暗色渐变 + 两团极弱的绯/金光晕（二相乐园氛围层） */
.yk-ai--page {
  background:
    radial-gradient(ellipse 720px 420px at 82% -8%, var(--color-primary-alpha-08, rgba(200,75,124,.08)), transparent 62%),
    radial-gradient(ellipse 560px 380px at 8% 108%, var(--color-accent-alpha-08, rgba(212,168,83,.06)), transparent 60%),
    linear-gradient(180deg, #14111d 0%, #191521 100%);
}
/* 亮色主题（非 sakura）：token 化背景，避免暗底深字对比崩坏 */
[data-theme='light'] .yk-ai--page { background: var(--color-bg, #FAF7F2); }
[data-theme='light'] .yk-ai--compact { background: var(--color-bg-container, #FFFFFF); }
.yk-ai--compact { background: var(--color-bg-container, #1a1625); }
.yk-ai-shell { display:flex; flex:1; min-block-size:0; position:relative; overflow:hidden; }
.yk-ai-srstatus { position:absolute; inline-size:1px; block-size:1px; padding:0; margin:-1px; overflow:hidden; clip:rect(0 0 0 0); white-space:nowrap; border:0; }
.yk-ai-main { flex:1; min-inline-size:0; display:flex; flex-direction:column; block-size:100%; overflow:hidden; }

/* topbar —— 极简：侧栏开关 · 会话名 · 模型徽章；底缘金线渐隐（欢迎态无线，沉浸） */
.yk-ai-topbar { position:relative; display:flex; align-items:center; gap:4px; padding:0 10px; block-size:48px; flex-shrink:0; }
.yk-ai-topbar::after { content:''; position:absolute; inset-inline:0; inset-block-end:0; block-size:1px;
  background: linear-gradient(90deg, transparent, var(--color-accent-alpha-30, rgba(212,168,83,.28)) 18%, var(--color-outline-20) 55%, transparent); }
.yk-ai-topbar--hero::after { content:none; }
.yk-ai--compact .yk-ai-topbar { block-size:44px; padding:0 6px; }
.yk-ai-iconbtn { background:none; border:none; color: var(--color-text-secondary); cursor:pointer; min-inline-size:44px; min-block-size:44px; display:inline-flex; align-items:center; justify-content:center; padding:6px; transition: color var(--transition-fast), background var(--transition-fast); border-radius:10px; }
a.yk-ai-iconbtn { text-decoration:none; }
@media (hover:hover){ .yk-ai-iconbtn:hover{ color: var(--color-text-primary); background: var(--color-white-alpha-03);} }
.yk-ai-iconbtn:focus-visible{ outline:2px solid var(--color-accent); outline-offset:1px; }
.yk-ai-topbar__title { flex:1; min-inline-size:0; font-family: var(--font-display); font-size:.875rem; font-weight:600; color: var(--color-text-secondary); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; padding-inline:6px; letter-spacing:.01em; }
.yk-ai-topbar__model { font-size:.6875rem; color: var(--color-accent-text); font-family: var(--font-mono); letter-spacing:.04em; white-space:nowrap; max-inline-size:200px; overflow:hidden; text-overflow:ellipsis;
  background: var(--color-accent-alpha-08, rgba(212,168,83,.1)); border:1px solid var(--color-accent-alpha-30, rgba(212,168,83,.25)); padding:2px 9px; border-radius:999px; }

.yk-ai-logwrap { flex:1; min-block-size:0; position:relative; display:flex; flex-direction:column; animation: ai-enter .26s var(--spring-common, ease) both; }
.yk-ai-log { flex:1; overflow-y:auto; overflow-x:hidden; padding:32px var(--space-lg); display:flex; flex-direction:column; scrollbar-width:thin; scrollbar-color: var(--color-white-alpha-08, rgba(255,255,255,.08)) transparent; }
/* 平滑滚动只给「回到底部」/切会话。流式期每 chunk 都赋一次 scrollTop，smooth 会
   让每次赋值打断上一段动画 → 视口永远追不上文字，最后几行落在折叠线下。 */
.yk-ai-log--smooth { scroll-behavior:smooth; }
.yk-ai-log::-webkit-scrollbar { inline-size:8px; }
.yk-ai-log::-webkit-scrollbar-thumb { background: var(--color-white-alpha-08, rgba(255,255,255,.08)); border-radius:8px; }
.yk-ai-log::-webkit-scrollbar-track { background: transparent; }
.yk-ai--compact .yk-ai-log { padding:16px 12px; }
/* 问答节奏：同一轮内紧凑（12px），轮与轮之间拉开（12+24=36px） */
.yk-ai-log__inner { inline-size:100%; max-inline-size:48rem; margin-inline:auto; display:flex; flex-direction:column; gap:12px; }
.yk-ai-log__inner > .yk-ai-turn:has(.yk-ai-msg--user):not(:first-child) { margin-block-start:24px; }
.yk-ai--compact .yk-ai-log__inner { gap:10px; }
.yk-ai--compact .yk-ai-log__inner > .yk-ai-turn:has(.yk-ai-msg--user):not(:first-child) { margin-block-start:14px; }

/* ============ 状态 A · 欢迎态「居中舞台」 ============ */
.yk-ai-hero { flex:1; min-block-size:0; overflow-y:auto; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; padding:28px var(--space-lg); animation: ai-hero-in .45s var(--spring-common, ease) both; }
.yk-ai--compact .yk-ai-hero { padding:18px 14px; }
.yk-ai-hero__badge { inline-size:62px; block-size:62px; border-radius:20px; display:flex; align-items:center; justify-content:center; color: var(--color-accent); flex-shrink:0;
  background: linear-gradient(135deg, var(--color-primary-alpha-15, rgba(200,75,124,.18)), var(--color-accent-alpha-08, rgba(212,168,83,.12)));
  border:1px solid var(--color-accent-alpha-30, rgba(212,168,83,.25));
  box-shadow: 0 8px 24px rgba(0,0,0,.25); }
.yk-ai--compact .yk-ai-hero__badge { inline-size:50px; block-size:50px; border-radius:16px; }
.yk-ai-hero__greeting { font-family: var(--font-display); font-size:1.7rem; font-weight:700; color: var(--color-text-primary); letter-spacing:.02em; line-height:1.35; margin-block-start:18px; text-wrap:balance; }
.yk-ai--compact .yk-ai-hero__greeting { font-size:1.15rem; margin-block-start:12px; }
.yk-ai-hero__sub { font-family: var(--font-body); font-size:.9rem; line-height:1.7; max-inline-size:36rem; color: var(--color-text-secondary); margin-block-start:8px; text-wrap:balance; }
.yk-ai--compact .yk-ai-hero__sub { font-size:.8125rem; }
.yk-ai-hero__composer { inline-size:100%; max-inline-size:48rem; margin-block-start:28px; }
.yk-ai--compact .yk-ai-hero__composer { margin-block-start:16px; }
.yk-ai-pills { display:flex; flex-wrap:wrap; justify-content:center; gap:8px; max-inline-size:46rem; margin-block-start:18px; }
.yk-ai-pill { display:inline-flex; align-items:center; gap:7px; background: var(--color-white-alpha-03, rgba(255,255,255,.03)); border:1px solid var(--color-outline-20); color: var(--color-text-secondary); padding:8px 16px; font-size:.8125rem; font-family: var(--font-body); line-height:1.4; cursor:pointer; border-radius:999px; transition: border-color var(--transition-fast), color var(--transition-fast), background var(--transition-fast), transform .25s var(--spring-fast, ease); }
.yk-ai-pill::before { content:'✦'; color: var(--color-accent); opacity:.5; font-size:.6875rem; transition: opacity var(--transition-fast); }
@media (hover:hover){ .yk-ai-pill:hover{ border-color: var(--color-primary); color: var(--color-text-primary); background: var(--color-primary-alpha-08, rgba(200,75,124,.07)); transform: translateY(-1px); } .yk-ai-pill:hover::before{ opacity:1; } }
.yk-ai-pill:focus-visible { outline:2px solid var(--color-accent); outline-offset:2px; }

/* ============ 消息 —— 用户=绯色渐变胶囊；AI=无框直排 + 金瓣标识 ============ */
.yk-ai-turn { display:flex; flex-direction:column; gap:8px; animation: ai-msg-in .3s var(--spring-common, ease) both; }
/* 16px 正文 —— 医疗长文逐字读，claude.ai / ChatGPT 同档；行高 1.8→1.75 抵消行距增长 */
.yk-ai-msg { font-family: var(--font-body); font-size:1rem; color: var(--color-text-primary); }
.yk-ai--compact .yk-ai-msg { font-size:.9375rem; }
/* 四角对称卡（缺角气泡是 IM 社交软件语言，三家 AI 产品均为对称 rounded） */
.yk-ai-msg--user { align-self:flex-end; max-inline-size:76%; inline-size:fit-content; padding:12px 18px; line-height:1.65; white-space:pre-wrap;
  background: linear-gradient(135deg, var(--color-primary-alpha-15, rgba(200,75,124,.18)), var(--color-primary-alpha-08, rgba(200,75,124,.08)));
  border:1px solid var(--color-primary-alpha-30, rgba(200,75,124,.32));
  border-radius:16px; box-shadow: 0 2px 12px rgba(0,0,0,.12); }
[data-theme='light'] .yk-ai-msg--user { border-color: var(--color-primary-alpha-40, rgba(200,75,124,.42)); }
/* FAB 面板 ~360px 宽：76% = 274px，中文一行仅约 17 字，用户自己的问题被切得很碎 */
.yk-ai--compact .yk-ai-msg--user { max-inline-size:88%; }
/* ⚠️ line-height 与 .yk-ai-pending{block-size} 必须同步 —— 零位移保证就建立在
   "占位条高度 == 正文一行行高"上。改这里必须同改那里。 */
.yk-ai-msg--ai { align-self:stretch; max-inline-size:100%; padding:0; line-height:1.75; background:none; border:none; }
/* AI 标识降噪：灰字 12px + 仅图标留金（回复本体才是主角） */
.yk-ai-msg__label { display:flex; align-items:center; gap:7px; font-size:.75rem; color: var(--color-text-muted); font-family: var(--font-body); letter-spacing:.02em; margin-block-end:8px; }
.yk-ai-msg__label svg { color: var(--color-accent-text); }
/* 等待态状态文案 —— 挂在既有 label 行内，不新增任何一行布局 */
.yk-ai-msg__state { color: var(--color-text-muted); }
.yk-ai-msg__state::before { content:'·'; margin-inline:6px 6px; opacity:.5; }
.yk-ai-msg__elapsed { font-variant-numeric: tabular-nums; opacity:.8; }
/* 流式光标 —— CSS 画的实心块（原 '▍' U+2589 是字形：17 语字体回退不一，且会参与
   断行独占一行）。尺寸走 em，锁在正文行盒内，永不撑高行高。
   ⚠️ 必须挂在**尾块的最后一行行内**，不能挂在外层 div 上：blockify() 之后正文
   全是块级元素（<p>/<ul>/…），挂在 div 上的 ::after 会自己生成一个匿名块行盒 →
   光标独占一行，流式结束时再塌掉，正好是 28px 的假位移。 */
.yk-ai-msg--streaming > div:last-child > :last-child:not(ul):not(ol):not(hr):not(.yk-ai-tablewrap):not(.yk-ai-prewrap)::after,
.yk-ai-msg--streaming > div:last-child > :is(ul,ol):last-child > li:last-child::after {
  content:''; display:inline-block;
  inline-size:.46em; block-size:1.05em; vertical-align:-.18em;
  margin-inline-start:.14em; border-radius:1px;
  background: var(--color-accent-text);
  animation: ai-caret 1.3s ease-in-out infinite;
}

/* 正文槽位占位条 —— block-size 必须 == .yk-ai-msg--ai 的 line-height（1.75em），
   首 token 到达时第一行文字正好落在 shimmer 原位，位移 = 0px。 */
.yk-ai-pending { display:flex; align-items:center; block-size:1.75em; }
.yk-ai-pending__bar { position:relative; overflow:hidden; block-size:.7em; inline-size:min(260px, 58%); border-radius:999px; background: var(--yk-ai-skeleton); }
.yk-ai-pending__bar::after { content:''; position:absolute; inset-block:0; inset-inline-start:0; inline-size:45%;
  background: linear-gradient(90deg, transparent, var(--yk-ai-skeleton-sweep), transparent);
  transform: translateX(-120%); animation: ai-shimmer 1.15s ease-in-out infinite; }
[dir="rtl"] .yk-ai-pending__bar::after { animation-name: ai-shimmer-rtl; }

/* 操作条常显（Claude/Gemini 路线：移动端无 hover，复制/重答是高频动作）。
   block-size 恒定 = 零位移的机制本身：加载态只切 opacity，DOM 高度永不变。
   不要改成 min-block-size。 */
.yk-ai-actions { display:flex; gap:2px; align-self:flex-start; margin-block-start:-4px; block-size:38px; transition: opacity var(--transition-fast); }
.yk-ai-actions--user { align-self:flex-end; }
.yk-ai-actions--pending { opacity:0; pointer-events:none; }
/* 图标化操作钮：文案转 aria-label + title（17 语 l10n 继续生效），热区不缩水 */
.yk-ai-actbtn { background:none; border:none; color: var(--color-text-muted); cursor:pointer; min-inline-size:38px; min-block-size:38px; display:inline-flex; align-items:center; justify-content:center; gap:4px; padding:4px 8px; font-size:.75rem; font-family: var(--font-body); transition: color var(--transition-fast); border-radius:8px; }
@media (hover:hover){ .yk-ai-actbtn:hover{ color: var(--color-primary-light);} }
.yk-ai-actbtn:focus-visible{ outline:2px solid var(--color-accent); outline-offset:1px; }
/* 复制成功：与代码块 .yk-ai-copybtn--done 同一绿色语义 */
.yk-ai-actbtn--done { color: var(--color-safe); }
@media (hover:hover){ .yk-ai-actbtn--done:hover{ color: var(--color-safe);} }

.yk-ai-edit { display:flex; flex-direction:column; gap:6px; align-self:flex-end; inline-size:min(560px, 92%); }
.yk-ai-edit__area { inline-size:100%; min-block-size:64px; padding:10px 12px; background: var(--color-bg-container); color: var(--color-text-primary); border:1px solid var(--color-primary); font-family: var(--font-body); font-size:.9rem; line-height:1.6; resize:vertical; border-radius:12px; outline:none; }
/* outline:none 只是为了去掉 UA 方角环 —— border 是恒定的，不自己补一个焦点指示
   就等于一个可输入控件完全没有焦点态（WCAG 2.4.7 硬伤）。 */
.yk-ai-edit__area:focus-visible { outline:2px solid var(--color-accent); outline-offset:1px; }
.yk-ai-edit__area:focus { border-color: var(--color-primary-light); }
.yk-ai-edit__row { display:flex; gap:8px; justify-content:flex-end; }

/* rich markdown blocks */
.yk-ai-msg .yk-ai-h { display:block; margin-top:.75em; font-weight:700; }
.yk-ai-msg h1 { font-family: var(--font-display); font-size:1.35em; font-weight:700; margin:1em 0 .4em; color: var(--color-text-primary); border-block-end:1px solid var(--color-outline-20); padding-block-end:4px; }
.yk-ai-msg h2 { font-family: var(--font-display); font-size:1.2em; font-weight:700; margin:.85em 0 .35em; color: var(--color-text-primary); }
.yk-ai-msg h3,.yk-ai-msg h4 { font-family: var(--font-display); font-size:1.05em; font-weight:600; margin:.7em 0 .25em; color: var(--color-accent-text); }
.yk-ai-msg ul,.yk-ai-msg ol { margin:.45em 0; padding-inline-start:1.4em; display:flex; flex-direction:column; gap:4px; }
/* 流式 fallback 与 marked 现在产出同构的 <ul>/<ol>，marker 由列表容器统一决定
   （原 list-style:revert 会回落到 Starlight prose 的列表样式）。 */
.yk-ai-msg ul { list-style:disc; }
.yk-ai-msg ol { list-style:decimal; }
.yk-ai-msg li { list-style:inherit; }
.yk-ai-msg li::marker { color: var(--color-accent-text); }
/* ⚠️ 不要给 .yk-ai-li 加 margin-inline-start —— blockify() 已把它包进 <ul>，
   缩进由上面的 padding-inline-start:1.4em 统一负责，再加就是双重缩进。 */
.yk-ai-li--ul { list-style:disc; } .yk-ai-li--ol { list-style:decimal; }
.yk-ai-msg p { margin:.45em 0; }
.yk-ai-msg--ai > div > p:first-child { margin-block-start:0; }
/* 尾块最后一段不留下边距：流式期 tail 从"空（仅光标）"长出第一段时高度不变，
   且与完成态的气泡↔操作条间距保持一致。 */
.yk-ai-msg--ai > div:last-child > p:last-child { margin-block-end:0; }
/* AI 很爱用 blockquote 放注意事项：2px 淡边 + 次级字读不出"这里是提示"。
   圆角走逻辑属性 —— 物理写法在 ar/fa 下会长在错误的一侧。 */
.yk-ai-msg blockquote { margin:.6em 0; padding:8px 12px;
  border-inline-start:3px solid var(--color-accent-text);
  background: var(--color-white-alpha-03, rgba(255,255,255,.03));
  border-start-start-radius:0; border-end-start-radius:0;
  border-start-end-radius:8px; border-end-end-radius:8px;
  color: var(--color-text-secondary); }
[data-theme='light'] .yk-ai-msg blockquote { background: var(--color-primary-alpha-08, rgba(200,75,124,.07)); }
.yk-ai-hr { border:none; border-top:1px solid var(--color-outline-20); margin:.8em 0; }
.yk-ai-code, .yk-ai-msg code { background: var(--color-white-alpha-08); padding:.12em .35em; font-size:.85em; font-family: var(--font-code); border-radius:4px; }
.yk-ai-prewrap { position:relative; margin:.6em 0; }
.yk-ai-msg pre { background: rgba(12,10,18,.7); border:1px solid var(--color-outline-20); padding:12px 14px; overflow-x:auto; font-size:.875em; border-radius:10px; box-shadow: inset 0 1px 3px rgba(0,0,0,.3); }
[data-theme='light'] .yk-ai-msg pre { background: rgba(74,40,56,.05); box-shadow:none; }
.yk-ai-msg pre code { background:none; padding:0; font-size:1em; }
.yk-ai-copybtn { position:absolute; inset-block-start:7px; inset-inline-end:7px; background: var(--color-bg-container); border:1px solid var(--color-outline-20); color: var(--color-text-muted); cursor:pointer; inline-size:38px; block-size:38px; display:inline-flex; align-items:center; justify-content:center; border-radius:8px; transition: color var(--transition-fast), border-color var(--transition-fast); }
@media (hover:hover){ .yk-ai-copybtn:hover{ color: var(--color-primary-light); border-color: var(--color-primary);} }
/* 代码块复制成功：图标临时换对勾（按钮 DOM 由 aiMarkdown.ts 生成，此处纯 CSS 换形） */
.yk-ai-copybtn--done { color: var(--color-safe); border-color: var(--color-safe); }
.yk-ai-copybtn--done > svg { display:none; }
.yk-ai-copybtn--done::after { content:'✓'; font-size:15px; font-weight:700; line-height:1; }
.yk-ai-tablewrap { overflow-x:auto; margin:.6em 0; border:1px solid var(--color-outline-20); border-radius:10px; box-shadow: 0 2px 10px rgba(0,0,0,.2); }
[data-theme='light'] .yk-ai-tablewrap { box-shadow: 0 2px 10px rgba(74,40,56,.08); }
/* 表格/代码块的滚动口由 aiMarkdown.ts 加了 tabindex="0"（WCAG 2.1.1）——
   新增可聚焦元素必须同时给焦点环。 */
.yk-ai-tablewrap, .yk-ai-msg pre { scrollbar-width:thin; }
.yk-ai-tablewrap:focus-visible, .yk-ai-msg pre:focus-visible { outline:2px solid var(--color-accent); outline-offset:2px; }
.yk-ai-table { border-collapse:collapse; font-size:.85em; min-inline-size:100%; }
.yk-ai-table th,.yk-ai-table td { border-block-end:1px solid var(--color-outline-20); padding:8px 12px; text-align:start; }
/* 表头短、宜整行；数据格常是 CJK 长句，nowrap 会把整表撑成一行横滚 */
.yk-ai-table th { white-space:nowrap; }
.yk-ai-table td { white-space:normal; min-inline-size:6em; }
.yk-ai-table tr:last-child td { border-block-end:none; }
.yk-ai-table th { background: var(--color-white-alpha-03); font-weight:700; color: var(--color-accent-text); font-family: var(--font-body); }

/* in-site link card + ext link */
.yk-ai-msg a.yk-ai-linkcard { display:flex; align-items:center; gap:8px; margin-block:6px; padding:8px 10px; background: var(--color-bg-container, #1a1625); border:1px solid var(--color-outline-20); border-inline-start:3px solid var(--color-accent); color: var(--color-text-primary); text-decoration:none; font-size:.8125rem; transition: border-color var(--transition-fast); }
@media (hover:hover){ .yk-ai-msg a.yk-ai-linkcard:hover{ border-color: var(--color-primary);} }
.yk-ai-msg a.yk-ai-linkcard:focus-visible{ outline:2px solid var(--color-accent); outline-offset:2px; }
.yk-ai-linkcard__icon{ display:inline-flex; color: var(--color-accent); flex-shrink:0; }
.yk-ai-linkcard__label{ flex:1; min-inline-size:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.yk-ai-linkcard__arrow{ flex-shrink:0; color: var(--color-text-muted); }
[dir="rtl"] .yk-ai-linkcard__arrow{ transform:scaleX(-1); display:inline-block; }
.yk-ai-msg a.yk-ai-extlink{ color: var(--color-primary-light); text-decoration:underline; text-underline-offset:2px; }

/* crisis card */
.yk-ai-crisis { background: var(--color-danger-dark, #D32F2F); border:1px solid var(--color-danger); color:#fff; padding:10px 12px; font-family: var(--font-body); display:flex; flex-direction:column; gap:6px; align-self:stretch; }
/* ⚠️ 红线：危机卡只能强化不能弱化。[P1-6] 把正文从 15.5px 提到 16px，这三处
   字号必须同步上调，否则本次改动的净效果是相对削弱了危机卡的视觉分量。 */
.yk-ai-crisis__title{ font-weight:700; font-size:.9375rem; color:#fff; margin:0; }
.yk-ai-crisis__body{ margin:0; font-size:.8125rem; line-height:1.5; color:#fff; }
.yk-ai-crisis__list{ display:flex; flex-direction:column; gap:4px; }
.yk-ai-crisis__line{ display:flex; align-items:center; justify-content:space-between; gap:8px; min-block-size:44px; padding:2px 8px; border:1px solid rgba(255,255,255,.55); color:#fff; text-decoration:underline; text-underline-offset:2px; }
.yk-ai-crisis__line:focus-visible{ outline:3px solid #fff; outline-offset:2px; }
.yk-ai-crisis__name{ font-size:.75rem; line-height:1.4; }
.yk-ai-crisis__num{ font-family: var(--font-mono, monospace); font-weight:700; font-size:.875rem; white-space:nowrap; }
.yk-ai-crisis__note{ margin:0; font-size:.75rem; line-height:1.5; color:#fff; }

.yk-ai-scrollbtn { position:absolute; inset-block-end:14px; inset-inline-end:18px; inline-size:38px; block-size:38px; border-radius:50%; background: var(--color-bg-container); border:1px solid var(--color-outline-20); color: var(--color-text-secondary); cursor:pointer; display:inline-flex; align-items:center; justify-content:center; box-shadow:0 4px 18px var(--color-black-alpha-40, rgba(0,0,0,.4)); z-index:5; animation: ai-enter .2s var(--spring-common, ease) both; transition: color var(--transition-fast), border-color var(--transition-fast), transform var(--transition-fast); }
@media (hover:hover){ .yk-ai-scrollbtn:hover{ color: var(--color-primary-light); border-color: var(--color-primary); transform: translateY(-1px);} }
.yk-ai-copybtn:focus-visible,
.yk-ai-scrollbtn:focus-visible { outline:2px solid var(--color-accent); outline-offset:2px; }

.yk-ai-banner { padding:6px 14px; font-size:.6875rem; line-height:1.4; font-family: var(--font-body); flex-shrink:0; display:flex; align-items:center; gap:8px; }
.yk-ai-banner--offline { background: var(--color-caution-alpha-08); color: var(--color-caution); border-block-start:1px solid var(--color-outline-20); }
/* #F44336 在亮底 #FAF7FC 上仅 3.72:1，AA 不过 → 亮态换 danger-dark（≈4.88:1）。
   分量刻意保持"淡底 + 左边线 + 红字"，与危机卡的"实心红满底 + 白字 + 方角"
   差一个数量级，层级不会被抢。圆角走逻辑属性（RTL 下边线与圆角要同侧）。 */
.yk-ai-error { background: var(--color-danger-alpha-10); border-inline-start:3px solid var(--color-danger); padding:8px 12px; color: var(--color-danger); font-size:.8125rem; font-family: var(--font-body);
  border-start-start-radius:0; border-end-start-radius:0; border-start-end-radius:8px; border-end-end-radius:8px; }
/* 亮态用 --color-danger-text（#B71C1C）而非 --color-danger-dark。
   本条的对比度必须对**合成后的底色**算：本元素自铺 --color-danger-alpha-10，
   实际底色 rgb(249,229,223)，#D32F2F 在其上仅 4.10:1，13px 正文不过 AA。
   见 global.css 的 --color-danger-text 注释。 */
[data-theme='light'] .yk-ai-error { color: var(--color-danger-text); }

.yk-ai-ctx { display:flex; align-items:center; gap:8px; padding-block:2px; padding-inline:6px; font-size:.6875rem; color: var(--color-text-muted); font-family: var(--font-body); flex-shrink:0; max-inline-size:48rem; margin-inline:auto; inline-size:100%; }
.yk-ai-ctx__text{ flex:1; min-inline-size:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; text-align:start; }
.yk-ai-ctx__close{ background:none; border:none; color: var(--color-text-secondary); cursor:pointer; min-inline-size:36px; min-block-size:36px; padding:0; display:inline-flex; align-items:center; justify-content:center; transition: color var(--transition-fast); }
@media (hover:hover){ .yk-ai-ctx__close:hover{ color: var(--color-primary-light);} }

/* ============ composer 浮岛（两种状态共用）+ dock + 免责常驻行 ============ */
/* 比 .yk-ai-logwrap 略慢 —— 读作"内容先落位、输入区跟上"，掩盖空态→对话态
   时输入框从舞台中央到坞底的瞬移 */
.yk-ai-dock { flex-shrink:0; padding:8px var(--space-lg) 0; animation: ai-enter .32s var(--spring-common, ease) both; }
.yk-ai--compact .yk-ai-dock { padding:6px 10px 0; }
.yk-ai-composer { inline-size:100%; max-inline-size:48rem; margin-inline:auto; display:flex; gap:10px; align-items:flex-end;
  background: var(--color-bg-container, #211E28);
  border:1px solid var(--color-outline-20);
  border-radius:28px; padding:13px 12px 13px 20px; min-block-size:56px;
  box-shadow: 0 12px 36px rgba(0,0,0,.42), inset 0 1px 0 rgba(255,255,255,.08);
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast); }
.yk-ai--compact .yk-ai-composer { border-radius:20px; padding:9px 9px 9px 14px; min-block-size:46px; }
.yk-ai-composer:focus-within { border-color: var(--color-primary-alpha-40, rgba(200,75,124,.5));
  box-shadow: 0 12px 36px rgba(0,0,0,.42), 0 0 0 3px var(--color-primary-alpha-08, rgba(200,75,124,.12)), inset 0 1px 0 rgba(255,255,255,.12); }
[data-theme='light'] .yk-ai-composer { box-shadow: 0 12px 36px rgba(74,40,56,.14); }
/* 16px 锁死：<16px 的输入框在 iOS Safari 聚焦时会强制放大 viewport（横向乱晃） */
.yk-ai-input { flex:1; min-inline-size:0; min-block-size:26px; max-block-size:200px; padding:6px 0; background:transparent; color: var(--color-text-primary); border:none; font-family: var(--font-body); font-size:1rem; outline:none; border-radius:0; resize:none; line-height:1.6; }
.yk-ai--compact .yk-ai-input { font-size:1rem; }
.yk-ai-input::placeholder { color: var(--color-text-muted); }
.yk-ai-send { inline-size:38px; min-inline-size:38px; block-size:38px; padding:0; display:inline-flex; align-items:center; justify-content:center; align-self:flex-end;
  background: linear-gradient(135deg, var(--color-primary), var(--color-primary-dark, #A03A63));
  color:#fff; border:1px solid transparent; cursor:pointer; border-radius:50%;
  transition: background var(--transition-fast), color var(--transition-fast), border-color var(--transition-fast), transform .25s var(--spring-fast, ease), box-shadow var(--transition-fast);
  box-shadow: 0 2px 12px var(--color-primary-alpha-40, rgba(200,75,124,.35)); }
.yk-ai--compact .yk-ai-send { inline-size:32px; min-inline-size:32px; block-size:32px; }
@media (hover:hover){ .yk-ai-send:not(:disabled):hover{ transform: translateY(-1px); box-shadow: 0 4px 16px var(--color-primary-alpha-60, rgba(200,75,124,.5));} }
.yk-ai-send--stop { background: var(--color-danger, #D32F2F); box-shadow: 0 2px 12px var(--color-danger-alpha-10, rgba(211,47,47,.3)); }
/* 空输入 = 幽灵态；键入后渐变亮起（Gemini「有内容才亮」的稳定版，无宽度跳动） */
.yk-ai-send:disabled { background:transparent; border-color: var(--color-outline-20); color: var(--color-text-muted); cursor:not-allowed; box-shadow:none; }
.yk-ai-send:focus-visible { outline:2px solid var(--color-accent); outline-offset:2px; }
.yk-ai-charhint { font-size:.625rem; color: var(--color-text-muted); font-family: var(--font-mono); text-align:end; margin-block-start:4px; max-inline-size:48rem; margin-inline:auto; }
.yk-ai-charhint--over { color: var(--color-danger); }

/* ============ 用量条（百分比制，仅本机计数；输入框正上方一条细线） ============ */
/* <50% 时整条不渲染（见 showUsage）；淡入避免"到 50% 那一刻凭空多出一条" */
.yk-ai-usage { inline-size:100%; max-inline-size:48rem; margin-inline:auto; display:flex; flex-direction:column; gap:5px; padding-inline:6px; padding-block-end:8px; animation: ai-enter .3s var(--spring-common, ease) both; }
.yk-ai-usage__track { block-size:3px; border-radius:999px; background: var(--color-white-alpha-08, rgba(255,255,255,.09)); overflow:hidden; }
[data-theme='light'] .yk-ai-usage__track { background: rgba(74,40,56,.12); }
/* 只动 transform —— scaleX 从行首起画，RTL 下把原点翻到行尾 */
.yk-ai-usage__fill { block-size:100%; inline-size:100%; transform-origin:0 50%; background: var(--color-text-muted); transition: transform .45s var(--spring-common, ease), background var(--transition-fast); }
[dir="rtl"] .yk-ai-usage__fill { transform-origin:100% 50%; }
.yk-ai-usage__text { font-size:.6875rem; line-height:1.5; color: var(--color-text-muted); font-family: var(--font-body); text-align:start; }
.yk-ai-usage--warn .yk-ai-usage__fill { background: var(--color-accent); }
.yk-ai-usage--warn .yk-ai-usage__text { color: var(--color-accent-text); }
.yk-ai-usage--danger .yk-ai-usage__fill { background: var(--color-danger); }
.yk-ai-usage--danger .yk-ai-usage__text { color: var(--color-danger); }
/* 周额度副文案：比主文案再弱一档，避免两个百分比争夺注意力 */
.yk-ai-usage__sub { opacity:.72; }
.yk-ai-usage__hint { color: inherit; text-decoration:underline; text-underline-offset:2px; }
.yk-ai-usage__hint:focus-visible { outline:2px solid var(--color-accent); outline-offset:2px; }

/* ============ 深度思考开关（composer 内，发送钮左侧） ============ */
.yk-ai-modebtn { display:inline-flex; align-items:center; justify-content:center; gap:6px; align-self:flex-end; min-block-size:38px; min-inline-size:38px; padding-inline:11px; background:transparent; border:1px solid var(--color-outline-20); color: var(--color-text-secondary); cursor:pointer; border-radius:999px; font-family: var(--font-body); font-size:.75rem; line-height:1; white-space:nowrap; transition: color var(--transition-fast), border-color var(--transition-fast), background var(--transition-fast); }
@media (hover:hover){ .yk-ai-modebtn:hover{ color: var(--color-text-primary); border-color: var(--color-accent-alpha-30, rgba(212,168,83,.35)); } }
.yk-ai-modebtn[aria-pressed='true'] { color: var(--color-accent); border-color: var(--color-accent-alpha-30, rgba(212,168,83,.45)); background: var(--color-accent-alpha-08, rgba(212,168,83,.12)); }
@media (hover:hover){ .yk-ai-modebtn[aria-pressed='true']:hover{ color: var(--color-accent); } }
.yk-ai-modebtn:focus-visible { outline:2px solid var(--color-accent); outline-offset:2px; }
.yk-ai--compact .yk-ai-modebtn__label { display:none; }
.yk-ai--compact .yk-ai-modebtn { padding-inline:0; min-inline-size:32px; }

/* 「使用须知」弹层 */
.yk-ai-about { position:absolute; inset:0; z-index:30; display:flex; align-items:center; justify-content:center; padding:20px; }
.yk-ai-about__overlay { position:absolute; inset:0; background: var(--color-black-alpha-50, rgba(0,0,0,.5)); }
.yk-ai-about__card { position:relative; inline-size:100%; max-inline-size:34rem; max-block-size:82%; overflow-y:auto; background: var(--color-bg-container, #211E28); border:1px solid var(--color-outline-20); border-radius:16px; padding:18px 22px 20px; box-shadow: 0 20px 60px rgba(0,0,0,.5); animation: ai-msg-in .32s var(--spring-bounce, ease) both; }
.yk-ai-about__head { display:flex; align-items:center; gap:8px; margin-block-end:8px; }
.yk-ai-about__title { flex:1; font-family: var(--font-display); font-size:1.02rem; font-weight:700; color: var(--color-text-primary); }
.yk-ai-about__list { display:flex; flex-direction:column; gap:12px; padding-inline-start:1.2em; font-size:.84rem; line-height:1.75; color: var(--color-text-secondary); font-family: var(--font-body); }
.yk-ai-about__list li { list-style:disc; }
.yk-ai-about__list li::marker { color: var(--color-accent); }
/* 免责常驻行 —— composer 正下方（ChatGPT「可能会犯错」同位；语义只强化不弱化） */
.yk-ai-inputnote { text-align:center; font-size:.75rem; color: var(--color-text-muted); font-family: var(--font-body); line-height:1.5; max-inline-size:48rem; margin-inline:auto; padding:8px 12px; padding-block-end: max(10px, env(safe-area-inset-bottom, 0px)); }
.yk-ai-hero .yk-ai-inputnote { margin-block-start:14px; padding-block-end:0; }

@media (max-width:768px){
  .yk-ai-msg--user { max-inline-size:88%; }
  .yk-ai-log { padding:18px var(--space-md); }
  .yk-ai-hero__greeting { font-size:1.3rem; }
  .yk-ai-hero__composer { margin-block-start:20px; }
  /* 触控热区统一 44px（Apple HIG / Material） */
  .yk-ai-send, .yk-ai-actbtn, .yk-ai-ctx__close, .yk-ai-modebtn,
  .yk-ai-scrollbtn, .yk-ai-copybtn { min-inline-size:44px; min-block-size:44px; }
  /* scrollbtn 是显式定宽的圆钮，min-* 压不动它 */
  .yk-ai-scrollbtn { inline-size:44px; block-size:44px; }
  .yk-ai-copybtn { inline-size:44px; block-size:44px; }
  /* 操作条恒定高度随热区一起抬，仍是"高度不随加载态变化" */
  .yk-ai-actions { block-size:44px; }
  /* 借一点负边距多露一列；单元格内边距收紧 */
  .yk-ai-tablewrap { margin-inline:-4px; }
  .yk-ai-table th, .yk-ai-table td { padding:6px 9px; }
  /* 键盘弹起（输入框获得焦点）时收起两条非关键信息，把可视区还给对话。
     不收起 .yk-ai-inputnote（红线组件）与离线条（它说明"你现在发不出去"）。 */
  .yk-ai-dock:focus-within .yk-ai-usage,
  .yk-ai-dock:focus-within .yk-ai-ctx { display:none; }
  /* 窄屏只留图标，文案继续由 aria-label / title 承载 */
  .yk-ai-modebtn__label { display:none; }
  .yk-ai-modebtn { padding-inline:0; }
  /* 移动欢迎态只留 3 个建议 pill —— composer 保持舞台中心 */
  .yk-ai-pill:nth-child(n+4) { display:none; }
  /* SSR 首帧不闪桌面侧栏：rail 由 CSS 隐藏（drawer 是绝对定位变体，不受影响） */
  .yk-ai-shell > .yk-ai-side:not(.yk-ai-side--drawer) { display:none; }
}
@media (max-height:600px){
  .ai-chat-stage { min-block-size:0; }
  .yk-ai-hero { justify-content:flex-start; }
}
@media (prefers-reduced-motion: reduce){
  .yk-ai-log--smooth{ scroll-behavior:auto; }
  .yk-ai-turn, .yk-ai-hero { animation:none; }
  .yk-ai-logwrap, .yk-ai-dock, .yk-ai-scrollbtn, .yk-ai-usage { animation:none; }
  .yk-ai-msg--streaming > div:last-child > :last-child::after,
  .yk-ai-msg--streaming > div:last-child > :is(ul,ol):last-child > li:last-child::after { animation:none; }
  /* 下面那条 animation-duration:.01ms 只压时长不压 animation-name —— 扫光会停在
     to 帧（滑出视野）留下一个空槽。必须显式把 name 置空，再补一个静态灰条：
     状态本身由 label 行的文字承载，不依赖动效。 */
  .yk-ai-pending__bar::after { animation:none; opacity:.55; transform:none; inline-size:100%; }
  .yk-ai-pill:hover, .yk-ai-send:not(:disabled):hover, .yk-ai-scrollbtn:hover { transform:none; }
  .yk-ai-usage__fill { transition:none; }
  .yk-ai *, .yk-ai *::before, .yk-ai *::after { transition:none !important; animation-duration:.01ms !important; }
}
`;

export default function AIAssistant({ compact = false, onClose }: AIAssistantProps) {
  const locale = getLocale();
  const ui = AI_COPY[locale];
  const crisisHotlines = useMemo<CrisisHotline[]>(() => getCrisisHotlines(locale), [locale]);

  const chat = useChatSessions();
  const {
    messages, sessions, activeId, activeSession, historyEnabled, setHistoryEnabled,
    newSession, switchSession, renameSession, deleteSession, clearAll,
    setActiveMessages, ensureSession, updateSession, setStreaming, flush, exportAll,
  } = chat;

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [servedModel, setServedModel] = useState<string | null>(null);
  const [pageTitle, setPageTitle] = useState<string | null>(null);
  const [ctxOptOut, setCtxOptOut] = useState(pageContextOptOut);
  const [rich, setRich] = useState(isRichReady());
  const [online, setOnline] = useState(true);
  const [rateLimitLeft, setRateLimitLeft] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [railCollapsed, setRailCollapsed] = useState(false);
  const [atBottom, setAtBottom] = useState(true);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editText, setEditText] = useState('');
  const [aboutOpen, setAboutOpen] = useState(false);
  /** 流式归属的 sessionId（渲染层判断轻量渲染 + 光标）；null = 无流式 */
  const [streamingMsgKey, setStreamingMsgKey] = useState<string | null>(null);
  /** sr-only 状态播报（流式区 aria-live 已静音，完成/错误在此一次性播报） */
  const [srStatus, setSrStatus] = useState('');
  /** 当前窗口用量（仅本机计数，不含任何对话内容）；SSR 首帧 0，挂载后读本机值 */
  const [usage, setUsage] = useState<UsageRecord>(EMPTY_USAGE);
  /** 深度思考开关（UI 偏好，存 localStorage） */
  const [thinkMode, setThinkMode] = useState(false);
  /** 本次流式请求发起时的模式 —— 等待区文案不随中途切换而漂移 */
  const [streamThink, setStreamThink] = useState(false);
  /** 本轮等待起点（首 token 前的耗时计数用）；null = 未在等待 */
  const [pendingSince, setPendingSince] = useState<number | null>(null);

  const logRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => { setPageTitle(getPageTitle()); }, []);

  // 面板被打开（组件挂载 = 用户进入对话界面）。无参数，零内容。
  useEffect(() => { track('ai_chat_open'); }, []);

  // 本机用量 / 模式偏好：挂载后读取（避免 SSR 与首帧 hydration 不一致）。
  // 标签页整夜挂着时，回到前台重读一次以完成窗口过期重置。
  useEffect(() => {
    setUsage(readUsage());
    try { setThinkMode(localStorage.getItem(MODE_KEY) === 'think'); } catch { /* ignore */ }
    const onVisible = () => { if (!document.hidden) setUsage(readUsage()); };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  /** 用量 +1（两级同时）。以 localStorage 为准重读后写回 —— 多标签页并存也不会
   *  互相覆盖。readUsage() 已把过期窗口归零，故这里只需判「有没有活动窗口」。 */
  function bumpUsage() {
    const now = Date.now();
    const bump = (w: UsageWindow): UsageWindow =>
      w.start > 0 ? { start: w.start, used: w.used + 1 } : { start: now, used: 1 };
    const cur = readUsage();
    const next: UsageRecord = { s: bump(cur.s), w: bump(cur.w) };
    writeUsage(next);
    setUsage(next);
    // 恰好把某一级用满 → 记一次限额触达（用 === 而非 >=，保证每窗口至多上报一次）
    if (next.s.used === SESSION_QUOTA) track('ai_chat_limit', { window: 'session' });
    if (next.w.used === WEEKLY_QUOTA) track('ai_chat_limit', { window: 'weekly' });
  }

  function toggleThinkMode() {
    const next = !thinkMode;
    try { localStorage.setItem(MODE_KEY, next ? 'think' : 'fast'); } catch { /* ignore */ }
    setThinkMode(next);
  }

  // 桌面打开页面即可打字（移动端不自动弹键盘）
  useEffect(() => {
    if (!compact && window.innerWidth > 768) inputRef.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 使用须知弹层：Esc 关闭 + 焦点归还输入框
  useEffect(() => {
    if (!aboutOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); setAboutOpen(false); inputRef.current?.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [aboutOpen]);

  // rich markdown: load once, upgrade rendering when ready
  useEffect(() => {
    setCopyLabel(ui.copyCode);
    if (!isRichReady()) ensureRichMarkdown().then(() => setRich(true));
  }, [ui.copyCode]);

  // responsive (window resize covers both media-query change and programmatic resize)
  useEffect(() => {
    const upd = () => setIsMobile(window.innerWidth <= 768);
    upd();
    window.addEventListener('resize', upd);
    return () => window.removeEventListener('resize', upd);
  }, []);

  // online / offline
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    setOnline(navigator.onLine);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  // rate-limit countdown
  useEffect(() => {
    if (rateLimitLeft <= 0) return;
    const t = setTimeout(() => setRateLimitLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [rateLimitLeft]);

  // Cmd/Ctrl+K → new chat
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        newSession();
        setInput('');
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [newSession]);

  const scrollToBottom = useCallback(() => {
    const c = logRef.current;
    if (c) requestAnimationFrame(() => { c.scrollTop = c.scrollHeight; });
  }, []);

  useEffect(() => { if (atBottom) scrollToBottom(); }, [messages, atBottom, scrollToBottom]);

  function onLogScroll() {
    const c = logRef.current;
    if (!c) return;
    setAtBottom(c.scrollHeight - c.scrollTop - c.clientHeight < 48);
  }

  // auto-grow textarea
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [input]);

  function dismissContext() { pageContextOptOut = true; setCtxOptOut(true); }

  function buildApiContent(text: string): string {
    if (!pageContextOptOut && pageTitle && text.length > 14) {
      const prefixed = ui.contextPrefix.replace('{title}', pageTitle) + text;
      if (byteLen(prefixed) <= MAX_CONTENT_BYTES) return prefixed;
    }
    return text;
  }

  function buildOutgoing(base: StoredMessage[], apiContentForLast: string) {
    const sliced = base.slice(-MAX_SENT_MESSAGES);
    return sliced.map((m, i, arr) => ({
      role: m.role,
      content: i === arr.length - 1 && m.role === 'user' ? apiContentForLast : m.content,
    }));
  }

  function startRateLimit(res: Response) {
    const ra = parseInt(res.headers.get('Retry-After') || '', 10);
    setRateLimitLeft(Number.isFinite(ra) && ra > 0 ? ra : 30);
  }

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  /** 移除末尾空 assistant 占位（停止/失败时防思考圆点卡死）。 */
  const dropEmptyTail = (prev: StoredMessage[]) => {
    const last = prev[prev.length - 1];
    return last?.role === 'assistant' && !last.content ? prev.slice(0, -1) : prev;
  };

  /** 流式核心 —— 所有增量更新锁定发起时的 sessionId（用户可在流式中切换/新建会话）。 */
  async function runCompletion(sessionId: string, outgoing: { role: string; content: string }[]) {
    /* 计数时机：一次「用户主动发起的生成」（发送 / 重新生成 / 编辑重发）在此 +1，
       而不是每收到一次回复 +1，也不是每次 fetch +1。理由：
       ① 与用户心智一致 —— "我问了一次 = 用了一次"；函数内部的指数退避重试属于
          我们自己的容错，网络抖动不该扣用户额度；
       ② 记账发生在 fetch 之前：连接被掐断也无法绕过计数，避免"失败即免费"被反复
          触发把上游免费额度打空（额度的意义是保护上游，不是奖励失败）；
       ③ 客户端预校验（离线 / 限流 / 超字数 / 额度已耗尽）在调用本函数之前就拦截，
          所以不存在"根本没发出去却被记一次"的情况。 */
    bumpUsage();
    const useThink = thinkMode;
    // 埋点：一次用户主动发起的生成。mode 是写死的两个字面量之一，无内容。
    track('ai_chat_send', { mode: useThink ? 'think' : 'fast' });
    const t0 = Date.now();
    setStreamThink(useThink);
    setPendingSince(Date.now());
    setError(null);
    setIsLoading(true);
    setStreaming(true);
    setStreamingMsgKey(`${sessionId}`);
    const controller = new AbortController();
    abortRef.current = controller;
    const MAX_ATTEMPTS = 3;
    const BACKOFFS = [500, 1500, 3000];
    let firstChunk = false;
    let lastErr: Error | null = null;

    const finish = (announce: string | null) => {
      setStreaming(false);
      setStreamingMsgKey(null);
      setIsLoading(false);
      setPendingSince(null);
      abortRef.current = null;
      if (announce) setSrStatus(announce);
      focusInput();
    };

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      try {
        const res = await fetch('/api/ai-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          // mode 为端点新增可选字段（缺省视为 'fast'）；其余契约不变
          body: JSON.stringify({ messages: outgoing, mode: useThink ? 'think' : 'fast' }),
          signal: controller.signal,
        });

        if (!res.ok) {
          if (res.status === 429) {
            const data = await res.json().catch(() => ({}));
            /* 服务端滚动配额耗尽（客户端计数被清缓存/无痕绕过时才会走到）。
               不能走 startRateLimit —— 那会把 Retry-After 的数万秒当成"分钟级
               限流倒计时"显示。改为按剩余分钟渲染本地化的恢复时间文案。 */
            if (res.headers.get('x-yk-quota') || res.headers.get('x-yk-daily') === 'exceeded') {
              const scope = data.scope === 'weekly' ? 'weekly' : 'session';
              track('ai_chat_limit', { window: scope });
              track('ai_chat_error', { code: '429' });
              const mins = Number(data.resetInMinutes);
              const ms = Number.isFinite(mins) && mins > 0 ? mins * 60_000 : 0;
              throw new Error(ms > 0 ? formatQuotaResetIn(scope, ms, ui) : ui.usageExhausted);
            }
            track('ai_chat_error', { code: '429' });
            startRateLimit(res);
            throw new Error(data.error || ui.rateLimitError);
          }
          if (res.status >= 400 && res.status < 500) {
            // 4xx 打 '4xx' 而非 '503'：把客户端类错误（400 校验失败、403 Origin
            // 被拒）混进服务端不可用统计，会让「端点错误率」这条回滚触发条件失真。
            track('ai_chat_error', { code: '4xx' });
            throw new Error(`${ui.serviceUnavailable} (${res.status})`);
          }
          track('ai_chat_error', { code: '503' });
          lastErr = new Error(`${ui.serviceUnavailable} (${res.status})`);
          if (attempt < MAX_ATTEMPTS - 1) { setError(ui.retrying); await sleep(BACKOFFS[attempt]); continue; }
          throw lastErr;
        }

        const model = res.headers.get('x-yk-model');
        if (model) setServedModel(model);

        if (!res.body) {
          lastErr = new Error(ui.serviceUnavailable);
          if (attempt < MAX_ATTEMPTS - 1) { setError(ui.retrying); await sleep(BACKOFFS[attempt]); continue; }
          throw lastErr;
        }

        setError(null);
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let content = '';
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            firstChunk = true;
            content += decoder.decode(value, { stream: true });
            updateSession(sessionId, (prev) => replaceLastAssistant(prev, content), false);
          }
        } catch (streamErr: unknown) {
          if (controller.signal.aborted) {
            // 用户主动停止 —— 保留已渲染部分；若首字节前停止则移除空占位
            updateSession(sessionId, dropEmptyTail, true);
            finish(null); return;
          }
          const m = streamErr instanceof Error ? streamErr.message : ui.unknownError;
          // 流中途断开（上游 chunk 间隔超时 / 连接被掐）
          track('ai_chat_error', { code: 'timeout' });
          track('ai_chat_reply', { ok: false, ms: roundMs(Date.now() - t0) });
          setError(`${m}（${ui.streamInterrupted}）`);
          // 错误只走 .yk-ai-error 的 role="alert" 一路；再进 srStatus 会被念两遍
          flush(); finish(null); return;
        }

        if (!content) updateSession(sessionId, (prev) => replaceLastAssistant(prev, ui.emptyResponse), false);
        // 埋点：ok 是布尔，ms 是取整到 100ms 的数字 —— 都与回复内容无关
        track('ai_chat_reply', { ok: true, ms: roundMs(Date.now() - t0) });
        flush();
        /* 只播报一句「回复完成」。原来灌 400 字**原始 markdown**：读屏会逐字念出
           `**` `|` `#` `- `（中文读屏读作"星号星号"），持续十几秒且无法暂停/回看；
           而正文本身在 role="log" 里可以用虚拟光标正常阅读 —— 播报只是重复且劣化了它。 */
        finish(ui.replyDone);
        return;
      } catch (err: unknown) {
        if (controller.signal.aborted) {
          updateSession(sessionId, dropEmptyTail, true);
          finish(null); return;
        }
        lastErr = err instanceof Error ? err : new Error(ui.unknownError);
        if (firstChunk) break;
        const retryable = /fetch|network|5\d\d/i.test(lastErr.message);
        if (retryable) track('ai_chat_error', { code: 'network' });
        if (retryable && attempt < MAX_ATTEMPTS - 1) { setError(ui.retrying); await sleep(BACKOFFS[attempt]); continue; }
        break;
      }
    }

    const finalMsg = lastErr?.message ?? ui.unknownError;
    track('ai_chat_reply', { ok: false, ms: roundMs(Date.now() - t0) });
    setError(`${finalMsg}（${ui.retryHint}）`);
    updateSession(sessionId, dropEmptyTail, true);
    // 同上：错误只由 role="alert" 播报一次
    finish(null);
  }

  function focusInput() { inputRef.current?.focus(); }

  const sessionPct = Math.min(100, Math.round((usage.s.used / SESSION_QUOTA) * 100));
  const weeklyPct = Math.min(100, Math.round((usage.w.used / WEEKLY_QUOTA) * 100));
  const sessionExhausted = usage.s.start > 0 && usage.s.used >= SESSION_QUOTA;
  const weeklyExhausted = usage.w.start > 0 && usage.w.used >= WEEKLY_QUOTA;
  const usageExhausted = sessionExhausted || weeklyExhausted;
  /* 主进度条跟随更吃紧的一级 —— 用户关心的是"我还能问几句"，而不是哪一级先满 */
  const usagePct = Math.max(sessionPct, weeklyPct);
  const usageTone = usagePct > 90 ? 'danger' : usagePct >= 70 ? 'warn' : 'calm';
  /* 周级先满时，等到"周恢复"才有意义（时段窗口早就滚过去了）；两级都满时也以
     周级为准 —— 它一定更晚恢复。 */
  const exhaustedScope: 'session' | 'weekly' = weeklyExhausted ? 'weekly' : 'session';
  /* 耗尽时剩余时间随时间走，需要周期性重算。分钟级精度 → 60s 一跳足够；
     readUsage() 顺带完成窗口过期后的自动解锁（无需用户刷新页面）。 */
  const [resetTick, setResetTick] = useState(0);
  useEffect(() => {
    if (!usageExhausted) return;
    const t = setInterval(() => { setUsage(readUsage()); setResetTick((n) => n + 1); }, 60_000);
    return () => clearInterval(t);
  }, [usageExhausted]);
  const usageResetText = useMemo(
    () => (usageExhausted
      ? formatQuotaResetIn(
        exhaustedScope,
        exhaustedScope === 'weekly'
          ? windowResetInMs(usage.w, WEEKLY_WINDOW_MS)
          : windowResetInMs(usage.s, SESSION_WINDOW_MS),
        ui,
      )
      : ''),
    // resetTick 是刻意的重算触发器（时间流逝不是 React 状态）
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [usageExhausted, exhaustedScope, usage, ui, resetTick],
  );

  const canSend = !isLoading && online && rateLimitLeft <= 0 && !usageExhausted;

  async function sendMessage(text?: string) {
    const messageText = (text ?? input).trim();
    if (!messageText || !canSend) return;
    if (byteLen(messageText) > MAX_CONTENT_BYTES) return;

    const crisis = containsCrisisKeyword(messageText);
    /* 躯体急症本地拦截 —— 与危机词检测**并列独立判定**，两者互不替代
       （docs/specs/ai-chat-somatic-emergency.md §4.1）。空数组存 undefined，
       不给没命中的消息在 localStorage 里留空字段。 */
    const somaticHits = detectSomaticEmergency(messageText);
    const somatic = somaticHits.length > 0 ? somaticHits : undefined;
    const apiContent = buildApiContent(messageText);
    // 锁定发起时的会话 id —— 用户可在流式中切换/新建会话
    const sid = ensureSession();
    const base: StoredMessage[] = [
      ...messages,
      { role: 'user', content: messageText, crisis, somaticHits: somatic },
    ];

    updateSession(
      sid,
      (prev) => [...prev, { role: 'user', content: messageText, crisis, somaticHits: somatic }],
      true,
    );
    updateSession(sid, (prev) => [...prev, { role: 'assistant', content: '' }], false);
    setInput('');
    setAtBottom(true);
    /* 空态→对话态时 composerCard 换了父节点，React 会卸载重建 textarea → 焦点丢失，
       原来要等整轮流式结束的 finish() 才还回来（桌面用户整轮敲键盘无响应）。
       等新节点挂载后立刻还焦点。移动端跳过：那会把刚收起的软键盘再顶出来，
       遮住刚发出的消息。 */
    if (!isMobile) requestAnimationFrame(() => inputRef.current?.focus());
    await runCompletion(sid, buildOutgoing(base, apiContent));
  }

  function stopGeneration() { abortRef.current?.abort(); }

  function regenerate() {
    // 同 submitEdit：先校验可发送性再动状态，否则离线/限流/额度耗尽时会留下永久假占位
    if (!canSend || !activeId) return;
    let idx = -1;
    for (let i = messages.length - 1; i >= 0; i--) if (messages[i].role === 'user') { idx = i; break; }
    if (idx < 0) return;
    const sid = activeId;
    const base = messages.slice(0, idx + 1);
    updateSession(sid, () => [...base, { role: 'assistant', content: '' }], false);
    setAtBottom(true);
    runCompletion(sid, buildOutgoing(base, base[base.length - 1].content));
  }

  function beginEdit(i: number) { setEditingIdx(i); setEditText(messages[i].content); }
  function cancelEdit() { setEditingIdx(null); setEditText(''); }
  function submitEdit(i: number) {
    const text = editText.trim();
    // 先校验可发送性再动状态 —— 否则离线/限流时会留下永久的"正在思考"假占位
    if (!text || byteLen(text) > MAX_CONTENT_BYTES || !canSend) return;
    const crisis = containsCrisisKeyword(text);
    // 编辑重发路径同样要判 —— 编辑后的文本才是用户真正问的那句（§4.1 要求两处并列）
    const somaticHits = detectSomaticEmergency(text);
    const somatic = somaticHits.length > 0 ? somaticHits : undefined;
    const sid = ensureSession();
    const base: StoredMessage[] = [
      ...messages.slice(0, i),
      { role: 'user', content: text, crisis, somaticHits: somatic },
    ];
    updateSession(sid, () => [...base, { role: 'assistant', content: '' }], true);
    setEditingIdx(null);
    setEditText('');
    setAtBottom(true);
    runCompletion(sid, buildOutgoing(base, buildApiContent(text)));
  }

  async function copyMessage(i: number, text: string) {
    // 成功反馈：图标切对勾 + 绿色语义，1.2s 后恢复（与代码块 --done 同节奏）
    try { await navigator.clipboard?.writeText(text); setCopiedIdx(i); setTimeout(() => setCopiedIdx((c) => (c === i ? null : c)), 1200); } catch { /* ignore */ }
  }

  function onLogClick(e: React.MouseEvent) {
    const target = e.target as HTMLElement;
    const btn = target.closest?.('[data-yk-copy]') as HTMLElement | null;
    if (!btn) return;
    const code = btn.closest('.yk-ai-prewrap')?.querySelector('code');
    if (code) {
      navigator.clipboard?.writeText(code.textContent || '').then(() => {
        btn.classList.add('yk-ai-copybtn--done');
        setTimeout(() => btn.classList.remove('yk-ai-copybtn--done'), 1200);
      }).catch(() => {});
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  }

  const showCtxHint = !ctxOptOut && pageTitle !== null;
  const inputBytes = byteLen(input);
  const overLimit = inputBytes > MAX_CONTENT_BYTES;
  const showRail = !compact && !isMobile && !railCollapsed;
  const useDrawer = compact || isMobile;
  const lastAiIndex = (() => { for (let i = messages.length - 1; i >= 0; i--) if (messages[i].role === 'assistant') return i; return -1; })();
  void rich; // referenced to re-render when rich markdown becomes ready

  const sidebar = (variant: 'rail' | 'drawer') => (
    <ChatSessionSidebar
      variant={variant}
      open={sidebarOpen}
      onClose={() => setSidebarOpen(false)}
      ui={ui}
      sessions={sessions}
      activeId={activeId}
      historyEnabled={historyEnabled}
      onNewChat={() => { newSession(); setInput(''); focusInput(); }}
      onSelect={switchSession}
      onRename={renameSession}
      onDelete={(id) => {
        // 删除正在接收流式回复的会话 → 同时终止该请求（chunk 已无处可写）
        if (id === streamingMsgKey) abortRef.current?.abort();
        deleteSession(id);
      }}
      onClearAll={clearAll}
      onExportAll={exportAll}
      onToggleHistory={setHistoryEnabled}
      onAbout={() => setAboutOpen(true)}
      homeHref={`/${locale}/`}
    />
  );

  /* 「使用须知」弹层 —— 承接原页面级免责详版（只强化不弱化） */
  const aboutSheet = aboutOpen ? (
    <div className="yk-ai-about">
      <div className="yk-ai-about__overlay" onClick={() => { setAboutOpen(false); focusInput(); }} />
      <div className="yk-ai-about__card" role="dialog" aria-modal="true" aria-label={ui.aboutTitle} onKeyDown={trapTab}>
        <div className="yk-ai-about__head">
          <span className="yk-ai-about__title">{ui.aboutTitle}</span>
          <button className="yk-ai-iconbtn" onClick={() => { setAboutOpen(false); focusInput(); }} aria-label={ui.close} autoFocus>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <ul className="yk-ai-about__list">
          {ui.aboutPoints.map((p, i) => (
            <li key={i}>{p}</li>
          ))}
        </ul>
      </div>
    </div>
  ) : null;

  const isEmpty = messages.length === 0;

  /* composer 浮岛 —— 欢迎态居中 / 对话态坞底，两处共用 */
  const composerCard = (
    <div className="yk-ai-composer">
      <textarea
        ref={inputRef}
        className="yk-ai-input"
        rows={1}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={
          usageExhausted
            ? ui.usageExhausted
            : rateLimitLeft > 0
              ? ui.rateLimitWait.replace('{s}', String(rateLimitLeft))
              : ui.inputPlaceholder
        }
        disabled={(isLoading && !abortRef.current) || usageExhausted}
        aria-label={ui.inputLabel}
      />
      <button
        type="button"
        className="yk-ai-modebtn"
        onClick={toggleThinkMode}
        aria-pressed={thinkMode}
        aria-label={ui.thinkMode}
        title={ui.thinkMode}
      >
        <Icon name="think" size={18} />
        <span className="yk-ai-modebtn__label">{ui.thinkMode}</span>
      </button>
      {isLoading ? (
        <button className="yk-ai-send yk-ai-send--stop" onClick={stopGeneration} aria-label={ui.stop} title={ui.stop}>
          <Icon name="stop" size={16} />
        </button>
      ) : (
        <button
          className="yk-ai-send"
          onClick={() => sendMessage()}
          disabled={!input.trim() || !canSend || overLimit}
          aria-label={ui.sendLabel}
          title={ui.send}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 19V5" /><path d="M5 12l7-7 7 7" />
          </svg>
        </button>
      )}
    </div>
  );

  /* 用量条 —— 百分比制（不暴露具体次数，避免"还剩几次"的焦虑计数）。
     隐私：数据只来自本机 localStorage 计数，不发往任何 analytics 端点。

     <50% 整条不渲染（claude / gemini 同路线：接近上限才显示）。0-40% 这个数字不
     携带任何可行动信息，而它是新用户在欢迎页紧贴输入框看到的第一条"关于限制"的
     信息 —— 先告诉人家"你是有配额的"是错误的开场。
     ⚠️ 这个门槛只控制整条的渲染与否，内部的计数/双滚动窗口逻辑一律不动。 */
  const showUsage = usageExhausted || usagePct >= 50;
  const usageBar = !showUsage ? null : (
    <div className={`yk-ai-usage yk-ai-usage--${usageTone}`}>
      {/* 进度条是文案的视觉化，读屏读下面那行文字即可，避免重复播报 */}
      <div className="yk-ai-usage__track" aria-hidden="true">
        <div className="yk-ai-usage__fill" style={{ transform: `scaleX(${usagePct / 100})` }} />
      </div>
      <div className="yk-ai-usage__text">
        {usageExhausted ? (
          <>
            {/* 滚动窗口 → 恢复时刻因人而异，只能给动态剩余时间，不能写死"明天 0:00" */}
            {usageResetText}{' '}
            <a className="yk-ai-usage__hint" href={`/${locale}/`}>{ui.usageResetHint}</a>
          </>
        ) : (
          <>
            {ui.usageLabel.replace('{pct}', String(sessionPct))}
            {/* 副文案：周额度。0% 时不显示，避免首次进来就堆两个数字 */}
            {weeklyPct > 0 && (
              <span className="yk-ai-usage__sub"> · {ui.usageWeeklyLabel.replace('{pct}', String(weeklyPct))}</span>
            )}
          </>
        )}
      </div>
    </div>
  );

  const statusBars = (
    <>
      {!online && <div className="yk-ai-banner yk-ai-banner--offline">{ui.offline}</div>}
      {showCtxHint && (
        <div className="yk-ai-ctx">
          <span className="yk-ai-ctx__text">{ui.contextHint}</span>
          <button className="yk-ai-ctx__close" onClick={dismissContext} aria-label={ui.contextDismiss}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      )}
    </>
  );

  const charHint =
    overLimit || inputBytes > MAX_CONTENT_BYTES * 0.85 ? (
      <div className={`yk-ai-charhint ${overLimit ? 'yk-ai-charhint--over' : ''}`}>
        {inputBytes} / {MAX_CONTENT_BYTES}
      </div>
    ) : null;

  /* 免责常驻行 —— 两种状态都紧贴输入区（只强化不弱化） */
  const inputNote = <div className="yk-ai-inputnote">{ui.inputDisclaimer}</div>;

  return (
    <div className={`yk-ai ${compact ? 'yk-ai--compact' : 'yk-ai--page'}`} role="region" aria-label={ui.title}>
      <style>{BASE_CSS}</style>
      {/* 读屏状态播报区（视觉隐藏）：回复完成时播报全文摘要 / 错误播报错误信息 */}
      <div className="yk-ai-srstatus" role="status" aria-live="polite">{srStatus}</div>
      <div className="yk-ai-shell">
        {showRail && sidebar('rail')}
        {useDrawer && sidebar('drawer')}
        {aboutSheet}

        <div className="yk-ai-main">
          {/* Topbar —— 极简：侧栏开关 · 会话名 · 模型徽章 */}
          <div className={`yk-ai-topbar ${isEmpty ? 'yk-ai-topbar--hero' : ''}`}>
            <button
              className="yk-ai-iconbtn"
              onClick={() => (useDrawer ? setSidebarOpen(true) : setRailCollapsed((c) => !c))}
              aria-label={ui.openSidebar}
            >
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="3" y="4" width="18" height="16" rx="2.5" /><line x1="9.5" y1="4" x2="9.5" y2="20" />
              </svg>
            </button>
            {railCollapsed && !useDrawer && (
              <button
                className="yk-ai-iconbtn"
                onClick={() => { newSession(); setInput(''); focusInput(); }}
                aria-label={ui.newChat}
                title={ui.newChat}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z" />
                </svg>
              </button>
            )}
            {!compact && (
              <a
                className="yk-ai-iconbtn"
                href={`/${locale}/`}
                aria-label={ui.backHome}
                title={ui.backHome}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" />
                </svg>
              </a>
            )}
            <span className="yk-ai-topbar__title">
              {messages.length > 0 ? (activeSession?.title || ui.untitledChat) : ''}
            </span>
            {servedModel && (
              <span className="yk-ai-topbar__model" title={ui.poweredBy.replace('{model}', servedModel)}>
                {ui.poweredBy.replace('{model}', servedModel)}
              </span>
            )}
            {compact && (
              <a
                className="yk-ai-iconbtn yk-ai-expand"
                href={`/${locale}/tools/ai-assistant/`}
                aria-label={ui.title}
                title={ui.title}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" />
                  <line x1="21" y1="3" x2="14" y2="10" /><line x1="3" y1="21" x2="10" y2="14" />
                </svg>
              </a>
            )}
            {onClose && (
              <button className="yk-ai-iconbtn" onClick={onClose} aria-label={ui.close}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>

          {isEmpty ? (
            /* ============ 状态 A · 欢迎态「居中舞台」 ============ */
            <div className="yk-ai-hero">
              <span className="yk-ai-hero__badge"><AIChatIcon size={32} /></span>
              <div className="yk-ai-hero__greeting">{ui.greeting}</div>
              <div className="yk-ai-hero__sub">{ui.emptySubtitle}</div>
              <div className="yk-ai-hero__composer">
                {statusBars}
                {usageBar}
                {composerCard}
                {charHint}
              </div>
              <div className="yk-ai-pills">
                {ui.suggestions.map((q, i) => (
                  <button key={i} className="yk-ai-pill" onClick={() => sendMessage(q)}>{q}</button>
                ))}
              </div>
              {inputNote}
            </div>
          ) : (
            /* ============ 状态 B · 对话态 ============ */
            <>
              <div className="yk-ai-logwrap">
                {/* aria-live 静音：流式每秒数十次 text 变更会让读屏高频碎读；
                    完成/错误由下方 sr-only 状态区一次性播报 */}
                <div
                  ref={logRef}
                  className={`yk-ai-log ${isLoading ? '' : 'yk-ai-log--smooth'}`}
                  role="log"
                  aria-live="off"
                  aria-busy={isLoading || undefined}
                  onScroll={onLogScroll}
                  onClick={onLogClick}
                >
                  <div className="yk-ai-log__inner">
                  {messages.map((msg, i) => (
                    <div key={i} className="yk-ai-turn">
                      {msg.role === 'user' && editingIdx === i ? (
                        <div className="yk-ai-edit">
                          <textarea
                            className="yk-ai-edit__area"
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            aria-label={ui.edit}
                            autoFocus
                          />
                          <div className="yk-ai-edit__row">
                            <button className="yk-ai-actbtn" onClick={cancelEdit} aria-label={ui.cancel} title={ui.cancel}>
                              <Icon name="close" />
                            </button>
                            <button className="yk-ai-actbtn" onClick={() => submitEdit(i)} aria-label={ui.save} title={ui.save}>
                              <Icon name="check" />
                            </button>
                          </div>
                        </div>
                      ) : msg.role === 'user' ? (
                        <>
                          <div className="yk-ai-msg yk-ai-msg--user">{msg.content}</div>
                          {/* 操作条永远挂载、高度恒定，加载态只切 opacity。原来 !isLoading 是
                              组件级条件：按下发送的一刻，历史里每条消息的 44px 操作条同时卸载
                              （10 轮对话 = 440px 的整屏塌陷），流式结束再原样弹回。
                              不用 disabled：opacity:0 的 disabled 钮对读屏仍可能被枚举，且会让
                              sakura 的 :hover 规则产生半可见闪烁。改用
                              aria-hidden + tabIndex=-1 + pointer-events:none 三件套。
                              （不用 inert：Safari < 15.5 不支持。） */}
                          <div
                            className={`yk-ai-actions yk-ai-actions--user ${isLoading ? 'yk-ai-actions--pending' : ''}`}
                            aria-hidden={isLoading || undefined}
                          >
                            <button
                              className={`yk-ai-actbtn ${copiedIdx === i ? 'yk-ai-actbtn--done' : ''}`}
                              onClick={() => copyMessage(i, msg.content)}
                              tabIndex={isLoading ? -1 : undefined}
                              aria-label={copiedIdx === i ? ui.copied : ui.copy}
                              title={copiedIdx === i ? ui.copied : ui.copy}
                            >
                              <Icon name={copiedIdx === i ? 'check' : 'copy'} />
                            </button>
                            <button
                              className="yk-ai-actbtn"
                              onClick={() => beginEdit(i)}
                              tabIndex={isLoading ? -1 : undefined}
                              aria-label={ui.edit}
                              title={ui.edit}
                            >
                              <Icon name="edit" />
                            </button>
                          </div>
                        </>
                      ) : null}

                      {/* 危机热线卡 —— 本地秒级渲染，不可关闭 */}
                      {msg.role === 'user' && msg.crisis && (
                        <div className="yk-ai-crisis" role="group" aria-label={ui.crisisTitle}>
                          <p className="yk-ai-crisis__title">{ui.crisisTitle}</p>
                          {crisisHotlines.length > 0 && (
                            <>
                              <p className="yk-ai-crisis__body">{ui.crisisBody}</p>
                              <div className="yk-ai-crisis__list">
                                {crisisHotlines.map((h) => (
                                  <a key={h.id} className="yk-ai-crisis__line" href={h.href}>
                                    <span className="yk-ai-crisis__name">
                                      {h.name}
                                      {h.hours && h.hours !== '24h' && <span> · {h.hours}</span>}
                                    </span>
                                    <span className="yk-ai-crisis__num">{h.number}</span>
                                  </a>
                                ))}
                              </div>
                            </>
                          )}
                          <p className="yk-ai-crisis__note">{ui.crisisOutside}</p>
                        </div>
                      )}

                      {/* 躯体急症卡 —— 本地秒级渲染，同样不可关闭。
                          顺序裁决（SPEC §4.3）：**危机卡永远在上，本卡紧随其后** ——
                          危机干预行业惯例是永远优先评估自杀风险；躯体症状不会因为卡片
                          顺序靠后而延误处置（两卡都非 dismissible、都同屏可见）。 */}
                      {msg.role === 'user' && msg.somaticHits && msg.somaticHits.length > 0 && (
                        <SomaticEmergencyCard hits={msg.somaticHits} locale={locale} />
                      )}

                      {/* Assistant —— 等待态渲染进最终气泡（零位移），流式中走轻量渲染
                          （结束后一次富渲染），避免每 chunk 全量 DOM 重建 */}
                      {msg.role === 'assistant' && (() => {
                        const isLive = isLoading && i === messages.length - 1 && streamingMsgKey === activeId;
                        const isPending = isLive && !msg.content;
                        // 内容为空且不在流式中（异常兜底）：不渲染幽灵气泡
                        if (!msg.content && !isPending) return null;
                        return (
                          <>
                            {/* 等待态与完成态是**同一个容器、同一套 padding**，唯一被替换的
                                子节点（.yk-ai-pending）高度被显式钉成正好一行行高 →
                                首 token 到达时位移 = 0px，两套皮肤同时成立。
                                这是本次改动的全部价值，改实现时不能破坏它。 */}
                            <div className={`yk-ai-msg yk-ai-msg--ai ${isLive && msg.content ? 'yk-ai-msg--streaming' : ''}`}>
                              <div className="yk-ai-msg__label">
                                <AIChatIcon size={15} />
                                <span>{ui.title}</span>
                                {isPending && (
                                  <span className="yk-ai-msg__state">
                                    {streamThink ? ui.thinkingDeep : ui.thinking}
                                    <ElapsedBadge since={pendingSince} unit={ui.elapsedSeconds} />
                                  </span>
                                )}
                              </div>
                              {msg.content ? (
                                isLive ? (
                                  <StreamBody content={msg.content} />
                                ) : (
                                  <div dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }} />
                                )
                              ) : (
                                /* 纯视觉占位；语义已由 label 行的状态文案承载，故对读屏隐藏。
                                   刻意只用一条 shimmer，不铺多行骨架屏：骨架屏的前提是
                                   "我知道内容最终多高"，而流式回答长度未知 —— 铺三行、首
                                   token 只有一行就是反向塌陷两行，比不做还糟。 */
                                <div className="yk-ai-pending" aria-hidden="true">
                                  <span className="yk-ai-pending__bar" />
                                </div>
                              )}
                            </div>
                            {/* 条件用 isLive 而非 isLoading —— 非流式的历史 AI 消息在别人
                                流式时仍然可复制（这是上一版丢掉的一个真实能力） */}
                            <div
                              className={`yk-ai-actions ${isLive ? 'yk-ai-actions--pending' : ''}`}
                              aria-hidden={isLive || undefined}
                            >
                              <button
                                className={`yk-ai-actbtn ${copiedIdx === i ? 'yk-ai-actbtn--done' : ''}`}
                                onClick={() => copyMessage(i, msg.content)}
                                tabIndex={isLive ? -1 : undefined}
                                aria-label={copiedIdx === i ? ui.copied : ui.copy}
                                title={copiedIdx === i ? ui.copied : ui.copy}
                              >
                                <Icon name={copiedIdx === i ? 'check' : 'copy'} />
                              </button>
                              {i === lastAiIndex && (
                                <button
                                  className="yk-ai-actbtn"
                                  onClick={regenerate}
                                  tabIndex={isLive ? -1 : undefined}
                                  aria-label={ui.regenerate}
                                  title={ui.regenerate}
                                >
                                  <Icon name="regen" />
                                </button>
                              )}
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  ))}

                    {error && <div className="yk-ai-error" role="alert">{ui.errorPrefix}{error}</div>}
                  </div>
                </div>

                {!atBottom && (
                  <button className="yk-ai-scrollbtn" onClick={() => { setAtBottom(true); scrollToBottom(); }} aria-label={ui.scrollToBottom}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <line x1="12" y1="5" x2="12" y2="19" /><polyline points="19 12 12 19 5 12" />
                    </svg>
                  </button>
                )}
              </div>

              {/* 坞底：状态条 + composer 浮岛 + 免责常驻行 */}
              <div className="yk-ai-dock">
                {statusBars}
                {usageBar}
                {composerCard}
                {charHint}
                {inputNote}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
