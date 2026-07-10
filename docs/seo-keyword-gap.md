# SEO 关键词差距分析 — mtf.wiki vs hrtyaku.com

**用途**: 追踪 mtf.wiki 占据高排位但 yakuten 覆盖不足的关键词,按月度滚动刷新。
**工作流**: 导出 → 标注覆盖度 → 优先级排序 → 产出选题 → 发布 → 跟踪排位变化。

---

## 方法学说明(2026-04-19 初版)

**本页数字来源**:本轮未接 Ahrefs / SEMrush / Baidu Index 付费 API。volume 列以**三档定性估计(H/M/L)** 代替精确月搜索量,推理基于:

1. **中文 MTF 社区规模代理**:微博相关 tag 累计阅读量 · Telegram 主要中文跨性别群体量级 · 知乎相关话题关注数 · 百度指数可公开查询的趋势曲线(无需付费)
2. **关键词语义广度**:药品名是否同时是妇科/心内科常用药(搜索被非 MTF 用户稀释)
3. **SERP 对照**:手工抽查 Google 中文 / Bing 中文前 20 条结果,观察 mtf.wiki 的占位模式
4. **作者领域判断**:中文跨性别用药搜索行为的定性认知

**三档定义**:
- **H (High)** ≈ 月搜索 500+ (中文 Google + Bing 合计) · 具有独立 SEO 价值
- **M (Medium)** ≈ 月搜索 100-500 · 值得单页覆盖
- **L (Low)** ≈ 月搜索 <100 · 长尾/博客聚合收口

> 建议 3 个月内接入免费的 **Google Search Console**(关联 hrtyaku.com 后能看自己的 impressions + 位置数据),6 个月内考虑 Ahrefs Lite(每月 $99 可看 mtf.wiki 外部排名)。本文件末尾有自动化刷新脚本位占用。

---

## 一、**P0 关键词**(立即行动,6 个月内目标进前 5)

### 药物名 — 最高商业/品牌价值

| keyword | volume | mtf_rank | yakuten_rank | yakuten_url | priority | action |
|---|---|---|---|---|---|---|
| 色普龙 | **H** | 1-3 | ? | `/zh/medications/antiandrogens/cpa/` | P0 | ✅ drug schema + FAQPage 已注入 · 中文 slug 301 已开 · 下一步:单独博客《色普龙吃多少安全》《色普龙和螺内酯怎么选》 |
| 螺内酯 MTF | **H** | ? | ? | `/zh/medications/antiandrogens/spironolactone/` | P0 | ✅ drug+FAQ 已注入 · 正文补"螺内酯 MTF"长尾 h2 段落;增加和心内科高血压场景的语义隔离 |
| 补佳乐 | **H** | ? | ? | `/zh/medications/estrogens/oral/` | P0 | ✅ drug+FAQ 已注入 · 需竞争 gynecology 流量,增加"补佳乐 MTF 剂量"h2 + 内链到 compare 页 |
| 戊酸雌二醇 注射 | **M-H** | ? | ? | `/zh/medications/estrogens/injection/` | P0 | ✅ drug+FAQ 已注入 · 单独博客《戊酸雌二醇打几天一次》《戊酸雌二醇怎么抽》 |
| 醋酸环丙孕酮 | **M** | ? | ? | `/zh/medications/antiandrogens/cpa/` | P0 | 同 CPA 页;标题/description 加入"醋酸环丙孕酮"全名 |
| 爱斯妥 | **M** | ? | ? | `/zh/medications/estrogens/gel/` | P0 | description 显式提到"爱斯妥 Oestrogel" · 博客《爱斯妥一天几泵》 |

### 流程/安全 — 高意图检索

