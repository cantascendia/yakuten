# SPEC v2.1：药物品牌索引 — 按 owner 参考稿重构视觉与信息架构

> 状态：实施中（分支 `feat/brand-library-v2`，在 v2 数据/组件基础上重构展示层）
> 决策：2026-09-08 owner 提供参考稿（浅色目录式布局），要求「按照这个图做」。v2 的「暗色药典图版」方向作废；数据 SSOT、校验、JSON-LD、测试契约不变。

## 0. 参考稿逐区描述（1440 宽，浅色）

整体：白底页面（`#FFFFFF`），内容区最大 1360，左栏 240 + 24 间距 + 主栏。无粒子、无玻璃、无切角；卡片一律白底、1px 浅灰粉边、12px 圆角、极浅投影。字体全部无衬线（Noto Sans SC），标题不用衬线。

1. **面包屑**（主栏顶部，13px 灰）：`首页 / 工具 / 品牌索引`。
2. **标题区**：H1「全球 HRT 药物品牌索引 / 与鉴别指南」两行，32px/700，深灰黑 `#1F1F23`；下一行 lede 15px 灰 `#5C5C66`：「从品牌、成分与地区出发，查找药品资料，核对不同包装版本。」
3. **右上角提示卡**（与标题同一行、靠右，宽 ~300）：浅粉底 `#F8E9EF`、圆角 12、内含文档图标 + 「先核对信息，再判断差异」14px/600 + 链接「查看核对指南 ↗」玫红。
4. **搜索条**：白底输入框 52px 高、1px 边、左放大镜图标、placeholder「搜索品牌名、通用名或厂商」；右侧连体玫红按钮「搜索」（100px 宽，`#A63A64` 底白字，右圆角）。下一行 13px 灰提示：「也可以从左侧按地区、类别与剂型筛选。」
5. **信息条**：浅粉底 `#FBEFF3`、圆角 8、左 ⓘ 图标，13px：「仅供药品信息核对，不提供购药渠道或个体化处方建议。」
6. **左侧筛选栏**（白卡、圆角 12、内边距 20、sticky）：标题「筛选条件」16px/600 + 右侧「重置」玫红 13px。四组复选框（多选）：
   - 上市地区：中国大陆 / 泰国 / 印度 / 日本 / 欧洲 / 北美 / 其他地区
   - 药物类别：雌激素 / 抗雄激素 / 孕激素 / 5α-还原酶抑制剂（GnRH 归入抗雄激素组显示为「GnRH 类」第 5 项）
   - 剂型：片剂 / 凝胶 / 贴片 / 注射剂 / 胶囊（映射：tablet→片剂；gel-pump/gel-sachet/spray→凝胶；patch→贴片；ampoule/vial/prefilled-syringe/powder-vial/implant→注射剂；capsule/softgel→胶囊；其余→不入组）
   - 参考资料：有包装参考（有实拍 image）/ 有说明书资料（有 links.leaflet 或 links.official）
   复选框 18px、圆角 4、勾选态玫红填充白勾；行高 30px；文字 14px。
   底部小卡（浅灰粉底 `#F5F0F3`）：对话图标 + 「没有找到对应品牌？」14px/600 + 「反馈缺失资料 →」玫红链接（指向 `/{locale}/about/`）。
