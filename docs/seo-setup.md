# SEO 自动化一次性设置

本项目有 4 条 SEO 数据管道:

| 管道 | 认证 | 首次设置 | 之后 |
|---|---|---|---|
| Google Trends | 无需 | 0 步 | `npm run seo:trends` |
| Google Search Console | 服务账号 JSON | ~10 min(见下) | `npm run seo:gsc` |
| 合并到 keyword-gap.md | 无 | 0 步 | `npm run seo:refresh` |
| AI 策略分析(Gemini) | 复用 Gemini API key | 0 步 | `npm run seo:ai` |

一条命令跑全套: `npm run seo:all`(trends → gsc → refresh → ai)

---

## 一、Google Trends(无认证)

无需任何设置。直接:

```bash
npm run seo:trends
```

**工作方式**:
- 读 `docs/data/trends-keywords.json`(首次运行自动种子 10 个核心词)
- 访问 Google Trends 公共接口,抓取 geo=CN 过去 12 个月的 interest over time
- 写 `docs/data/trends-YYYY-MM-DD.json` + `trends-latest.json`
- 每个关键词得出 avg / peak / recent-4w / slope(↑/↓/—)/ tier(H/M/L)

**修改关键词表**:直接编辑 `docs/data/trends-keywords.json`。

**地域**:默认 `CN`。海外关注度测试:
```bash
TRENDS_GEO=US npm run seo:trends
TRENDS_GEO=JP npm run seo:trends
```

**注意**:Trends 有轻度 rate limit。如果看到 `non-JSON response` 错误,等几分钟再跑。脚本内置 800ms 间隔保护。

---

## 二、Google Search Console(服务账号)

### 步骤 1 — 验证域名(你已有站点才能做)

