/**
 * v2 路由事实源 —— 取代原型的 hash 路由。
 *
 * 原型（index.html:56-90）用 `#/route` / `#/drug/<id>` + hashchange 监听 +
 * localStorage['yak_route'] 兜底。改真实路径后这套【全部作废】：
 *   · parseHash / setRoute / hashchange / history.replaceState → 删除
 *   · yak_route / yak_route_param → 删除（MPA 下无意义）
 *
 * MPA（多页应用）白送了任务书要求的三件事，无需任何客户端路由代码：
 *   · 深链   —— 真实路径本身即深链，且可被外链/GSC 引用（hash 做不到）
 *   · 返回键 —— 浏览器原生历史栈
 *   · 切页滚动置顶 —— 完整页面加载天然从 scrollY=0 开始；
 *                     且后退时浏览器自动恢复原滚动位置，比原型无脑置顶更正确
 *                     （原型 index.html:78 在后退时也 scrollTo(0,0)，其实是缺陷）
 *
 * 屏内所有 `setRoute(r, p)` 调用 → 改为 `hrefFor(r, p)` 生成的 <a href>。
 */

export type V2Route =
  | 'home' | 'urgent' | 'pathway' | 'drugs' | 'drug' | 'doc'
  | 'tools' | 'blood' | 'risk' | 'inject' | 'compare' | 'refs' | 'hospitals';

/**
 * ⚠️ 为什么是 /zh/v2/ 而不是 /v2/ —— 这是【技术硬约束】，不是偏好：
 *
 * Starlight 会自动给 Astro 注入 i18n 配置（node_modules/@astrojs/starlight/index.ts:179
 * → utils/i18n.ts:getAstroI18nConfig）。本仓库 17 个 locale 且未配置 `root` locale，
 * 命中这段逻辑：
 *     routing: { prefixDefaultLocale: (config.isMultilingual && locales?.root === undefined) }
 * → prefixDefaultLocale = true → Astro【不生成任何根级路由】。
 *
 * 实测验证（dev server）：
 *   src/pages/zh/probe3.astro → /zh/probe3/ = 200 ✓
 *   src/pages/probe.astro     → /probe/     = 404 ✗（连 router WARN 都没有 = 路由压根没生成）
 *   src/pages/v2/index.astro  → /v2/        = 404 ✗
 *
 * 要让 /v2/ 可用只能改全站 i18n 配置 —— 那会波及 1072 个页面的路由与 hreflang 图谱，
 * 风险完全不成比例。/zh/v2/ 保留了「命名空间隔离、不动现有路由」的全部意图。
 *
 * 尾斜杠：与既有 /zh/links/ 及全部 Starlight 链接保持一致，
 * 避免 Vercel 产生 301 跳转链（会拖累 Lighthouse 与 SEO）。
 */
const BASE = '/zh/v2';

const PATHS: Record<Exclude<V2Route, 'drug'>, string> = {
  home: `${BASE}/`,
  urgent: `${BASE}/urgent/`,
  pathway: `${BASE}/pathway/`,
  drugs: `${BASE}/drugs/`,
  doc: `${BASE}/doc/`,
  tools: `${BASE}/tools/`,
  /* blood/risk/inject/compare/refs 嵌套在 tools 下 —— 这不是随意分组：
     原型 shell.jsx:37 的 navKey 映射把这 5 个路由的导航高亮指向 tools。
     做成子路径后，「子路由高亮映射到顶级导航」在 URL 层面天然成立
     （pathname.startsWith('/zh/v2/tools')），那张映射表就不必移植了。 */
  blood: `${BASE}/tools/blood/`,
  risk: `${BASE}/tools/risk/`,
  inject: `${BASE}/tools/inject/`,
  compare: `${BASE}/tools/compare/`,
  refs: `${BASE}/tools/refs/`,
  /* hospitals 刻意【不】放 tools 下：shell.jsx:28-35 的 links 数组把它列为
     顶级导航项，且 navKey 映射表故意不含它。虽然它同时是 ToolsScreen 的
     6 张卡之一，但高亮归属决定 URL 归属。 */
  hospitals: `${BASE}/hospitals/`,
};

/** 药物详情用 drugs.json 的 id 直接做 slug（实测 20 条全是 kebab-case，无需另造 slug 字段）。 */
export function hrefFor(route: V2Route, param?: string | null): string {
  if (route === 'drug') {
    if (!param) return PATHS.drugs;
    return `${BASE}/drugs/${encodeURIComponent(param)}/`;
  }
  return PATHS[route];
}

/** 顶级导航项（对应 shell.jsx:28-35 的 links 数组，顺序一致）。 */
export const NAV_LINKS: Array<{ key: V2Route; label: string }> = [
  { key: 'home', label: '首页' },
  { key: 'pathway', label: '路径图' },
  { key: 'drugs', label: '药物图鉴' },
  { key: 'tools', label: '临床工具' },
  { key: 'hospitals', label: '找医院' },
  { key: 'doc', label: '文档' },
];

/**
 * 子路由 → 顶级导航高亮。等价于原型 shell.jsx:37 的 navKey 映射表，
 * 但改由 URL 前缀推导（构建期即可算出，零 JS）。
 *   /zh/v2/drugs/estradiol-injection/ → drugs
 *   /zh/v2/tools/blood/               → tools
 */
export function navKeyFor(pathname: string): V2Route {
  if (pathname.startsWith(`${BASE}/drugs`)) return 'drugs';
  if (pathname.startsWith(`${BASE}/tools`)) return 'tools';
  if (pathname.startsWith(`${BASE}/hospitals`)) return 'hospitals';
  if (pathname.startsWith(`${BASE}/pathway`)) return 'pathway';
  if (pathname.startsWith(`${BASE}/doc`)) return 'doc';
  if (pathname.startsWith(`${BASE}/urgent`)) return 'urgent';
  return 'home';
}
