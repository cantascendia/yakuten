# SPEC: sakura 全站换皮 — 升级到 v2 完整手账观感

> 状态：**待开工**（本 spec 随 PR #126 合入，作为下一个换皮 PR 的工程依据）
> 决策记录：owner 2026-07-23 拍板 —— 换皮做**完整版**（CSS 深化 + 四结构件 override）；PR #126 先合入作地基，换皮另开 PR。
> 解剖依据：4-agent 工作流 `wf_eca6839f-434`（旧皮解剖 / v2 视觉手册 / 挂载风险 / 完整性复核，计 425k tokens）。

## 1. 目标

把 🌸 新版（`html.sakura` 全站皮肤，17 语共 934 页：7 语各 62 页、10 语各 50 页）从当前的「半成品」（粉 token + 硬阴影卡片，无手账灵魂件）升级为 PR #126 交付的 **v2 完整手账观感**（画卷拼贴、胶带 kicker、线装页头、网点纸背景、手账页脚）。

**本工程不改任何本地化内容** —— 纯视觉层（CSS + 双态模板结构），不新增、不修改、不删除任何语言的正文，因此不触发 Constitution 的多语内容同步义务。

## 2. 现状关键事实（解剖结论）

1. **token 已同源**：旧皮与 v2 调色板/字体 12/12 相同（#FFA8C5 / #FFF5E0 / #4A2838…）。`sakura-skin.css` 本就是 v2 layout.css 的加前缀副本。
2. **灵魂件零消费者**：胶带/印章/线装页头/手写注记的 `.yk-*` class 在 Starlight 侧 DOM **无任何元素使用** —— CSS 在，DOM 不在。这是「线上 sakura 看起来不如 v2 预览」的根因。
3. 三文件分工（注意文件名与内容相反）：`sakura-theme.css`=token 层；`sakura-components.css`=前段自定义组件贴皮 + 后段 Starlight DOM 改造（L329 分界）；`sakura-skin.css`=`.yk-*` 布局骨架。
4. 四象限：sakura开/关 × light/dark 都是被设计的路径（sakura+dark=「夜晚书桌」梦境紫 + data-paper 纸面锁亮）。
5. 挂载：三 CSS 经 `astro.config.mjs:55-58` customCss 全站无条件打包（~76.4KB 未压缩，含未开 sakura 的用户）。

## 3. 工程分层

### ① CSS 深化层（低风险，纯 CSS）

| 工作项 | 说明 |
|---|---|
| 背景纸纹 | body 22px 方格 + 漫画网点 + 8 枚确定性樱瓣（i*137%100，禁 Math.random）；dark 换月光色 |
| 排版对齐 | h1-h6/p/链接荧光笔/表格腮红头+虚线行/blockquote/hr 点线 → 对齐 v2 精确值 |
| aside/卡片对齐 | InkCard 公式（2px ink + r14 + 4px 4px 0）已一致，微调 hover 位移/回弹曲线 |
| Pagefind 重写 | 旧皮 85 行搜索样式（components.css L803-888）按 v2 DNA 重写为独立小节 |
| **博客覆盖** | `blog.css` 30+ `.blog-*` 类零 sakura 分支（当前壳粉内容米哈游混搭）——全量补 |
| **h2 汉字序号修复** | `@counter-style yk-zhang`（壹貳叁）现加在全部 17 语 → 限定 `:lang(zh)`（或 CJK 三语）；`system: fixed` 只到 15，第 16 个 h2 掉号 → 补 range 或换 additive |
| **RTL 修复** | ar/fa 零处理；物理方向属性（text-align:left / margin-left）改逻辑属性（text-align:start / margin-inline-start）；旋转贴纸/胶带在 RTL 镜像方向复核 |
| 手写体回退 | `:lang` 覆盖只有 ja/en/ko，其余 12 语回退到 Ma Shan Zheng 会缺字 → 非 CJK 语言手写注记降级为 ui-accent 斜体 |
| 移动菜单 | `starlight-menu-button` 在 sidebar 内非 header 内（旧皮规则打不到）；`.mobile-preferences` 全 styles 零命中 → 两处补皮 |

### ② 结构层（观感跃迁，Starlight override + sakura 条件分支）

