# SPEC: 药物图鉴 v2 — 全球 HRT 药物品牌索引与鉴别指南 重做

> 状态：**已实现，待合并**（分支 `feat/brand-library-v2`）。**§5 视觉层已被 `brand-library-v2.1-visual.md` 取代**（owner 参考稿：浅色目录式布局、品牌族卡片、包装示意图）；§3/§4/§6-§9 的数据、契约与红线仍有效。
> 决策：2026-09-08 owner 要求「真正做好这个页面，大规模翻新甚至重做；不能是 AI 默认设计；直观全面的库，越全越详细越好，图片要有」。
> 页面：`/zh/tools/brand-index/`（17 语同构）。当前实现 `src/components/interactive/DrugBrandIndex.tsx`（58 条扁平卡片，11 张实拍图）。

## 0. 一句话

把「品牌卡片墙」重做成**药典式鉴别图版系统（药物图鉴）**：按成分分图版、按外观反查、单条详情对照、品牌横向对比、禁用药隔离区；数据模型从 58 条扩展为分层结构（成分 → 品牌 → 规格/外观/鉴别要点/监管/图像来源），图像层采用「实拍 + 数据驱动剂型示意图」双轨并明确标注来源。

## 1. 用户与任务（产品层）

| 用户 | 场景 | 页面要回答的问题 |
|---|---|---|
| 中国大陆 DIY 使用者（主体） | 从代购/药房拿到药，包装是外文或印度版 | 这是什么药？和补佳乐等效吗？蓝色三角片是 Estrofem 吗？ |
| 同上 | 想换更便宜/更易得的品牌 | 同成分还有哪些品牌？规格怎么换算？哪些是灰色渠道？ |
| 同上 | 被推荐了达英-35 / 倍美力 / 优思明 | 为什么不适用于 HRT？ |
| 友好医生 / 社区组织 | 帮来访者核对药物 | 批准文号、厂商、上市地区、说明书链接 |
| 日/韩/英语圈（次要） | 同上 | UI 四语；数据 zh 为主，en/ja/ko 字段可选回退 |

**非目标**（Constitution 红线）：不提供购买链接、不推荐药商、不标价格、不做个人化剂量建议；零存储（无 localStorage / 无 URL 状态持久化）。

## 2. 现状问题（八维摘要）

- 功能完整性：58 条 / 20 成分；缺刻痕/压印/包装特征/批准文号/鉴别要点；同一品牌多国版本平铺无归组；`estradiol-injection` 无详情页映射（`drugLinks.ts` 键名不一致 → 注射类品牌全部丢链接）。
- UX：无按外观反查；无详情/对比；筛选仅地区+类别；emoji 国旗在 Windows Chrome 上不渲染（只显示字母）；卡片视觉同质化不可扫读。
- 设计：通用 AI 卡片网格，与「二相乐园」/「绯英手账」两套皮肤都只是贴 token。
- 图像：`public/images/drugs/*-studio.webp` 是 AI 重绘，**Progynova 蓝色糖衣片被画成橙色**——鉴别页使用即误导，禁止采用；仅 `public/brands/*.webp` 11 张实拍可用。

## 3. 信息架构

```
页头（Starlight h1，含「品牌」二字）+ lede + <ToolDisclaimer privacy="no-storage" />
├─ 命令栏（sticky）：搜索（品牌/成分/厂商/别名/压印）· 视图切换（图版 | 列表）· 计数「显示 N / 总数 · M 种成分」
├─ 外观反查条「我手里有一片…」：剂型 → 颜色 → 形状（三级 chip，实时收窄）
├─ 左侧筛选栏（≥1080 sticky 240px；<1080 折叠为顶部横向 chip）
│    分类 → 成分列表（带计数）· 地区 · 监管状态
└─ 主栏：图版（每成分一图版）
     图版头：图版 № · 成分中/英/INN · 酯 · 角色一句话 · 等效换算一句话 · 品牌数/地区数 · 「药物详情 →」
     标本卡 ×N（见 §5.3）
     ...
   禁用/不适用图版（页尾，视觉隔离，写明原因）
   页尾说明：状态图例 · 数据来源与最近核对 · 「不提供购买链接」· 纠错入口（/zh/about/）
弹层：详情对话框（<dialog>）· 对比对话框（≤3 条并排）
底部对比托盘（选中 ≥1 时出现）
```

