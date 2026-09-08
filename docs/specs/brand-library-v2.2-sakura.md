# SPEC v2.2：品牌索引 — 用「新版」绯英典籍手账设计系统重做视觉

> 状态：实施中（分支 `feat/brand-library-v2`）。取代 v2.1 的白底玫红目录样式（owner：「按照新版的设计，不是这个老版本」）。
> 设计依据 = 站点「🌸 新版」皮肤的设计交接包 `C:\projects\yakuten-design\project\`：`ui_kits/yakuten/Primitives.jsx`（InkCard / SealStamp / WashiTape / Chip / PageHead / SectionKicker / WarningBox / EvidenceBadge / FoxTeacherMark / SpeechBubble / StickerLabel / Icon）、`layout.css`（.yk-page / .yk-pagehead / .yk-kicker / .yk-input / .yk-seal / .yk-hand-note）、`colors_and_type.css`（token + 字体 + 幻月夜）。站内已落地的同源 token 在 `src/styles/sakura-theme.css`（`html.sakura` 作用域）。
> 信息架构沿用 v2.1（owner 参考稿）：左侧筛选栏 / 大搜索条 / 品牌族卡片网格 / 详情对话框版本切换 / 底部核对提示条；数据、search.ts、i18n、JSON-LD、校验、测试契约不变。

## 0. 总则

- **这一页永远是手账皮**，不随 `html.sakura` 开关切换：`.bl-root` 自带完整 token 层（`--yk-*`，取值优先 `var(--ink, #4A2838)` 这类「站点变量 → 交接包字面值」回退），因此关掉「新版」也呈现同一设计；打开「新版」时与全站一致。
- 暗色（`[data-theme='dark']`）按「幻月夜书桌模型」：桌面（页面底）变梦境紫 `--night-1 #2E1F42`，**纸面（卡片、筛选栏、对话框）仍是亮纸、墨色不翻转**（`data-paper`）。
- 三条硬规则：墨色永远 `#4A2838`（禁纯黑）；禁 blur、禁 clip-path 切角；危险层脱离可爱风（禁用卡 = 红章 + 墨底/红描边，不用粉彩）。
- 字体：h1 `--font-display`（Fraunces + Noto Serif SC，weight 400）；卡片标题/小标题 `--font-heading`（Noto Serif SC 700）；正文 `--font-body`（Noto Sans SC）；数值/规格 `--font-hud`（JetBrains Mono）；手写注记 `--font-hand`（Ma Shan Zheng，`:lang(zh)`/`:lang(ja)` 才用，其他语言退 body 斜体）。字体已由 `sakura-theme.css` 顶部 @import 全站加载。
- 动效仅 transform/opacity（回弹曲线 `cubic-bezier(0.34,1.56,0.64,1)` .15s）+ reduced-motion 全关；全局 `:focus-visible` 3px `--sakura-pink-deep` 外环；按钮/复选框行 ≥44px 命中。

## 1. Token（`.bl-root` 内定义，全部带回退）

```
--yk-ink: var(--ink, #4A2838)            --yk-ink-soft: var(--ink-soft, #7A5568)   --yk-ink-faint: var(--ink-faint, rgba(74,40,56,.25))
--yk-fg-1: var(--fg-1, #4A2838)          --yk-fg-2: var(--fg-2, #7A5568)           --yk-fg-3: var(--fg-3, #86596F)
--yk-cream: var(--cream, #FFF5E0)        --yk-ivory: var(--ivory, #FFFAF0)         --yk-paper: var(--bg-3, #FFFFFF)     --yk-blush: var(--sakura-blush, #FFD4E0)
--yk-pink: var(--sakura-pink, #FFA8C5)   --yk-pink-deep: var(--sakura-pink-deep, #E5578B)
--yk-pink-text: var(--sakura-pink-text, #C02868)   --yk-pink-aa: var(--sakura-pink-aa, #C03070)
--yk-butter: var(--butter, #FFE89C) --yk-honey: var(--honey, #F5B347) --yk-mint: var(--mint, #A8E6C9) --yk-mint-deep: var(--mint-deep, #5AC89D)
--yk-sky: var(--sky, #A8D5F5) --yk-sky-deep: var(--sky-deep, #5BA8E0) --yk-lavender: var(--lavender, #D4C5F5) --yk-lavender-deep: var(--lavender-deep, #9B7DD4) --yk-grape: var(--grape, #7A5FB5)
--yk-coral: var(--coral, #FF8E7F) --yk-danger: var(--danger, #B5304F) --yk-danger-deep: var(--danger-deep, #C23D5C)
--yk-safe-text: #2C7A5B  --yk-info-text: #1D6A9E  --yk-caution-text: #8A5B00   （AA 印章/胶囊文字色，交接包无 AA 变体）
--yk-r-sm: 6px  --yk-r-md: 14px  --yk-r-lg: 22px
--yk-shadow: 4px 4px 0 var(--yk-ink)  --yk-shadow-lift: 6px 6px 0 var(--yk-ink)  --yk-shadow-sm: 2px 2px 0 var(--yk-ink)  --yk-shadow-flame: 4px 4px 0 var(--yk-pink-deep)
```
暗色：`[data-theme='dark'] .bl-root { --yk-desk: var(--night-1, #2E1F42); --yk-desk-fg: var(--cream,#FFF5E0) }`，桌面级文字（页头 lede、kicker、面包屑、页尾灰字）用 `--yk-desk-fg`/lavender `#B8A0D8`；所有 `[data-paper]` 面板内部保持亮纸墨字。

## 2. 组件配方（逐块）

### 2.1 InkCard（所有面板/卡片的底）
`background: var(--yk-paper)`（变体 paper=ivory / cream / pink=blush / gold=butter→honey 渐变 / lavender）；`border: 2px solid var(--yk-ink)`；`border-radius: var(--yk-r-md)`；`box-shadow: var(--yk-shadow)`；`padding: 20px`；hover 可抬升：`translate(-2px,-2px)` + `var(--yk-shadow-lift)`；带 `data-paper="true"`。

### 2.2 页头（线装书「卷」页头，复用 `.yk-pagehead` 配方，岛屿内自绘 DOM）
- 左：竖排卷标 `卷二・图鉴`（`writing-mode: vertical-rl`，Noto Serif 700 13px，letter-spacing .32em，`--yk-pink-deep` 字，ivory 底，2px 墨边，r4，padding 10px 6px；≤720 隐藏）。
- 中：SectionKicker（washi 胶带 60×22 `--yk-pink` dots 图案 rotate(-4deg) + 10.5px 字距 .13em 灰字「CODEX · 品牌索引」）；h1 `全球 HRT 药物品牌索引 · <span class="accent">鉴别指南</span>`（display 字体 400，clamp(40px,6vw,64px)，行高 1.05；accent 用 `--yk-pink-deep`）；lede 14px `--yk-fg-2` 最大 720。
- 右：InkCard variant pink 无抬升，宽 300：文档 Icon + 「先核对信息，再判断差异」heading 14/700 + 「查看核对指南 →」`--yk-pink-text` 700。
- 页头底：3px 墨线 + 右端红色线装结（12px 圆，`--yk-danger` 底 2px 墨边，`::after`）。
- 面包屑放页头上方：12px `--yk-fg-3`，分隔 `／`。

### 2.3 搜索条 + 提示 + 信息条
- 输入框 `.yk-input` 配方：cream 底、2px 墨边、r6、hud 字体 15px、高 52；focus：边 `--yk-pink-deep` + `2px 2px 0 var(--yk-pink-deep)`；左放大镜 Icon。
- 「搜索」按钮：`--yk-pink-aa` 底白字、2px 墨边、r6、`var(--yk-shadow-sm)`、Noto Sans 700 15px、宽 100、高 52；active `translate(2px,2px)` 投影归零。
- 提示行：手写体 `.yk-hand-note`（Ma Shan Zheng 17px `--yk-ink-soft`）：「也可以按地区、类别与剂型筛选～」；「按外观查找 ▾」同行右侧 `--yk-pink-text` 700 12px。
- 信息条：InkCard cream、无抬升、padding 12 18、13px：Icon info + 「仅供药品信息核对，不提供购药渠道或个体化处方建议。」

### 2.4 左侧筛选栏（InkCard paper，sticky，宽 240）
- 顶部：SectionKicker washi `--yk-mint` stripes「FILTER · 筛选条件」+ 右「重置」`--yk-pink-text` 700 12px。
- 每组：组名 `.yk-kicker` 风格（10.5px 字距 .13em `--yk-fg-3` 700，无胶带）+ 复选框列表。复选框：18×18、2px 墨边、r4、ivory 底；checked = `--yk-pink-aa` 底 + 白色勾（自绘 `appearance:none` + `::after` 勾），focus-visible 粉环；行高 32，label 14px `--yk-fg-1`。「全部地区」保留为一枚 Chip（2px `--yk-pink-deep` 边、ivory 底、pressed 时 filled）。
- 底部：SpeechBubble（ivory 底 2px 墨边 r14 带左下小尾巴）+ FoxTeacherMark 36px（交接包 Primitives.jsx 里的原创 SVG，蜜金 `--yk-honey` + 眼镜）：「没有找到对应品牌？」14/700 + 「反馈缺失资料 →」。
- ≤900：折叠为一枚 InkCard 风按钮「筛选 (n)」展开抽屉（同 v2.1）。

### 2.5 列表头
SectionKicker washi `--yk-pink` dots「CODEX · 品牌图鉴 · 111 个品牌 · 141 个版本」；右侧「排序」label（ui-accent 12px 700）+ select（`.yk-input` 配方，高 40）+ 视图切换两枚 40×40 方钮（2px 墨边 r6，激活 `--yk-pink-aa` 底白图标 + `2px 2px 0 ink`）。

### 2.6 品牌族卡片（InkCard paper，padding 0，overflow hidden）
- 图片区 4:3：cream 底 + 漫画网点纹（`radial-gradient(circle at 4px 4px, rgba(74,40,56,.12) 1px, transparent 1.5px) 0 0/10px 10px`），底部 2px 墨线；实拍 `contain` 留 12px 内距；包装示意（`PackArt`，保留 v2.1 但描边改 `--yk-ink` 2px、盒面色带用类别色、泡罩铝箔 `--yk-ivory`）。右上 StickerLabel 风角标：ivory 底 2px 墨边 r6 rotate(6deg) `2px 2px 0 ink` 11px 700：「实拍」/「包装示意」。
- 正文 padding 18：标题 `--font-heading` 19/700 行高 1.3；类别 Chip（2px 类别色边 + 类别色字 + ivory 底：雌激素 `--yk-pink-deep` / 抗雄激素 `--yk-honey`（字用 `--yk-caution-text`）/ 孕激素 `--yk-lavender-deep` / 5α `--yk-sky-deep`（字 `--yk-info-text`）/ GnRH `--yk-grape` / 禁用 `--yk-danger`）。
- 四行键值（同 v2.1）：label `.yk-meta-label` 12px `--yk-fg-3` 宽 64；value 13px `--yk-fg-1`；规格数值 hud 字体；「查看资料」`--yk-pink-text` 700。
- 页脚：1.5px 点线分隔（`border-top: 1.5px dotted var(--yk-ink-faint)`）；左「查看详情 →」`--yk-pink-text` 700 14px；右「对比」Chip 风开关（未选：ivory 底 2px `--yk-ink-faint` 边；已选：`--yk-pink-aa` 底白字 + ✓）。
- 选中态卡：`box-shadow: var(--yk-shadow-flame)` + 边 `--yk-pink-deep`。
- 禁用族卡：图片区加 45° 红斜纹 washi 遮罩（`repeating-linear-gradient(45deg, rgba(181,48,79,.18) 0 6px, transparent 6px 12px)`），右上 SealStamp `--yk-danger` rotate(-5deg)「不适用于 HRT」，正文底部一条墨底红边小条（DangerBox 微型：`background: var(--yk-ink); border: 2px solid var(--yk-danger); color: #fff; r8; 12px 700`）写原因；无粉彩。

### 2.7 底部核对提示条
WarningBox 配方：InkCard gold（`linear-gradient(135deg, var(--yk-butter), var(--yk-honey))`）无抬升 padding 16 20：Icon alert 22 + 标题 `--font-heading` 15/700「看到相似包装，也要核对这些信息」+ 副标 13「包装外观不能单独证明药品真伪。」；三项 ✓ 13px；右「阅读完整指南 →」`--yk-ink` 700 下划线。
页尾声明：InkCard cream 无抬升 12px `--yk-fg-2`：「声明 · 本站不提供处方、不销售药物、不收集个人信息…」+ 数据最近核对日期 + 纠错入口。

### 2.8 详情 / 对比对话框
MangaPanel 风：`--yk-paper` 底、2.5px 墨边、r14、`8px 8px 0 var(--yk-ink)`、宽 min(60rem, 94vw)；顶栏 SectionKicker「PLATE №NN · 成分名」+ 标题 heading 24/700 + 关闭钮（36 方、2px 墨边）；版本切换 = Chip 行（激活 filled）；状态 SealStamp；dl 标签列 `.yk-meta-label`；「依据文献」链接 `--yk-pink-text` 带外链 Icon；「加入对比」按钮 = 搜索按钮同配方。对比表：表头 `--yk-blush` 底、行间点线。

### 2.9 外观反查（折叠区）
展开后 InkCard cream：三行 chip；chip = Chip 配方（未选 ivory 底 2px ink-faint 边；已选 `--yk-pink-aa` 底白字）；剂型 chip 内嵌 24px Pictogram；颜色 chip 圆色块 14px 带 1.5px 墨边。

## 3. 移动端（≤720）
卷标隐藏；h1 clamp 下限 32px；搜索按钮整行；筛选栏折叠；卡片单列，图片区 16:9；对话框全屏（r0，无投影）；底部对比托盘 InkCard 风（墨边 + 上投影）。

## 4. 验收
- 1440 浅色 / 1440 暗色（幻月夜：桌面紫、卡片亮纸）/ 390 各截图；`html.sakura` 开与关两态截图应几乎一致（仅站点 header 不同）。
- 无横向溢出；3 列卡顶对齐；`npm run build` + `tests/brand-library.spec.ts` + `tests/critical-paths.spec.ts` 全绿。
