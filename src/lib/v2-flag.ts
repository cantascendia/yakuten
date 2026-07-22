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
 * 开关逻辑：
 *   · `import.meta.env.DEV`（本地 dev server）→ 始终开，方便继续开发
 *   · `PUBLIC_V2_PREVIEW === '1'`（构建期环境变量）→ 开
 *   · 其余（默认的生产构建）→ 关，/zh/v2/* 不构建、不可访问
 *
 * 使用建议：在 Vercel 的【Preview 环境】设 `PUBLIC_V2_PREVIEW=1`，
 * 【Production 环境】不设 → 预览部署能看，正式域名 404。
 *
 * 转正前置条件（届时移除本 flag 与 V2Layout 的 noindex）：
 *   四语安全内容补齐 + 视觉签字 + 医学逻辑双签（docs/specs/v2-medical-logic-reuse.md）。
 */
export const V2_ENABLED: boolean =
  import.meta.env.DEV || import.meta.env.PUBLIC_V2_PREVIEW === '1';
