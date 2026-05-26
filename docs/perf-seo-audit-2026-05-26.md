# Yakuten Performance + Technical SEO Audit — 2026-05-26

**Branch**: `claude/perf-seo-audit`
**Scope**: Core Web Vitals + bundle/asset hygiene + schema.org coverage + hreflang correctness + vercel.json caching/security headers
**Method**: 3 parallel Explore sub-agents (perf / build-asset / SEO-schema) + manual code re-verification of every Explore finding
**Reference standard**: SPEC.md §7 (SEO) + §10.1 (perf targets: Lighthouse 95+, LCP <2.5s, FID/INP <100ms, CLS <0.1), `.agents/skills/release-readiness/SKILL.md`

---

## Executive summary

| 维度 | 状态 | 备注 |
|------|------|------|
| vercel.json 安全/缓存头 | 🔴 → ✅ | CSP / HSTS / X-Content-Type-Options / X-Frame-Options / Referrer-Policy / Permissions-Policy + Cache-Control 分 5 个 scope 注入 |
| public/ CDN 体积 | 🔴 → ✅ | 删除 15 个未引用的 PNG 源 master（20.5 MB），public/images/diagrams 从 25 MB → 4.5 MB |
| 博客 hreflang 指向 404 | 🔴 → ✅ | BlogPostLayout 改为基于实际 locale allowlist 生成 alternates |
| 医院无 MedicalOrganization schema | 🔴 → ✅ | HospitalCard.astro 注入 PostalAddress + MedicalProcedure JSON-LD |
| 工具页 SoftwareApplication | 🟡 → ✅ | JsonLd.astro 加 isToolPage 分支，emit SoftwareApplication + MedicalWebPage |
| BlogPostJsonLd 类型 | 🟡 → ✅ | Article → BlogPosting；frontmatter author → Person schema（非编辑团队署名时） |
| 字体权重缺失 | 🟡 → ✅ | Manrope 600 + Noto Sans SC/JP/KR 700 + Space Grotesk 700 添加到 Google Fonts URL |
| BloodTestChecker 阻塞 hydration | 🟡 → ✅ | 5 处 `client:load` → `client:visible` |
| 测试覆盖 | 🔴 → ✅ | 新增 `tests/perf-seo.spec.ts` 9 个用例全绿 |

---

## Findings & remediation

### 1. vercel.json 仅 redirects，无 headers（BLOCKER）

**问题**：56 行 vercel.json 只配置了 30+ 个 redirects，完全没有 `headers` 数组。后果：
- 所有静态资源走 Vercel 默认 cache（HTML 短 revalidate、JS/CSS 取决于路径），缺乏 immutable hint
- 没有任何安全 header：无 HSTS / CSP / X-Frame-Options / X-Content-Type-Options / Referrer-Policy
- 医疗站缺 CSP 等于把 XSS surface 完全暴露

**修复**（commit `96916e4`）：5 个 source 分别配置：
- `/_astro/(.*)` — `max-age=31536000, immutable`（hashed Astro 构建产物）
- `/(images|brands)/(.*)` — `max-age=86400, stale-while-revalidate=604800`
- `/og/(.*)` — `max-age=3600, stale-while-revalidate=86400`（每次 build 重新生成）
- `/(favicon|manifest|robots|llms|sitemap|og-image)` — 同上
- `/(.*)` 全局 — HSTS（2 年含 preload）+ X-Content-Type-Options nosniff + X-Frame-Options DENY + Referrer-Policy strict-origin-when-cross-origin + Permissions-Policy（关闭 sensors/camera/geolocation/payment/usb）+ CSP

