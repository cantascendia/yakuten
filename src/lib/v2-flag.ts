/**
 * 绯英典籍 v2 预览的【功能门控】（review #8）
 *
 * 为什么需要它：v2 的 13 个路由是**含医疗警告、剂量、副作用的生产页面**，
 * 但目前只有 zh 一种语言。CONSTITUTION §3 要求医疗安全内容 zh/en/ja/ko 四语同步上线。
 *
 * `noindex` meta【不是】§3 的豁免 —— 它只是给爬虫的索引指令，不是访问控制：
 * 合并后任何拿到 URL 的用户仍能访问这些页。review #8 明确指出这一点。
 *
 * 真正的门控 = 默认【不构建】这些页。flag 关闭时 getStaticPaths 返回 []，
 * 页面根本不存在（真实 404），而不是"存在但叫爬虫别收录"。
 *
 * 开关逻辑（cross-model review 加固）：
 *   · `import.meta.env.DEV`（本地 dev server）→ 始终开，方便继续开发
 *   · 构建期：仅当 `VERCEL_ENV === 'preview'` 且 `V2_PREVIEW === '1'` 才开
 *   · 其余（Production，或未设变量）→ 关，/zh/v2/* 不构建、不可访问
 *
 * 为什么要 VERCEL_ENV 双条件（而不是单看一个 PUBLIC_ 变量）：
 *   单看 `PUBLIC_V2_PREVIEW` 有风险 —— 一旦有人在 Production 环境也设了它，
 *   医疗页就会全量上线。加 `VERCEL_ENV === 'preview'` 硬门，即使变量误配到
 *   Production 也不会开。且用【非 PUBLIC_ 前缀】的 V2_PREVIEW（构建期私有变量，
 *   不注入客户端 bundle），降低暴露面。
 *
 * 使用建议：在 Vercel 的【Preview 环境】设 `V2_PREVIEW=1`（Production 不设，
 * VERCEL_ENV 由 Vercel 自动注入）→ 预览部署能看，正式域名 404。
 * 非 Vercel 的本地/CI 全量预览：`VERCEL_ENV=preview V2_PREVIEW=1 npm run build`。
 *
 * 转正前置条件（届时移除本 flag 与 V2Layout 的 noindex）：
 *   四语安全内容补齐 + 视觉签字 + 医学逻辑双签（docs/specs/v2-medical-logic-reuse.md）。
 */
/* 注意变量读取方式：
   · import.meta.env.DEV 是 Vite 内建布尔，各处可用，标识 dev server。
   · VERCEL_ENV / V2_PREVIEW 是非 PUBLIC_ 前缀的构建期变量 —— Vite 不会把它们注入
     import.meta.env（那只暴露 PUBLIC_ 前缀）。本文件只被 [...path].astro 的
     getStaticPaths 在【构建期 Node 上下文】import，故用 process.env 读取，最可靠。
     typeof 守卫防止万一被客户端 import 时 process 未定义而报错。 */
const env = typeof process !== 'undefined' ? process.env : ({} as Record<string, string | undefined>);
const isPreviewBuild = env.VERCEL_ENV === 'preview' && env.V2_PREVIEW === '1';

export const V2_ENABLED: boolean = import.meta.env.DEV || isPreviewBuild;