| keyword | volume | mtf_rank | yakuten_rank | yakuten_url | priority | action |
|---|---|---|---|---|---|---|
| MTF HRT 血检 | **H** | ? | ? | `/zh/blood-tests/` | P0 | ✅ FAQPage schema 已注入 · 新建博客《打针后多久查血》《血检异常怎么办》 |
| MTF HRT 怎么开始 | **H** | ? | ? | `/zh/before-you-start/` | P0 | 补"开始 HRT"/"第一次 HRT"长尾 · 站内链接到 compare 页 |
| DIY HRT 安全 | **M-H** | ? | ? | `/zh/china-reality/` | P0 | 敏感词风险下的高意图词;正文显式使用"DIY"术语 |
| HRT 风险 | **M** | ? | ? | `/zh/risks/` | P0 | ✅ FAQPage 已注入 · 每个风险单独博客长文 |
| CPA 脑膜瘤 | **M** | ? | ? | `/zh/medications/antiandrogens/cpa/` | P0 | 已在 FAQ 和主体覆盖 · **单独博客长文** 是大机会(EMA 警讯后新闻流量) |
| 剂量红线 HRT | **L-M** | ? | ? | `/zh/dose-limits/` | P0 | description 改成"HRT 剂量红线 / 上限" |

### 对比型 — mtf.wiki 空白,先发优势

| keyword | volume | mtf_rank | yakuten_rank | yakuten_url | priority | action |
|---|---|---|---|---|---|---|
| CPA vs 螺内酯 / 色普龙和螺内酯哪个好 | **M** | — | ? | `/zh/compare/cpa-vs-spironolactone/` | P0 | ✅ 新页已上线 · 在 CPA/螺内酯 主页内链此页 |
| 口服 vs 注射 雌二醇 | **M** | — | ? | `/zh/compare/oral-vs-injection/` | P0 | ✅ 新页已上线 · 从 oral/injection 两页双向内链 |
| 凝胶 vs 贴片 | **L-M** | — | ? | `/zh/compare/gel-vs-patch/` | P0 | ✅ 新页已上线 |

---

## 二、**P1 关键词**(本季度内行动)

### 药物长尾

| keyword | volume | yakuten 覆盖 | action |
|---|---|---|---|
| 色普龙 副作用 | **M** | 在 CPA 主页 | 独立博客长文 |
| 色普龙 停药 | **L-M** | 在 CPA 主页 | 博客《色普龙怎么停》 |
| 螺内酯 高钾 | **L-M** | 在螺内酯主页 | 博客《螺内酯高钾怎么办》 |
| 补佳乐 剂量 MTF | **M** | 部分 | description 补 · 博客 |
| 戊酸雌二醇 副作用 | **L-M** | 在 injection 页 | 博客 |
| 屈螺酮 MTF | **L** | 在 drospirenone 页 | 博客:黄体酮类选择 |
| 地屈孕酮 MTF | **L** | 在 dydrogesterone 页 | 博客同上 |
| 黄体酮 MTF | **M** | 在 progesterone 页 | description 强化 |
| GnRH 激动剂 MTF | **L** | 在 gnrh 页 | 保持现状 |

### 血检与监测

| keyword | volume | yakuten 覆盖 | action |
|---|---|---|---|
| HRT 肝功能 | **L-M** | 在 blood-tests | 独立章节 + 博客 |
| 雌二醇 目标值 | **M** | 在 blood-tests | FAQ 已答 · description 强化 |
| HRT 血栓 | **M** | 在 risks | 博客 |
| HRT 骨密度 | **L** | — | 博客补 |
| HRT 泌乳素 | **L-M** | 在 blood-tests | 独立小节 |

### 流程与场景

| keyword | volume | yakuten 覆盖 | action |
|---|---|---|---|
| 跨性别 激素 中国 | **M** | 在 china-reality | 加锚文本 |
| 跨性别 友好医院 | **M** | 在 tools/hospital-finder | description 强化 |
| HRT 打针 教程 | **M** | 在 guides/first-injection | 博客配图 |
| HRT 乳房发育 多久 | **M** | 在 breast-development | 已覆盖 · FAQ 化 |
| 抗雄 切换 | **L** | 在 guides/switch-antiandrogen | 博客 |
| HRT 多久见效 | **M** | 在 breast-development | 独立 FAQ 页 |