页面用 Starlight `template: splash`（去侧栏/TOC，舞台宽 1280），沿用站点 header/footer；h1 由 frontmatter title 渲染（含「品牌」）。

## 4. 数据模型（SSOT：`src/data/brand-library.json`，类型：`src/components/interactive/brand-library/types.ts`）

分层：`ingredients[]`（成分/图版）与 `brands[]`（标本）。旧文件 `src/data/drug-brands.json` 保留为只读遗留（`DrugBrandGallery.astro` 改为经适配器读新文件后可删除）。`drug-brands.ja.json` 按索引对齐的译文迁移到新条目的 `notes.ja` / `name.ja` 等字段（迁移脚本 `scripts/migrate-brand-overlays.mjs`，一次性）。de/es/fr/pt/ru overlay 在 src/scripts 内零消费者 → 同法迁入后删除。

关键字段（完整见 types.ts）：

- Ingredient：`id` · `plate`(图版号) · `category` · `drugIds[]`(→ drugs.json) · `name{zh,en,inn}` · `ester` · `role{zh,en}` · `equivalence{zh,en}`(仅换算事实，不含剂量建议) · `hrtUse: 'standard'|'situational'|'cautioned'|'banned'` · `references[]`(references.json id；cautioned/banned 的 reason 必须有，UI 紧邻渲染「依据文献」链接)
- Brand：`id` · `ingredientId` · `drugId` · `name{display,local,intl,aliases[],en,ja,ko}` · `manufacturer{name,parent,country}` · `market{country,countryName{zh,en,ja,ko},region}` · `status` · `form` · `strengths[]` · `pack` · `appearance{shape,color(hex),colorName{zh,en},coating,score,imprint,description{zh,en,ja,ko}}` · `packaging{zh,en}` · `identification{zh[],en[]}`(鉴别要点) · `notes{zh,en,ja,ko}` · `image{src,kind:'photo'|'schematic',credit,alt{zh,en}}` · `links{official,leaflet,regulator}` · `regulatory{authority,code}` · `confidence:'verified'|'reported'|'unverified'` · `lastVerified`
- 状态枚举：`prescription`(处方) · `otc`(非处方) · `approved`(该国已批准，处方状态未细分) · `grey`(灰色渠道流通) · `discontinued`(停产) · `banned`(不适用于 HRT) · `cautioned`(慎用)
- 剂型枚举（驱动示意图）：`tablet` `capsule` `softgel` `patch` `gel-pump` `gel-sachet` `spray` `ampoule` `vial` `prefilled-syringe` `implant` `nasal-spray` `pessary` `powder-vial`
- 地区枚举：`cn` `tw-hk` `jp` `kr` `sea` `in` `eu` `na` `oceania` `latam` `other`

**数据纪律**：
1. 品牌/厂商/规格/外观是事实型产品信息（evidenceLevel X），**不写剂量建议**；等效换算只写化学事实（如「2 mg 戊酸雌二醇 ≈ 1.53 mg 雌二醇」）。**不写价格/价格比较、不写代购/转售/「可购」等获取渠道措辞**（可写「中文圈使用者常遇到的版本」这类识别性描述）；成分级医学结论（reason/role 中的风险陈述）必须配 `references[]`。
2. 不确定的外观细节**留空**而非猜测；`confidence` 如实标注；`unverified` 条目在 UI 上显示「待核实」角标。
3. 图像：`kind:'photo'` 必须是站方实拍或获授权；**禁止使用 AI 重绘的「studio」图**；无实拍 → 由 `appearance` 数据渲染示意图并标「示意」。外链图（如 Abbott 官网）允许但必须 `onError` 回退示意图。
4. 校验脚本 `scripts/validate-brand-library.mjs`：枚举合法、`ingredientId`/`drugId` 引用存在、`image.src` 本地文件存在、`color` 为 hex、每成分 ≥1 品牌、`id` 唯一；纳入 `npm run check` 与 `build` 前置。

