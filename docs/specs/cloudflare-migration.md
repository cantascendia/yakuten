# SPEC — 托管从 Vercel 迁到 Cloudflare Pages

> 状态：草案（2026-10-23）
> 授权：owner 2026-10-23「先帮我搬家到 cloudflare」；AI Chat 产品化三阶段计划的第 ② 阶段
> （①chat → ②CF → ③Stripe 捐赠）。
> `api/` 为 forbidden 路径（CONSTITUTION §4）—— 本文为双签第一签。

## 0. 为什么搬（以及为什么不急）

2026-10-23 查 Vercel：**容量不是问题**。7 天运行错误全部来自上游 AI（Gemini 免费层
3.6-flash 已降到 20 RPD、503 high demand、首字节超时），没有一条是 Vercel 自身的。

搬家的真实收益：

| 痛点 | Vercel Hobby | Cloudflare Pages（Free） |
|---|---|---|
| **函数 25s 首响应硬墙** | 有 —— 近两次线上 P0（504 / 思考模式 503）都撞它；链路层为此背了 `HARD_WALL_MS` / `FIRST_CHUNK_MS` 两套预算 | 无 wall-clock 上限（只计 CPU 时间；等待上游 fetch 不计） |
| 商用条款 | Hobby 仅限非商用（阶段 ③ 捐赠后边界模糊） | 无此限制 |
| 静态带宽 | 100 GB/月 | 不计量 |
| 函数调用 | 足够 | 100k 次/天（AI 问答远低于此） |
| 大陆可达性 | 一般 | 一般 —— **不是搬家理由**，也不是不搬的理由 |

不搬也能活；搬是为了把「25s 墙」这一类故障从架构里拿掉。

## 1. 范围

**搬**：静态站（`astro build` → `dist/`）、`api/ai-chat.ts`、40 条重定向、5 组响应头、
统计（Vercel Analytics / Speed Insights）。

**不搬 / 不改**：AI 降级链逻辑、内容、GA4、Pagefind、i18n 路由。

## 2. 映射

### 2.1 静态站

Cloudflare Pages 连 GitHub `cantascendia/yakuten`，构建命令 `npm run build`，输出 `dist`，
Node 版本与 Vercel 一致（24）。Astro 保持 `output: 'static'`，**不引入** `@astrojs/cloudflare`
adapter（站点没有 SSR 页面，adapter 只会增加变数）。

### 2.2 AI 端点：`api/ai-chat.ts` → `functions/api/ai-chat.ts`

- 处理函数本身就是标准 `(Request) => Response`，Pages Function 只需一层薄包装：
  `export const onRequestPost = (ctx) => handler(ctx.request)`，其余方法同理转发（405 逻辑留在 handler 内）。
- **环境变量**：handler 读 `process.env`。开 `nodejs_compat` + compatibility_date ≥ 2025-04-01
  时 Workers 会用 vars/secrets 填充 `process.env` —— **实施时第一件事就是在 preview 验证这一点**；
  若不成立，改为在包装层把 `ctx.env` 注入一个模块级 getter（`envStr()` 是唯一读点，改动集中）。
- **密钥一律用 Secrets**（`wrangler pages secret put` 或面板），不进 `wrangler.toml`。
- 依赖：`@ai-sdk/google`、`ai`、`@anthropic-ai/sdk` 均为 fetch 实现，Workers 兼容；
  实施时以 preview 实测为准。
- **25s 墙去掉后的连带改动**：`HARD_WALL_MS` / `WALL_SAFETY_MS` 改为可配置并放宽，
  `FIRST_CHUNK_MS`（12s，单个候选的首块上限）**保留** —— 它防的是「一个慢模型拖住整条链」，
  与平台无关。具体数值另起 PR，本迁移只做到「行为不变」。
- 进程内 Map（限流 / 冷却 / 配额）：语义同 Vercel（每 isolate 一份，尽力而为），无需改。
- 隐私红线不变（§4 of ai-chat-multi-tier-fallback）：Workers 的 `console.*` 同样进日志，
  2026-10-23 的 `onError` 修复必须随迁移带过去（由回归测试守）。

### 2.3 重定向：`vercel.json` → `public/_redirects` + Cloudflare 规则

| Vercel 规则 | Cloudflare 落点 |
|---|---|
| `www.hrtyaku.com/*` → apex（host 匹配） | **Redirect Rule**（zone 级）—— `_redirects` 不支持按 host 匹配 |
| `/` → `/zh/` | `_redirects`：`/ /zh/ 301` |
| `/:locale/zh/blog/*` → `/zh/blog/*` | `_redirects` 占位符 `:locale` + splat |
| `/:locale(en\|ko\|…)/blog/*`（正则约束） | `_redirects` 不支持正则 → **按 10 个语种展开成 10 行** |
| `/:locale(zh\|en\|ja\|ko)/medications/:cat(…)/` | 展开为 4 × 4 = 16 行 |
| 35 条中文路径短链（`/zh/药物/螺内酯` 等） | `_redirects` 逐行；路径写 **UTF-8 原文** 并在 preview 用百分号编码的请求实测 |