---

## 三、**P2 关键词**(博客长尾收口,每月 2-3 条)

- "打针当天能喝酒吗"
- "HRT 多久能停抗雄"
- "色普龙 孕激素 情绪"
- "雌二醇 片剂 和 注射 换算"
- "跨性别 DIY 买药被查了怎么办"(敏感,博客要谨慎语言)
- "HRT 吃错药会怎样"
- "14 岁 HRT 可以吗"(伦理高度敏感,引用 WPATH 青少年章节)
- "HRT 和避孕药区别"
- "停 HRT 多久恢复"
- "穿 bra 大小 HRT"
- "HRT 皮肤变化"
- "HRT 前后对比"

---

## 四、已上线的防御型关键词(保持监控,无需新动作)

- 跨性别 wiki / MTF wiki:必然被 mtf.wiki 占位,接受
- 跨性别:搜索面过宽,不值得竞争
- 跨性别 论坛 / 社区:非我们定位,放弃

---

## 五、月度回顾模板(复制粘贴)

### YYYY-MM 回顾

**本月发布**:
- [ ] 博客 N 篇: <列表>
- [ ] 新增/改写页面: <列表>
- [ ] 新增外链来源: <列表>

**排位变化**(Google Search Console 截图 + 手工 20 词抽样):
- 色普龙: 上月 #? → 本月 #?
- 螺内酯 MTF: ...
- 补佳乐: ...
- CPA 脑膜瘤: ...
- MTF HRT 血检: ...

**新发现的 mtf.wiki 占位词**:
- <关键词> — 计划响应 / 忽略

**下月 P0 选题**:
- <选题 1>
- <选题 2>

---

## 六、核心 KPI(滚动 12 个月)

| KPI | 目标(2027-04) | 当前 |
|---|---|---|
| Google 中文"色普龙"、"螺内酯 剂量"、"HRT 血检"排位 | **前 5** | 未知 |
| mtf.wiki 占位 top 50 词 · yakuten 覆盖率 | **≥ 80%** | ~60%(估计) |
| GSC 月均 impressions 同比 | **+200%** | 基线 |
| GSC zh-CN 平均 CTR | **≥ 4%** | 未知 |
| 新内容节奏 | 每周 ≥ 1 篇博客 或 1 个新页 | — |
| BylineCard 覆盖率 | **100%** 带 lastReviewed 的页 | ✅ 已自动注入(Footer override) |

---

## 七、自动化刷新(未来接 API 后启用)

### Google Search Console(免费,首推)

1. 站长身份验证域名(Vercel DNS 里加 TXT)
2. 导出 `Performance → Queries → 过滤 zh-CN → CSV`
3. 放到 `docs/data/gsc-YYYY-MM.csv`,运行下方脚本刷新本文件 volume/rank 列

### 占位脚本(待实现)

`scripts/refresh-keyword-gap.mjs`(未写,6 个月内随 GSC 接入后补):

```js
// 伪代码
// 1. 读 docs/data/gsc-{latest}.csv  (GSC 导出)
// 2. 读 docs/data/ahrefs-{latest}.csv(可选,Ahrefs API 导出)
// 3. 合并到本页的 keyword 表 · 刷新 volume / yakuten_rank / mtf_rank
// 4. 生成 docs/seo-trend-YYYY-MM.md 保留历史
```

### Ahrefs API(付费,Lite $99/月)

有 key 后在 `.env` 设:
```
AHREFS_API_TOKEN=xxx
```
脚本调用 `/v3/site-explorer/organic-keywords` 过滤 `target=mtf.wiki`,取 top 200 按搜索量。

### Baidu Index(免费但需浏览器 cookie)

短期内不计划接入,改用手工抽样 20 词打 SERP 截图对比。

---

## 八、当前覆盖度快照(2026-04-19,hrtyaku.com 已上线页)