**CSP 策略**：
```
default-src 'self';
script-src 'self' 'unsafe-inline' https://va.vercel-scripts.com https://vitals.vercel-insights.com;
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
font-src 'self' https://fonts.gstatic.com data:;
img-src 'self' data: blob: https:;
connect-src 'self' https://va.vercel-scripts.com https://vitals.vercel-insights.com
            https://generativelanguage.googleapis.com https://doi.org https://*.doi.org;
frame-ancestors 'none';
base-uri 'self';
form-action 'self';
object-src 'none';
upgrade-insecure-requests
```
`unsafe-inline` 是 Astro hydration 与 Starlight 搜索的硬性需求；未来若改为 nonce/hash 模式需 Astro middleware。

### 2. 20.5 MB 未引用 PNG 源 master 部署到 CDN（BLOCKER）

**问题**：`public/images/diagrams/zh/source/` 包含 15 个 1.3-1.6 MB 的 PNG 文件（codex 流水线 commit `1dd0af4` 等批量交付）。所有页面引用的是同级 `*.webp`（130-164 KB），PNG 源文件**零引用**但仍随 public 部署到 Vercel CDN — 浪费 20.5 MB 带宽与 CDN 存储。

**修复**（commit `692d65c`）：`git rm -r public/images/diagrams/zh/source/` + `.gitignore` 加入 `public/images/diagrams/*/source/` 模式（防止再次引入）。文件保留在 git 历史（commit hash 列在 .gitignore comment 里），需要重新处理 WebP 时可 checkout 恢复。

`public/images/diagrams` 体积：25 MB → 4.5 MB。

### 3. BloodTestChecker `client:load` 阻塞 FCP（HIGH）

**问题**：5 处 `<BloodTestChecker client:load />`（zh/blood-tests.mdx 的 404 行 MDX 内容尾部 + 4 语 tools/blood-checker.mdx）。`client:load` 强制 JS bundle 在页面初始化时同步 hydrate，~67 KB 阻塞 FCP。

**修复**（commit `2335cd8`）：全部改为 `client:visible`。SPEC.md §5.6 明确除 AIAssistant 外都用 visible/idle。

- 在 tools 页面上 BloodTestChecker 是首屏内容，`client:visible` 与 `client:load` UX 实质等价（进入视口即触发）
- 在 blood-tests.mdx 上节省了 400 行 MDX 的渲染期 hydration 阻塞

AIAssistant 保留 `client:load`（SPEC.md 明确要求）。

### 4. 博客 hreflang 指向 404（BLOCKER）

**问题**：`BlogPostLayout.astro` 历史代码 `localeMap` 硬编码 4 locale，每篇博客 emit 4 个 hreflang alternates。但博客**只存在 zh 版本**（与 PR #8 内容审计 BACKLOG P1-1 一致），所以每篇 zh 博客都声明了 3 个指向 404 的 en/ja/ko 镜像 — Search Console 报错，crawl 预算浪费。

**修复**（commit `d7367d9`）：改为 `blogLocaleMap` 按 locale 显式声明，目前只有 `zh: [{ code: 'zh-CN' }]`。x-default 也改成指向 post 的实际 locale 而非硬编码 `/zh/`。en/ja/ko 翻译上线后只需在 map 中追加即可。

### 5. 医院无 MedicalOrganization schema（BLOCKER）

**问题**：`/zh/tools/hospital-finder/` 渲染 15 家友好医院的视觉卡片，但零 schema.org 标记。Google 的 MedicalOrganization / Maps 索引无法发现。

**修复**（commit `e044922`）：HospitalCard.astro 注入 `<script type="application/ld+json">`，每张卡片 emit：
- `@type: MedicalOrganization` + `@id` 稳定 fragment URL
- `name` + nested `department` (MedicalOrganization)
- `medicalSpecialty: Endocrinology`
- `address: PostalAddress`（addressCountry CN, region 省, locality 市, streetAddress 当 hospitals.json 有 address 字段时）
- `availableService` → 每个 service 字符串映射为 MedicalProcedure
- `audience: MedicalAudience / Patient`

未加 `geo` 坐标（hospitals.json 暂无 lat/lng，需另开 phase 收集）。

### 6. 工具页缺 SoftwareApplication schema（HIGH）