## 5. 视觉与交互（设计层）

### 5.1 概念：药典鉴别图版（Pharmacopoeia plate）

每个成分是一张「图版 №」，品牌是图版上的「标本」；图版头像植物图鉴的图注（编号、学名、俗名、酯、角色）；标本卡的舞台区永远是**同一构图**（实拍居中或示意图居中），让眼睛一眼扫过去比较颜色/形状。状态用「印章」而非彩色胶囊。

两套皮肤都必须一等公民（组件自带 `.bl-root` 作用域 token 层，映射站点变量；`html.sakura .bl-root` 覆盖）：

| Token（.bl-root） | 默认皮（二相乐园，dark；light 由站点变量自动切换） | 樱粉手账（html.sakura；night 由 data-paper 锁亮） |
|---|---|---|
| `--bl-surface` | `var(--glass-bg)` + `backdrop-filter: var(--glass-blur)` | `var(--bg-3)` 纸白，无 blur |
| `--bl-stage` | `var(--glass-bg-40)` | `var(--bg-2)` 象牙 |
| `--bl-border` | `1px solid var(--color-outline-20)` | `2px solid var(--ink)` |
| `--bl-radius` | `0`（切角 `clip-path: var(--clip-corner-sm)`） | `14px`（禁 clip-path） |
| `--bl-shadow-hover` | `0 8px 24px rgba(0,0,0,.35)` | `4px 4px 0 var(--ink)` → hover `6px 6px 0` |
| `--bl-ink` / `--bl-ink-2` / `--bl-ink-3` | `--color-text-primary/secondary/muted` | `--fg-1/--fg-2/--fg-3` |
| `--bl-accent` | `--color-accent`（幻月金） | `--sakura-pink-text` |
| `--bl-primary` | `--color-primary` | `--sakura-pink-aa`（白字底） |
| `--bl-display` | `--font-display` Noto Serif SC | Fraunces + Noto Serif SC |
| `--bl-num` | `--font-ui-accent` Space Grotesk | Chivo Mono（数值/图版号） |
| 印章 | 玻璃徽章：1px 语义色描边 + 15% 底 + 语义色字 | SealStamp：2.5px 语义色描边、透明底、`rotate(-5deg)`、Noto Serif 700、`letter-spacing:.16em` |
| 图版头 kicker | 幻月金 mono 小字 `letter-spacing:.15em` uppercase | washi 胶带条（复用 `.yk-washi` 配方：45° 粉白斜纹） |
| 「示意」角标 | mono 小字 | 手写体 Ma Shan Zheng（非 CJK 语言回退 ui-accent 斜体） |

语义色：processing 用站点变量：safe=处方/已批准（绿）、info=OTC（蓝）、caution=灰色/慎用（黄/橙）、muted=停产、danger=禁用（红）。**禁用不用粉/可爱风**：卡片舞台加 45° 细斜纹遮罩 + 红印章「不适用于 HRT」+ 一行原因；夜/暗模式同样。

国家标识：**不用 emoji 国旗**（Windows 不渲染）。用等宽两字母代码 monogram 标签（`DE`）+ 国名文本。

图标：全部 inline SVG（stroke 1.5–2，24 网格），禁 emoji。

### 5.2 命令栏 / 反查条