- **药物详解页** 22 篇(zh) — 覆盖所有主流雌激素/抗雄/孕激素
- **对比页** 3 篇(zh) — 首批(CPA vs Spiro · 口服 vs 注射 · 凝胶 vs 贴片)
- **安全与流程** 6 篇(zh) — risks / dose-limits / blood-tests / china-reality / before-you-start / pathway
- **实操指南** 4 篇(zh) — first-injection / switch-antiandrogen / switch-e2-route + overview
- **E-E-A-T** 4 篇(zh) — about / methodology / medical-advisors / editorial-policy
- **工具** 8 个 — 血检自查 / 注射换算 / 剂量模拟 / 药物比较 / AI 问答 / 医疗资源 / 风险自评 / 速查卡片
- **博客** 11 篇(zh)

**schema 已就位**:Drug · FAQPage · MedicalGuideline · MedicalWebPage · BreadcrumbList · ScholarlyArticle · Organization · WebSite
**sitemap**:228 URL 带 `<lastmod>`(postbuild 自动注入)
**OG 图**:186 张 1200×630 PNG 每页独立生成
**中文 slug 301**:32 条(色普龙 / 螺内酯 / 补佳乐 / 戊酸雌二醇 等 → 英文规范 URL)

<!-- AUTO-SNAPSHOT:BEGIN -->

## AUTO SNAPSHOT — 2026-07-10 08:09 UTC

> 本节由 `npm run seo:refresh` 自动生成。上方手工表格保留不动。

### Google Trends(geo=CN, range 2025-04-19 → 2026-04-19)

tier 阈值: H ≥ 40 · M ≥ 10 (0-100 相对指数)

| 关键词 | 分类 | avg | peak | recent-4w | slope | tier | target |
|---|---|---|---|---|---|---|---|
| 黄体酮 | drug-generic | 13.4 | 100 | 2.3 | — | M | `/zh/medications/progestogens/progesterone/` |
| 地屈孕酮 | drug-generic | 6.8 | 100 | 0 | — | L | `/zh/medications/progestogens/dydrogesterone/` |
| 螺内酯 | drug-generic | 3.4 | 100 | 0 | — | L | `/zh/medications/antiandrogens/spironolactone/` |
| MTF HRT | protocol | 3.3 | 100 | 0 | — | L | `/zh/before-you-start/` |
| 色普龙 | drug-brand | 1.9 | 100 | 0 | — | L | `/zh/medications/antiandrogens/cpa/` |
| 补佳乐 | drug-brand | 1.9 | 100 | 25 | ↑ | L | `/zh/medications/estrogens/oral/` |
| 屈螺酮 | drug-generic | 1.9 | 100 | 0 | — | L | `/zh/medications/progestogens/drospirenone/` |
| estradiol half life | pharm-en | 1.9 | 100 | 25 | ↑ | L | `/en/medications/estrogens/oral/` |
| 色普龙 | drug-brand-variant | 0 | 0 | 0 | — | L | `/zh/medications/antiandrogens/cpa/` |
| 醋酸环丙孕酮 | drug-chemical | 0 | 0 | 0 | — | L | `/zh/medications/antiandrogens/cpa/` |
| 安体舒通 | drug-brand | 0 | 0 | 0 | — | L | `/zh/medications/antiandrogens/spironolactone/` |
| 戊酸雌二醇 | drug-generic | 0 | 0 | 0 | — | L | `/zh/medications/estrogens/injection/` |
| 爱斯妥 | drug-brand | 0 | 0 | 0 | — | L | `/zh/medications/estrogens/gel/` |
| 比卡鲁胺 | drug-generic | 0 | 0 | 0 | — | L | `/zh/medications/antiandrogens/bicalutamide/` |
| 跨性别激素 | protocol | 0 | 0 | 0 | — | L | `/zh/before-you-start/` |
| 跨性别 HRT | protocol | 0 | 0 | 0 | — | L | `/zh/before-you-start/` |
| DIY HRT | protocol-sensitive | 0 | 0 | 0 | — | L | `/zh/china-reality/` |
| HRT 血检 | monitoring | 0 | 0 | 0 | — | L | `/zh/blood-tests/` |
| HRT 风险 | safety | 0 | 0 | 0 | — | L | `/zh/risks/` |
| HRT 剂量 | monitoring | 0 | 0 | 0 | — | L | `/zh/dose-limits/` |
| HRT 乳房发育 | outcomes | 0 | 0 | 0 | — | L | `/zh/breast-development/` |
| CPA 脑膜瘤 | safety-longtail | 0 | 0 | 0 | — | L | `/zh/medications/antiandrogens/cpa/` |
| 螺内酯 高钾 | safety-longtail | 0 | 0 | 0 | — | L | `/zh/medications/antiandrogens/spironolactone/` |
| 雌二醇 血栓 | safety-longtail | 0 | 0 | 0 | — | L | `/zh/risks/` |
| 跨性别 友好医院 | access | 0 | 0 | 0 | — | L | `/zh/tools/hospital-finder/` |
| プロギノンデポー | drug-brand-ja | 0 | 0 | 0 | — | L | `/ja/medications/estrogens/injection/` |
| エストラジオール 個人輸入 | access-ja | 0 | 0 | 0 | — | L | `/ja/china-reality/` |
| MTF 血液検査 | monitoring-ja | 0 | 0 | 0 | — | L | `/ja/blood-tests/` |
| cyproterone acetate dose | drug-en | 0 | 0 | 0 | — | L | `/en/medications/antiandrogens/cpa/` |
| spironolactone transgender | drug-en | 0 | 0 | 0 | — | L | `/en/medications/antiandrogens/spironolactone/` |