| 结构件 | 现状 | 目标 | 机制 |
|---|---|---|---|
| 首页 hero | HeroSection 换 token 变粉 | v2 HomeScreen 式画卷拼贴 | HeroSection.astro 内**同时 SSR 两态所需结构**，`html.sakura` 作用域 CSS 切换显隐 |
| 页面头 | 普通 h1 | 线装页头（竖排标签+装订线+胶带 kicker） | override `PageTitle.astro`：单一共享 DOM + 装饰元素常驻输出，非 sakura 下 `display:none` |
| 导航 | Starlight header 改色 | 手账导航（品牌副标+胶囊 tab） | 现有 Header 加 sakura 态深化；**不引入** v2 的月相钮（明暗归 Starlight 三态 select，避免三套主题机制打架——见 §5-4） |
| 页脚 | Starlight 默认 | 四栏手账页脚 | override `Footer.astro`：同上，双态结构常驻 + CSS 切换 |

> **机制裁决（codex P2 实证）**：`html.sakura` 是**客户端** class（localStorage 驱动），Astro 静态构建期**无法**据它条件渲染 —— 所以 override 统一采用「**双态结构常驻 SSR + `html.sakura` 作用域 CSS 切换显隐**」，代价是每页多几 KB 静态 HTML，换来零 FOUC、零 hydration。只有需要真交互的结构（如首页动效卡）才升级为 React island（那会引入 hydration 成本，逐个论证）。「非 sakura 字节级不变」的承诺相应修正为：**非 sakura 的可见渲染结果不变**（DOM 里多了隐藏的 sakura 结构，视觉与行为不变）。

## 4. 红线（必须原样保留）

1. **危险层脱离可爱风**：应急横幅 `--danger-deep` 红底白字不可关闭；DangerBox/禁忌卡=墨底+红描边+白标题；深色危险卡内 focus 环白色 3px。
2. **AA 对比体系**：白字实心粉底一律 `--sakura-pink-aa #C03070`；粉色正文 `--sakura-pink-text`（主题感知三态）；剂量数字/行内 code 锁 `#C02868`；红字永不落粉底（语义交给红左边框）。
3. `prefers-reduced-motion` 两处全局压制；全局 3px focus ring；按钮 min-height 48px；skip link。
4. 证据等级 A/B/C/X 语义色 + 「禁止稀有度/星级标注医学信息」。
5. 动效仅 transform+opacity（旧皮有 box-shadow/background 过渡灰区，换皮时收紧）。
6. 禁 blur、禁 clip-path 切角（米哈游元素已退役）、禁纯黑（墨=#4A2838）。

## 5. 已知陷阱（复核 agent 实证）

1. **b32 字体依赖**：blood-b32.css 的 Zen Maru Gothic/Klee One/Plus Jakarta Sans 只靠 `sakura-theme.css:15` 的 @import 加载 —— 改字体清单会让血检手账静默回退系统字体。
2. **token 对撞**：global.css 与 v2 CSS 有 29 个同名 :root token（--font-body/--space-*…）—— 换皮 CSS 必须保持 `html.sakura` 前缀纪律，仓库**无 postcss 管线**，加前缀是手工/脚本步骤，需建可重复流程。
3. **三套明暗机制**：Starlight 三态 select / sakura class / v2 yak_theme 月亮钮互不相认；v2 月亮钮 ≤720px 还被 display:none。**裁决：主站明暗唯一入口 = Starlight 三态 select**；v2 独立 shell（/zh/v2）保留自己的月亮钮不变。
4. **Starlight 版本锁**：选择器与 0.38.2 DOM 全部核对命中；依赖是 ^0.38.2，升版需重核（把本条写进升级 checklist）。
5. 断点不一致：v2 720/880/1080 vs Starlight 800/1152 —— 结构件 override 内统一用 Starlight 断点。

## 6. 性能顺手账（非阻塞，同 PR 可选）

- 三 sakura CSS + 字体 @import 对未开 sakura 用户也全量下载（perf-seo-audit-2026-05-26.md:155 挂账）——评估拆独立 stylesheet + 条件注入（有 FOUC 成本，需单独 spec 小节裁决）。

## 7. 测试与验收

- **现状零守护**：tests/ 三 spec 均只测默认皮。换皮 PR 需新增：sakura 态冒烟（toggle 后关键类生效）、sakura×dark 四象限截图、RTL（ar）一页、h2 序号仅 CJK 断言。
- 验收：zh/en/ar 三语 × light/dark × sakura开/关 12 组合截图过目；Lighthouse a11y ≥95 保持；对比度抽查（横幅/当前页导航/剂量 code）。
- 视觉基准：与 /zh/v2 预览页并排对比，文档页观感「一家人」。

## 8. 完整解剖报告存档

工作流全文（47k+ chars）：session `5ae5224c` 工作流 `wf_eca6839f-434` journal。关键数字：旧皮 2093 行 / v2 CSS 1322 行 / 76.4KB bundle / 17 语共 934 页（7 语 62 页、10 语 50 页）。