7. **列表区标题行**：「品牌图鉴」18px/600 左；右侧「排序：品牌名称 ▾」（select：品牌名称 / 成分 / 地区）+ 网格/列表两个 36px 方形切换钮（激活玫红底白图标）。
8. **卡片网格**：3 列，gap 20。每卡：
   - 顶部图片区 4:3，浅灰粉渐变底（`#F3EDF1` → `#FAF7F9`），图片 `object-fit: contain` 留 12px 内边距；右上「包装示意」/「实拍」小标签（白底 80% + 1px 边，12px）。
   - 名称 18px/700（如「补佳乐 Progynova」）；下方类别胶囊（12px，雌激素 粉底 `#F6DCE6`/字 `#A63A64`；抗雄激素 蓝底 `#DDEAF6`/字 `#2F5F8F`；孕激素 绿底 `#DDF1E4`/字 `#2E7D4F`；5α 薄荷底 `#DDF3EE`/字 `#1F7A6B`；GnRH 紫底 `#E8E0F5`/字 `#5B3F9E`；禁用 红底 `#FBE3E3`/字 `#B3261E`）。
   - 四行键值（label 13px 灰 `#6B6B73` 宽 64px；value 13px `#222`）：有效成分 / 剂型 / 地区版本（多国用「 / 」连接，如「中国大陆 / 欧洲」）/ 规格资料（玫红链接「查看资料」→ 打开详情对话框的规格区）。
   - 页脚（上方 1px 分隔线）：左「查看详情 →」玫红 14px；右「⧉ 对比」14px（图标 + 文字），已选态玫红。
   - 选中对比的卡：1.5px 玫红描边（参考稿第 6 张卡）。
9. **底部核对提示条**（浅蓝灰底 `#EEF2F7`、圆角 12、内边距 20）：左侧文档图标 + 「看到相似包装，也要核对这些信息」15px/600 + 副标「包装外观不能单独证明药品真伪。」13px 灰；中间三项（图标 + 文字 13px）：核对成分与规格 · 确认地区与包装版本 · 查阅说明书与官方资料；右侧「阅读完整指南 →」玫红（指向 `/{locale}/medications/banned-drugs/` 之外更合适的鉴别指南页；本仓无独立鉴别指南页 → 指向 `/{locale}/guides/`，若不存在则 `/{locale}/about/`）。

## 1. 信息架构变更（相对 v2）

- **卡片 = 品牌族**：`brands[]` 按 `ingredientId + (name.intl ?? name.display 去括号)` 归并为一张卡；地区版本合并显示；规格取并集；图片取族内任一实拍，否则用包装示意图。详情对话框内提供「版本」切换（每个版本一个 tab/胶囊：如 中国大陆 · 德国 · 泰国 · 印度），切换后显示该版本的全部字段（沿用 v2 的 dl）。
- **筛选 = 多选复选框**（地区 / 类别 / 剂型 / 参考资料），各组内 OR、组间 AND；「重置」清空。
- **外观反查**保留但降级为搜索条下的一行小链接「按外观查找 ▾」，默认折叠，展开后是 v2 的三级 chip。
- **禁用/不适用**品牌族仍显示在网格末尾（排序时沉底），卡片图片区加斜纹遮罩 + 红色类别胶囊「不适用于 HRT」+ 原因一行；不再单独分区标题。
- **排序**：品牌名称（默认，按 display 拼音/字母：中文名按 en/intl 字母序即可）/ 成分（按图版号）/ 地区（按 region 顺序）。
- **列表视图**：语义 `<table>`，列：品牌 / 有效成分 / 剂型 / 地区版本 / 状态 / 操作。
- 图版头（成分角色、等效换算、依据文献）移入详情对话框顶部的「成分」小节（含依据文献链接），网格里不再出现。
- 页尾图例/来源/纠错：保留为一行紧凑说明（灰 13px），放在核对提示条下方。

## 2. 包装示意图（PackArt）