上限：静态 2000 条 / 动态 100 条，远够。由脚本 `scripts/gen-redirects.mjs` 从 `vercel.json`
生成并加测试，迁移完成前两份并存，避免手抄漂移。

### 2.4 响应头：`vercel.json` headers → `public/_headers`

5 组一一对应（`/_astro/*` immutable、图片 / og / 小文件缓存、全站安全头）。**CSP 改动**：
删去 `va.vercel-scripts.com`、`vitals.vercel-insights.com`；如启用 Cloudflare Web Analytics
JS 信标则加 `static.cloudflareinsights.com`（script-src）与 `cloudflareinsights.com`（connect-src）。

### 2.5 统计

- 删除 `@vercel/analytics`、`@vercel/speed-insights`（`Head.astro`、`V2Layout.astro`）。
- 替代：**Cloudflare Web Analytics**（无 Cookie、不采集个人数据，符合 CLAUDE.md 的
  aggregate-only 约束）。
- ⚠️ **大陆流量的测量口径会变**：现状 CLAUDE.md 依赖 Vercel Analytics 统计大陆访问（GA 被墙）。
  域名接入 Cloudflare 代理后，**zone 级 HTTP 流量分析是服务端统计、不依赖 JS**，大陆访问同样可见 ——
  以它作为大陆口径；JS 信标的大陆可达性在切换前实测，不可达也不影响口径。
- `yakuten-dev` opt-out 逻辑：Cloudflare 信标不支持同款开关 → 改为在 dev / preview 构建不注入。
- **17 语种隐私声明**（about / editorial-policy / 页脚 / 工具总览，PR #139 写入的
  「Vercel Web Analytics / Speed Insights」）必须同步改为 Cloudflare Web Analytics，与切换同一个 PR 上线。
  不同步 = 隐私声明再次与实际不符（#139 刚修过同类问题）。

### 2.6 DNS 与切换

1. 域名接入 Cloudflare（改 NS）—— **owner 操作**（需注册商后台）。先只建记录、不切流量。
2. Pages 项目绑定 `hrtyaku.com` / `www`，Cloudflare 自动签证书。
3. 在 `*.pages.dev` preview 上跑完 §3 全部验收。
4. 切换：DNS 指向 Pages。Vercel 项目**保留 14 天**不删，作为一键回滚（DNS 指回即可）。
5. HSTS `preload` 已在用：切换全程必须 HTTPS 无间断（Cloudflare 证书先签好再切）。

## 3. 验收（preview 上逐项打勾）

- [ ] 全站构建产物与 Vercel 一致（页面数、Pagefind 索引、sitemap）
- [ ] 40 条重定向：脚本逐条请求，状态码与 Location 与 Vercel 生产完全一致（含中文路径）
- [ ] 响应头：逐组比对，CSP 下页面无 console 报错
- [ ] `/api/ai-chat`：既有 mock 模拟套件全绿；真实请求 fast / think / 寒暄各一次；
      `process.env` 读到全部 key（日志 `tiers armed` 行）
- [ ] **隐私回归**：带标记串的请求触发上游错误，日志中不出现标记串
- [ ] 长回答（思考模式）超过 25s 不被截断
- [ ] 17 语种隐私声明已改为 Cloudflare Web Analytics
- [ ] Lighthouse 不低于 Vercel 基线

## 4. 回滚

DNS 指回 Vercel（TTL 设 300s 以便快速回切）。代码层两份配置并存到下线 Vercel 为止。

## 5. 需要 owner 做的事

1. Cloudflare 账号（免费）并把 `hrtyaku.com` 加进去（改 NS 需要注册商后台）。
2. 给 Claude 一个**限定权限**的 Cloudflare API Token（Pages 编辑 + 该 zone 的 DNS/规则编辑），
   或在本机 `wrangler login` —— 之后的创建项目、配 secrets、规则、切换由 Claude 完成。
3. 把各家 AI key 填为 Pages Secrets（或交给 Claude 用 wrangler 写入，key 不进仓库、不进对话日志）。

## 6. 不做

- 不改 AI 降级链行为（25s 墙相关预算的放宽另起 PR）
- 不引入 KV / D1 / Durable Objects（限流共享化是 LT-4 的事，单独评估）
- 不迁 GA4

## 附：迁移前已修的坑（2026-10-23）

`vercel.json` 的 35 条中文短链只写了 UTF-8 原文，浏览器发的是百分号编码路径，
规则从 2026-04 起从未命中（PR #143 补编码副本）。生成 `_redirects` 时**两种写法都要**，
验收脚本用编码路径请求（§3 第 2 项）。