**问题**：9 个 `/tools/*` 交互工具（blood-checker / dose-simulator / drug-comparator 等）只 emit 通用 MedicalWebPage，Google 的 HealthApplication / 软件 rich results 永远不命中。

**修复**（commit `c5f5535`）：JsonLd.astro 加 `isToolPage` 检测（`path[0] === 'tools' && length >= 2`，跳过 `/tools/` hub landing），emit pair `@type: ['SoftwareApplication', 'MedicalWebPage']`：
- applicationCategory: HealthApplication
- applicationSubCategory: MedicalCalculator
- operatingSystem: Any (web-based)
- browserRequirements: JavaScript enabled
- isAccessibleForFree: true
- offers: { price: 0 }

### 7. 字体权重缺失导致 font-synthesis（HIGH）

**问题**：CSS 用了 `font-weight: 600` (Manrope) 和 `font-weight: 700` (Noto Sans SC/JP/KR + Space Grotesk)，但 Google Fonts URL 只请求 400/500 (Sans) / 400/500/700 (Manrope) / 300/500 (Space Grotesk)。浏览器只能用 font-synthesis（粗体合成）— 每字形 ~1.2 KB 像素工作 + 视觉粗糙，CJK 尤其明显。

**修复**（commit `ea1b86c`）：
- Manrope: 400;500;700 → 400;500;600;700
- Noto Sans SC/JP/KR: 400;500;600 → 400;500;600;700
- Space Grotesk: 300;500 → 300;500;700
- Noto Serif 三个 + JetBrains Mono：原已正确

代价：首次访问 zh 页面 ~150 KB 额外字体下载（Noto Sans SC 权重 700 的 unicode 子集），cache 后零成本。视觉收益每页都在。

### 8. BlogPostJsonLd schema 升级（MEDIUM/HIGH）

**问题**：
- `@type: Article` 太通用，schema.org/BlogPosting 是 Google 博客 rich-result 的更精确入口
- 作者硬编码为 Organization @id，丢失 E-E-A-T 的署名信号

**修复**（commit `715f48c`）：
- @type → BlogPosting
- 接收 frontmatter `author` 字段。编辑团队署名（"HRT药典编辑部" / "HRT Yakuten Editorial" / 四语等价）保持 Organization 引用；其他署名渲染为 `{ @type: 'Person', name }`
- FAQPage emission 经验证已存在（line 62-71），Explore agent 误报

Audit 时 14 篇 zh 博客全部是编辑团队署名，视觉 JSON-LD 暂不变；将来医学顾问署名博客出现时 schema 自动升级。

---

## Explore agent 误报复核（保留原状）

按代码实地验证发现下列 agent 标记的"问题"实际不存在或已修：

| Agent 声称 | 实际状态 |
|-----------|---------|
| FloatingAIChat `client:load` | Footer.astro:66 实际是 `client:idle` ✓ |
| Blog FAQPage schema 缺失 | BlogPostJsonLd.astro:62-71 已 emit ✓ |
| 25 MB 全是未优化 PNG | 21 MB 是未引用 source masters；4 MB 是已优化 WebP（引用中） |
| Dark theme muted text 3.18:1 | 实测 ~9.5:1（agent 颜色估算错误） — PR #9 已确认 |
| Manrope 600 缺失 | Astro 默认 URL 已含 400;500;700，但缺 600；audit 命中 |

---

## 显式不做（范围外）

按风险/ROI 评估，下列项进入 REVIEW-BACKLOG：

