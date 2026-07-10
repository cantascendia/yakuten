# SPEC — URL 尾斜杠规范化（/zh → /zh/ 301 统一）

- 状态：草案（待审 / 待实施）
- 提出：2026-07-10（seo-ops 首轮 GA∩GSC 分析发现）
- 风险级别：**高**（站级路由，blast radius = 全站每个 URL）
- forbidden 路径：**否**（`vercel.json`/`astro.config.mjs` 均不在 forbidden-paths.txt）——但因高 blast radius，仍走 spec-driven + build 验证 + 人工双签

## 1. 问题（Why）

GA4（属性 541902985）近 28 天热门页显示 **`/zh` 与 `/zh/` 是两行独立数据**：

| 路径 | PV | 跳出率 |
|---|---|---|
| `/zh/` | 846 | 32.0% |
| `/zh`（无斜杠） | 827 | 24.5% |

说明无斜杠版本**返回 200 而非重定向**，导致：

1. **分析数据被拆分**——同一页面的 PV/停留/跳出被摊到两行，所有页级判断失真。
2. **潜在权重分散**——搜索引擎可能把 `/zh` 与 `/zh/` 视作两个 URL，链接权重与排名信号被稀释（尽管 canonical 标签已统一，301 是更硬的信号）。

根因：Astro `trailingSlash` 未配置（默认 `'ignore'`），Vercel 静态托管对 `/zh` 与 `/zh/` 都返回 200。

## 2. 现状事实（核对过）

- `astro.config.mjs`：无 `trailingSlash`、无 `build.format` 设置 → 默认 `trailingSlash: 'ignore'`、`build.format: 'directory'`（产出 `/zh/index.html`）。
- `vercel.json`：有 `redirects` 数组（www→apex、`/`→`/zh/` 等，均 `permanent: true`=301），但**无** `"trailingSlash"` 顶层键、无 `"cleanUrls"`。
- `Head.astro`：canonical = `new URL(pathname, site)`；Starlight 页 `pathname` 带尾斜杠，故 canonical 已统一为带斜杠版本。
- sitemap / hreflang：需确认产出的 URL 是否一致带尾斜杠（见验证清单）。

## 3. 目标（What）

**全站 URL 统一为带尾斜杠形式**，无斜杠 URL 一律 **301** 到带斜杠版本。与已有 canonical 方向一致（canonical 已用带斜杠）。

非目标：不改 URL 结构本身（locale 前缀、路径段不变），只统一尾斜杠。

## 4. 方案对比

### 方案 A（推荐）— Vercel 平台层 `"trailingSlash": true`

在 `vercel.json` 顶层加一行：
```json
"trailingSlash": true
```
Vercel 自动对无斜杠 URL 发 308→带斜杠（对静态资源例外）。

- ✅ 最小改动（1 行）、平台原生、与 canonical 方向一致
- ✅ 不改构建产物，回滚=删这一行
- ⚠ 308（永久，保留方法）而非 301——对 SEO 等效；若坚持 301 需用 `redirects` 规则显式写
- ⚠ 需确认与现有 `redirects` 规则无冲突（www、`/`→`/zh/`、blog 归一等）

### 方案 B — Astro 构建层 `trailingSlash: 'always'`

`astro.config.mjs` 加 `trailingSlash: 'always'`（配合默认 `build.format: 'directory'`）。

- ✅ 源头统一，dev 与 prod 行为一致
- ⚠ blast radius 更大：影响所有内部链接生成、dev server、可能需同步 `redirects`
- ⚠ 需回归所有 `<a href>`、内链、sitemap 生成

**推荐 A**：改动面最小、可秒回滚、与线上 canonical 已有方向一致。B 更"正统"但回归成本高，非必要不动构建层。

## 5. 实施步骤（方案 A）

1. `vercel.json` 顶层加 `"trailingSlash": true`。
2. `npm run build` 通过。
3. 本地 `npm run preview`，验证清单逐项过。
4. 提 PR，标 `requires-double-review`（高 blast radius 自愿双签），人工核对预览环境行为后合并。
5. 合并后 GSC 提交更新的 sitemap；观察 GA `/zh` 行是否并入 `/zh/`（1–3 天）。

## 6. 验证清单（合并前必过）

- [ ] `npm run build` 成功，无路由/sitemap 报错
- [ ] preview：`curl -I /zh` 返回 30x → `Location: /zh/`；`/zh/` 返回 200
- [ ] preview：抽查 `/en/`, `/ja/medications/...`, `/zh/blog/<slug>/` 同样行为
- [ ] 静态资源（`/favicon.svg`、`/sitemap*.xml`、`/og/*.png`、`/robots.txt`）**不被**加尾斜杠（Vercel 默认排除有扩展名的路径，需确认）
- [ ] canonical 标签仍指向带斜杠版本（未变）
- [ ] sitemap 内 URL 全部带尾斜杠，与 301 目标一致
- [ ] 与现有 `redirects`（www→apex、`/`→`/zh/`、blog 归一、`/:locale/medications/:cat/`）无双重重定向或环路
- [ ] `vercel.json` 仍是合法 JSON

## 7. 回滚

删除 `vercel.json` 的 `"trailingSlash": true` 一行，重新部署。无数据迁移、无副作用。

## 8. 成功判据

- GA4 热门页中 `/zh` 无斜杠行消失（或降到近 0），PV 并入 `/zh/`。
- GSC 覆盖率报告无「重复网页，Google 选择的规范网址不同」增量。