1. 打开 [Search Console](https://search.google.com/search-console/)
2. 添加属性 → **"网域"(Domain)** → 填 `hrtyaku.com`
3. 按提示在 Vercel DNS 添加 **TXT 记录**,Google 验证
4. 等 DNS 传播(几分钟~几小时)

> 如果你已经用 "URL 前缀" 方式验证过 `https://hrtyaku.com/`,也可以。但 **Domain 属性覆盖更全**(所有子域 + http/https),推荐。

### 步骤 2 — 创建 GCP 项目 + 服务账号

1. [Google Cloud Console](https://console.cloud.google.com/) → 新建项目 `yakuten-seo`(或任意名)
2. 左侧菜单 → **APIs & Services → Enabled APIs** → **Enable "Search Console API"**
3. **APIs & Services → Credentials → Create Credentials → Service Account**
   - Name: `gsc-reader`
   - Role: 留空(不需要 GCP 角色)
   - Continue → Done
4. 进入刚创建的服务账号 → **Keys → Add Key → Create new key → JSON**
5. 下载的 JSON 保存到仓库根目录: `.gsc-credentials.json`
   (已在 `.gitignore`,不会被提交)
6. 记下该服务账号的 email,形如 `gsc-reader@yakuten-seo.iam.gserviceaccount.com`

### 步骤 3 — 把服务账号加入 Search Console

1. [Search Console](https://search.google.com/search-console/) → 选你的属性 → **Settings(设置)→ Users and permissions**
2. **Add user** → 粘贴服务账号 email → Permission: **Full**(或 Restricted,只读够用)
3. 保存

### 步骤 4 — 跑一次

```bash
npm run seo:gsc
```

**预期输出**:

```
→ GSC query  site=sc-domain:hrtyaku.com  2026-03-22 → 2026-04-17
✓ 186 queries → docs/data/gsc-2026-04-19.csv
✓ Alias: docs/data/gsc-latest.csv
```

### 常见错误

| 错误 | 原因 | 解决 |
|---|---|---|
| `invalid_grant` | JSON key 过期或错误 | 重新下载 key,覆盖 `.gsc-credentials.json` |
| `User does not have sufficient permissions for site` | 服务账号未加入 GSC | 回到步骤 3,检查 email 是否完全一致 |
| `Search Console API has not been used` | API 未启用 | 回到步骤 2.2,启用 API |
| `403 The site url must be verified` | 域名未验证 | 回到步骤 1 |
| `startDate > endDate` | GSC 尚无 2 天前的数据 | 用 `GSC_DAYS=60 npm run seo:gsc` |

### 环境变量(可选)

```bash
GSC_CREDENTIALS_PATH=/path/to/other.json   # 默认 .gsc-credentials.json
GSC_SITE_URL=https://hrtyaku.com/          # URL 前缀属性时用;默认 sc-domain:hrtyaku.com
GSC_DAYS=28                                # 拉取天数;默认 28
```

---

## 三、合并到 seo-keyword-gap.md

```bash
npm run seo:refresh
```

**工作方式**:
- 读 `docs/data/trends-latest.json` 与 `docs/data/gsc-latest.csv`(有一个就跑一个)
- 在 `docs/seo-keyword-gap.md` 末尾 **AUTO-SNAPSHOT** 区块插入/替换以下表:
  1. Google Trends 全关键词表(avg/peak/recent/slope/tier)
  2. GSC top 40 queries(带 top landing page)
  3. **Striking distance**:排位 10-30 且 ≥20 impressions 的 quick-win 改写目标
  4. **Trends 高但 GSC 排位 >20**:交叉对照,优先改写
- **手工维护的 P0/P1/P2 表格保留不动**(在 AUTO-SNAPSHOT 块外)

每月跑一次即可追踪趋势。

---

## 三·五、AI 策略分析(Gemini)

```bash
npm run seo:ai                 # 调 Gemini 生成行动报告
npm run seo:ai -- --dry-run    # 只验证数据管道,不调 API
```

**工作方式**:
- 读 `gsc-latest.csv` + `trends-latest.json` + `seo-keyword-gap.md`(策略上下文)+ `llms.txt`(页面清单)——有哪个读哪个,至少要有 GSC 或 Trends 之一。
- 喂给 Gemini(`gemini-3-flash-preview`,可用 `SEO_AI_MODEL` 覆盖),产出:Striking-distance 快赢 / 内容缺口 / AEO 改进 / 本轮 Top 5。
- 写 `docs/data/ai-seo-report-YYYY-MM-DD.md` + `ai-seo-report-latest.md`。

**认证**:复用 `GOOGLE_GENERATIVE_AI_API_KEY`(AI 问答那把同款 key)。本地从 `.env.local` 自动加载,CI 用环境变量。

**隐私**:GSC 行是站点自己页面的**聚合搜索词**(不是用户健康数据/对话/血检),仅用于 SEO 分析,不越隐私红线。报告文件 gitignore(衍生自 GSC,可能含真实搜索词)。

---

## 四、定时自动化(可选,未启用)

想每月自动刷新,两种路径:

### GitHub Actions(推荐,免费)

```yaml
# .github/workflows/seo-refresh.yml
name: SEO refresh
on:
  schedule:
    - cron: '0 3 1 * *'  # 每月 1 号 03:00 UTC
  workflow_dispatch:
jobs:
  refresh:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
      - run: echo "${{ secrets.GSC_CREDENTIALS_B64 }}" | base64 -d > .gsc-credentials.json
      - run: npm run seo:all
      - uses: peter-evans/create-pull-request@v6
        with:
          commit-message: "chore(seo): monthly snapshot refresh"
          branch: seo/auto-snapshot
          title: "SEO monthly snapshot"
```

把 `.gsc-credentials.json` 的 base64 存到 GitHub Secret `GSC_CREDENTIALS_B64`。

### Vercel Cron(也行,不推荐)

Vercel cron 需要 serverless function,不如 GitHub Actions 直白。

---

## 五、数据文件一览

| 文件 | 来源 | 是否提交 |
|---|---|---|
| `docs/data/trends-keywords.json` | 手工编辑 | ✅ 提交 |
| `docs/data/trends-YYYY-MM-DD.json` | `seo:trends` | ✅ 提交(作为历史) |
| `docs/data/trends-latest.json` | `seo:trends` | ✅ 提交 |
| `docs/data/gsc-YYYY-MM-DD.csv` | `seo:gsc` | ❌ 不提交(含真实搜索词,涉及用户隐私) |
| `docs/data/gsc-latest.csv` | `seo:gsc` | ❌ 不提交 |
| `.gsc-credentials.json` | GCP 下载 | ❌ 不提交(私钥) |

---

## 六、FAQ

**Q: 为什么 Trends 不用 API key?**
Google Trends 没有官方 API;用的是开源封装 `google-trends-api`,直接抓公共页面。流量大时可能被临时限速,脚本已加间隔保护。

**Q: GSC 为什么用服务账号而不是 OAuth?**
OAuth 需要浏览器弹窗授权,不适合 CI/自动化。服务账号是 Google 官方对这类场景的推荐方式。

**Q: GSC 刚验证,跑脚本没数据?**
GSC 需要 2-3 天才有第一条数据。新站尤其如此。用 `GSC_DAYS=90` 向前翻更多。

**Q: Trends 里某个关键词 avg=0?**
该词在 Google Trends 上达不到起步阈值(每月搜索量 <~100)。这本身就是信号:小众,不要押注。