### Google Search Console — top 40 queries (last 28 days)

tier 阈值: H ≥ 19 impressions (top 5%) · M ≥ 4 (top 25%)

| query | impressions | clicks | ctr | avg pos | tier | top landing page |
|---|---|---|---|---|---|---|
| progesterona micronizada | 589 | 2 | 0.34% | 5.51 | H | `/es/medications/progestogens/progesterone/` |
| 补佳乐 | 405 | 4 | 0.99% | 8.04 | H | `/zh/medications/estrogens/oral/` |
| プロギノンデポー | 258 | 1 | 0.39% | 9.74 | H | `/ja/medications/estrogens/injection/` |
| estradiol gel transdérmico portugal | 127 | 2 | 1.57% | 9.25 | H | `/pt/medications/estrogens/gel/` |
| микронизированный прогестерон | 97 | 1 | 1.03% | 10.25 | H | `/ru/medications/progestogens/progesterone/` |
| estradiol enanthate half life | 80 | 1 | 1.25% | 5.97 | H | `/en/medications/estrogens/injection/` |
| アンドロキュア | 78 | 2 | 2.56% | 8.60 | H | `/ja/medications/antiandrogens/cpa/` |
| 雌二醇凝胶 | 78 | 2 | 2.56% | 9.09 | H | `/zh/blog/estradiol-gel-how-to/` |
| lịch sử hrt | 78 | 0 | 0.00% | 40.45 | H | `/vi/pathway/` |
| estradiol enanthate | 72 | 3 | 4.17% | 9.82 | H | `/ru/medications/estrogens/enanthate/` |
| gnrh agonist | 54 | 0 | 0.00% | 46.33 | H | `/de/medications/antiandrogens/gnrh-agonists/` |
| 药娘用药指南 | 52 | 10 | 19.23% | 3.38 | H | `/zh/` |
| estradiol jel | 52 | 2 | 3.85% | 5.94 | H | `/tr/medications/estrogens/gel/` |
| ژل استرادیول | 52 | 1 | 1.92% | 4.13 | H | `/fa/medications/estrogens/gel/` |
| injectable estradiol calculator | 52 | 0 | 0.00% | 8.10 | H | `/en/medications/estrogens/injection/` |
| эстрадиол энантат | 49 | 4 | 8.16% | 2.41 | H | `/ru/medications/estrogens/enanthate/` |
| 乳房芽 | 49 | 3 | 6.12% | 7.02 | H | `/ja/breast-development/` |
| 補佳樂 | 43 | 1 | 2.33% | 7.21 | H | `/zh/blog/bujiale-how-to-take/` |
| agonistas de gnrh | 43 | 0 | 0.00% | 9.05 | H | `/es/medications/antiandrogens/gnrh-agonists/` |
| bicalutamide | 42 | 0 | 0.00% | 60.02 | H | `/de/medications/antiandrogens/bicalutamide/` |
| プロギノンデポー 個人輸入 | 40 | 8 | 20.00% | 4.28 | H | `/ja/medications/estrogens/injection/` |
| dutasteride คือ | 39 | 0 | 0.00% | 63.44 | H | `/fil/medications/five-alpha-reductase/dutasteride/` |
| estradiol injection calculator | 38 | 0 | 0.00% | 7.11 | H | `/en/medications/estrogens/injection/` |
| progynova是什么药 | 37 | 0 | 0.00% | 5.62 | H | `/zh/medications/estrogens/oral/` |
| antagonistas gnrh | 36 | 0 | 0.00% | 39.81 | H | `/es/medications/antiandrogens/gnrh-agonists/` |
| estrogen injection calculator | 36 | 0 | 0.00% | 8.47 | H | `/en/medications/estrogens/injection/` |
| spironolactone | 31 | 0 | 0.00% | 68.52 | H | `/de/medications/antiandrogens/spironolactone/` |
| ev injection | 30 | 1 | 3.33% | 4.93 | H | `/es/medications/estrogens/injection/` |
| プロギノバ 舌下 | 27 | 1 | 3.70% | 7.19 | H | `/ja/medications/estrogens/oral/` |
| estradiol injectable indication | 26 | 0 | 0.00% | 6.62 | H | `/fr/medications/estrogens/injection/` |
| estradiol sublingual | 25 | 0 | 0.00% | 6.84 | H | `/de/medications/estrogens/sublingual/` |
| estradiol valerate half life | 24 | 0 | 0.00% | 5.04 | H | `/en/medications/estrogens/injection/` |
| finasteride | 24 | 0 | 0.00% | 70.50 | H | `/ar/medications/five-alpha-reductase/finasteride/` |
| enantato de estradiol | 23 | 0 | 0.00% | 7.87 | H | `/es/medications/estrogens/enanthate/` |
| cpa medizin | 22 | 0 | 0.00% | 15.00 | H | `/de/medications/antiandrogens/cpa/` |
| dutasteride | 22 | 0 | 0.00% | 70.23 | H | `/id/medications/five-alpha-reductase/dutasteride/` |
| estradiol injectable posologie | 22 | 0 | 0.00% | 5.73 | H | `/fr/medications/estrogens/injection/` |
| hrt gel | 22 | 0 | 0.00% | 24.45 | H | `/de/medications/estrogens/gel/` |
| spironolacton | 22 | 0 | 0.00% | 70.23 | H | `/de/medications/antiandrogens/spironolactone/` |
| dydrogesterone tagalog | 21 | 1 | 4.76% | 9.71 | H | `/fil/medications/progestogens/dydrogesterone/` |

### Striking distance (rank 10-30, ≥20 impressions) — quick-win 改写目标

| query | position | impressions | clicks | landing page |
|---|---|---|---|---|
| микронизированный прогестерон | 10.25 | 97 | 1 | `/ru/medications/progestogens/progesterone/` |
| cpa medizin | 15.00 | 22 | 0 | `/de/medications/antiandrogens/cpa/` |
| hrt gel | 24.45 | 22 | 0 | `/de/medications/estrogens/gel/` |
| estradiol gel | 20.62 | 21 | 1 | `/pt/medications/estrogens/gel/` |
| patch oestrogene et baignade | 10.00 | 21 | 0 | `/fr/medications/estrogens/transdermal-patch/` |

<!-- AUTO-SNAPSHOT:END -->