- 搜索框高 52px，前置放大镜 SVG，右侧 `kbd` 提示「/」（聚焦快捷键）；`aria-label` 四语；结果计数 `aria-live="polite"`。
- 搜索字段：`name.*`、`aliases`、`manufacturer.name`、`ingredient.name.*`、`appearance.imprint`、`market.countryName.*`、`notes.zh`。中文按包含匹配；英文不区分大小写。
- 反查条三级 chip：剂型（含小示意图标）→ 颜色（圆形色块 + 文本标签，`aria-pressed`）→ 形状。任一层选择即时过滤；「清除」按钮；移动端横向滚动，chip ≥44px 高。
- 视图切换：图版（默认）| 列表（紧凑表格：舞台缩略 40px、名称、成分、规格、厂商/国、状态；用 `<table>` 语义，移动端横向滚动容器）。

### 5.3 标本卡（Specimen card）

```
┌─────────────────────────────┐
│ 舞台 4:3（实拍 contain / 示意图）│  右上：状态印章；左下：「示意」或「实拍」角标
├─────────────────────────────┤
│ 品牌显示名（display 1.125rem） │
│ 成分 · 规格（num 字体，ink-2） │
│ [DE] 德国 · 拜耳    剂型chip   │
│ 备注一行（ink-3，2 行截断）     │
│ [详情]           [☐ 对比]     │
└─────────────────────────────┘
```

- 卡片是 `<article>`，标题是 `<h3>`（Playwright 依赖 h3 计数）。
- hover：默认皮 `translateY(-2px)` + 阴影；樱粉 `translate(-2px,-2px)` + 硬投影 6px；仅 transform/opacity；`prefers-reduced-motion` 全关。
- 「待核实」（confidence≠verified）：角标小字，不用红色。
- 图片 `loading="lazy" decoding="async"`，`onError` → 示意图。

### 5.4 详情对话框

原生 `<dialog>`，`aria-labelledby` 标题；ESC/遮罩关闭；关闭后焦点回到触发按钮。两栏（<720 单栏）：
- 左：大舞台（实拍或示意图 240px 高）+ 来源行（「实拍 · 站方拍摄」/「示意图 · 依据外观描述绘制，非实物」/「图片来自 厂商官网」）。
- 右：`<dl>` 网格：成分/酯 · 规格 · 包装 · 外观（形状·颜色·包衣·刻痕·压印）· 包装特征 · 厂商 · 上市地区 · 监管状态（批准文号，NMPA 可点「去药监局查询」→ `https://www.nmpa.gov.cn/datasearch/`）· 鉴别要点（ul）· 备注 · 数据可信度 · 最近核对。
- 「同成分其他品牌」横向卡列（点击切换详情）；链接行：药物详情 · 官网 · 说明书；「加入对比」。

### 5.5 对比

底部 sticky 托盘（选中 ≥1）：已选 chip（可移除）+「对比 (n)」+「清空」。对比对话框：`<table>` 行=字段，列=品牌（≤3），差异行高亮（同成分不同酯/规格）。

### 5.6 空状态 / 无结果

无结果：舞台风格空图版 + 「未找到匹配的品牌」+ 「清除筛选」按钮 + 提示「试试搜索成分名，如 雌二醇」。

### 5.7 响应式

≥1080：筛选栏 240 + 主栏；卡网格 `repeat(auto-fill, minmax(260px,1fr))`。720–1079：筛选栏折叠为顶部 chip 行（「筛选 (n)」按钮展开抽屉）。<720：单列，卡片舞台 16:9，命令栏搜索独占一行，对比托盘全宽。

## 6. 组件架构