无实拍时不再只画一片药，而是生成**参考稿风格的包装示意**：`src/components/interactive/brand-library/PackArt.tsx`，纯 SVG，viewBox 0 0 400 300：
- 左后方一个药盒（正面朝前、微透视：正面 220×150 圆角 6，右侧面 24 宽、顶面 18 高，浅色描边 `#D9D0D6`）：正面顶部一条品牌色带（高 22，颜色由类别决定：雌激素粉 `#E7A9C1`、抗雄蓝 `#9FC1E0`、孕激素绿 `#A9D8B8`、5α 薄荷 `#9FD9CC`、GnRH 紫 `#C3B2E6`、禁用灰 `#CFCFCF`）；正面文字：`name.intl ?? display`（18px/700，最多 14 字符，超长缩字号），下一行 `strengths[0]`（13px），右上角小字 `manufacturer.parent ?? manufacturer.name.en` 首词（10px 灰）；文字用 `<text>`，字体 `var(--font-body)`，`text-anchor` 左对齐；**不模仿任何厂商 logo/商标图形**。
- 右前方按剂型放一个 Pictogram（复用 v2 的 `Pictogram`，size 150，片剂用 `shape/color/coating/score`）；片剂/胶囊类改画**泡罩板**：圆角矩形铝箔（`#E8E4EA`）上 2×5 个 pocket，每个 pocket 内一枚按 appearance 颜色的圆片（形状按 shape 简化为圆/椭圆/三角）。
- 整体放在浅灰粉渐变舞台上；右上角标签「包装示意」。`role="img"`，`<title>` = 「{name} 包装示意图（非实物）」。
- 有实拍的卡：显示实拍 + 标签「实拍」。

## 3. Token 与皮肤

- `.bl-root` 重定义 token（浅色为基准）：
  - `--bl-page #FFFFFF` · `--bl-surface #FFFFFF` · `--bl-surface-2 #F5F0F3` · `--bl-stage-a #F3EDF1` · `--bl-stage-b #FAF7F9` · `--bl-border #E9E3E8` · `--bl-hair #EFEAEE` · `--bl-ink #1F1F23` · `--bl-ink-2 #5C5C66` · `--bl-ink-3 #6B6B73` · `--bl-primary #A63A64` · `--bl-primary-bg #F8E9EF` · `--bl-info-bg #EEF2F7` · `--bl-radius 12px` · `--bl-shadow 0 2px 8px rgba(60,20,40,.06)`；类别胶囊 6 组底/字色见 §0-8。
  - 以上浅色值**必须**通过 `[data-theme='light']` 与默认（dark）两套映射：默认 dark 皮下把 page/surface 映射到 `--color-bg-primary/--color-bg-secondary`、ink 映射到 `--color-text-*`、border 到 `--color-outline-20`、primary 到 `--color-primary`，胶囊底色改为对应语义色 15% 透明。也就是说：**浅色 = 参考稿原样；暗色 = 同一版式换深色面**。
  - `html.sakura .bl-root`：surface 用 `--bg-3`、page `--bg-1`、border `--ink-faint`、primary `--sakura-pink-aa`、圆角 14；不加硬投影/胶带/印章（参考稿是干净目录，sakura 只换纸色）。
- 字体：标题/正文全部 `var(--font-body)`；数字/规格 `var(--font-ui-accent)`。
- 动效仅 transform/opacity + reduced-motion；卡片 hover：投影加深 + `translateY(-2px)`。

## 4. 不变项

数据 SSOT、`types.ts`、`search.ts` 过滤函数（新增多选与族归并可扩展）、`i18n.ts`（新增文案键）、`BrandLibrarySchema.astro`、`DrugBrandGallery.astro`、校验脚本、mdx 装配（`template: splash`）、既有 Playwright 断言（h1 含「品牌」；`input[type="search"]`；文本恰为「全部地区」的按钮 —— 在筛选栏顶部保留一个「全部地区」按钮作为「重置地区」快捷键即可；搜索「补佳乐」后 h3 数量 0<n<20；`tests/brand-library.spec.ts` 6 条按新 DOM 同步调整——反查 chip 需先展开「按外观查找」）。

## 5. 验收

- 1440 浅色截图与参考稿逐区对照：布局、间距、配色、字号无明显偏差；3 列卡片；卡片图片区有包装示意/实拍。
- 暗色、sakura、390 移动端各一张截图，无溢出。
- `npm run build`、`npx playwright test tests/brand-library.spec.ts tests/critical-paths.spec.ts` 全绿。