1. **Sakura 字体 @import 改造** — `sakura-theme.css:13` 顶部 @import 加载 ~10 个手账字体 family 即使 sakura mode 未激活；改造为 JS 条件注入需要重构 sakura toggle + FOUC 风险，独立 PR 推进
2. **OG 图像 PNG → WebP** — 节省 60-70% 体积，需要修改 generate-og-images.mjs 渲染管线；中等工作量
3. **Sakura CSS 整体懒加载** — 1443 行 CSS（24 KB gzip）始终捆绑到 common chunk；改造方案多，单独 PR
4. **Critical CSS inline 首屏前 10 KB** — 需要 Astro middleware / Vite 插件；ROI 一般
5. **Drug 品牌 Product schema** — DrugBrandIndex / drug-cards 暂未 emit per-brand Product；信息架构变化大，独立 PR
6. **Medical advisors Person schema** — medical-advisors.mdx 列表化展示，需结构化数据
7. **AI rate limit 持久化（Vercel KV / Upstash）** — 已在 BACKLOG P2-1，不属本次审计
8. **Baidu 特定 meta 标签** — `<meta http-equiv="Cache-Control" content="no-transform">` 等，可加但 ROI 不明

---

## 提交映射

| Commit | 主题 |
|--------|------|
| `96916e4` | chore(deploy): add Cache-Control + security headers to vercel.json |
| `692d65c` | chore(public): drop 15 unreferenced source PNG masters from /public/ |
| `2335cd8` | perf(hydration): BloodTestChecker client:load → client:visible (×5) |
| `d7367d9` | fix(seo): drop hreflang to non-existent en/ja/ko blog mirrors |
| `e044922` | feat(seo): emit MedicalOrganization JSON-LD per HospitalCard |
| `c5f5535` | feat(seo): tool pages emit SoftwareApplication + MedicalWebPage schema |
| `ea1b86c` | chore(fonts): add missing 600/700 weights to Google Fonts URL |
| `715f48c` | feat(seo): BlogPostJsonLd → BlogPosting + Person author from frontmatter |
| `ba8d914` | test: add 9 perf/SEO regression tests |
| _本提交_ | docs: perf-seo audit report + STATUS/BACKLOG updates |

---

## 验证

```bash
npx astro check       # 97 files, 0 errors / 0 warnings
npm run build         # 236 pages built; 235 sitemap URLs; OG 219 ok
npx playwright test tests/perf-seo.spec.ts  # 9 passed
node -e "JSON.parse(require('fs').readFileSync('vercel.json'))"  # config valid
```

人工抽查清单：
- 部署后 curl 任意页面：`HSTS / X-Content-Type-Options / X-Frame-Options / CSP` 全部 present
- `/_astro/*.js` 响应 `Cache-Control: public, max-age=31536000, immutable`
- `/zh/tools/blood-checker/` 页面 JSON-LD 包含 `SoftwareApplication`
- `/zh/tools/hospital-finder/` 页面 JSON-LD 包含 15 条 `MedicalOrganization`
- `/zh/blog/cpa-dose-safe-range/` HTML 中 hreflang 只声明 zh-CN + x-default（无 en/ja/ko）
- `/zh/blog/*` JSON-LD `@type` 为 `BlogPosting`

---

## 后续（写入 REVIEW-BACKLOG）

| ID | 项目 | 原因 |
|----|------|------|
| P2-PERF-1 | Sakura 字体 @import 改造为 JS 条件注入 | 全站每页 ~10 个手账字体 family 强制下载，仅 sakura mode 激活时真正使用 |
| P2-PERF-2 | OG 图像 PNG → WebP / AVIF | 节省 60-70% 体积，需修改 generate-og-images.mjs |
| P2-PERF-3 | Sakura CSS 整体懒加载（24 KB gzip） | 始终捆绑到 common chunk，需 sakura toggle 重构 |
| P2-SEO-1 | Drug 品牌 Product schema | DrugBrandIndex / drug-cards per-brand 结构化数据 |
| P2-SEO-2 | Medical advisors Person schema | medical-advisors.mdx 列表 → Person 节点 |
| P2-SEO-3 | Compare 页面双 Drug 节点 | compare/* 当前是通用 MedicalWebPage |
| P3-PERF-1 | Critical CSS inline 首屏前 10 KB | 中等 ROI，Astro middleware 需求 |
| P3-SEO-1 | Baidu 特定 meta 标签 | `<meta http-equiv="Cache-Control" content="no-transform">` 等 |