```
src/components/interactive/brand-library/
├── types.ts            # 数据类型 SSOT（本 spec §4）
├── BrandLibrary.tsx    # React island 入口（client:visible）props: { locale?: 'zh'|'en'|'ja'|'ko' }
├── Pictogram.tsx       # 剂型示意图（纯 SVG，props 契约见下）
├── pictogram-shapes.ts # 形状路径数据
├── i18n.ts             # UI 文案 zh/en/ja/ko（其余语言回退 en）
├── search.ts           # 过滤/搜索纯函数（可单测）
├── brand-library.css   # 作用域样式（.bl-root），含 html.sakura 覆盖与 reduced-motion
└── BrandLibrarySchema.astro (放 src/components/ui/)  # JSON-LD ItemList<Drug>（REVIEW-BACKLOG P2-SEO-1）
```

Pictogram 契约：
```ts
export interface PictogramProps {
  form: BrandForm; shape?: TabletShape; color?: string; secondaryColor?: string;
  coating?: 'sugar'|'film'|'none'; score?: 'none'|'single'|'cross'; size?: number; // 默认 120 宽
  title?: string; className?: string;
}
```
输出 `viewBox="0 0 120 90"` 的 inline SVG；描边用 `currentColor`（由父级 `--bl-ink` 决定），填充用 `color`（片剂/胶囊主体色）；透明/凝胶类用 `secondaryColor` 或半透明；每种剂型一个稳定构图；`role="img"` + `<title>`。

页面装配（每语言 mdx）：
```mdx
---
title: …（含「品牌」）
template: splash
tableOfContents: false
---
import BrandLibrary from '../../../../components/interactive/brand-library/BrandLibrary';
import BrandLibrarySchema from '../../../../components/ui/BrandLibrarySchema.astro';
import ToolDisclaimer from '../../../../components/ui/ToolDisclaimer.astro';
<ToolDisclaimer privacy="no-storage" />
<BrandLibrarySchema />
<BrandLibrary client:visible locale="zh" />
```

`DrugBrandGallery.astro`（药物详情页内的「品牌图鉴」）改读 `brand-library.json`（按 `drugId` 取该成分品牌），沿用现有 DOM/class 与「查看全部品牌索引 →」链接（测试依赖）。

`drugLinks.ts`：补 `'estradiol-injection': 'medications/estrogens/injection'`，并补 `gnrh-antagonist`/`flutamide`/`norethisterone`/`mpa` 映射（页面已存在）。

## 7. i18n / a11y / 性能

- UI 文案 zh/en/ja/ko 内置；数据字段回退链 `locale → en → zh`，回退时元素加 `lang="zh"`。
- 全部交互控件 ≥44px 命中；`:focus-visible` 3px 环；chip `aria-pressed`；dialog 焦点圈；表格语义；对比度 AA（樱粉粉字用 `--sakura-pink-text`，白字粉底用 `--sakura-pink-aa`）。
- 零第三方依赖；数据 JSON 随 island 打包（≈150 条 < 120 KB gz 前）；图片 lazy；首屏无布局抖动（舞台固定比例）。
- 动效仅 transform/opacity + reduced-motion。

## 8. 测试

- 保留 `tests/critical-paths.spec.ts` 现有断言：h1 含「品牌」、`input[type="search"]` 可见、按钮「全部地区」可见、搜索「补佳乐」后 h3 数量 0<n<20；`/zh/medications/estrogens/oral/` 有「品牌图鉴」与 `a[href*="brand-index"]`。
- 新增：反查条选「片剂」+「蓝色」结果 > 0 且全部为片剂；打开详情对话框可见并 ESC 关闭；对比选择 2 条出现对比表；禁用图版存在且卡片有「不适用」印章；`html.sakura` 下页面渲染无错误（class 切换后截图）；列表视图 `table` 存在。
- 数据校验脚本纳入 `npm run check`。

## 9. 红线复核

- Constitution：无购买链接/药商推荐/价格；零存储；免责声明（ToolDisclaimer）保留；禁用药警示不减弱；无个人化剂量。
- 设计：颜色全走变量；动效 transform/opacity；应急/危险层脱离可爱风。
- Test-Lock：仅新增测试，不改既有断言。
