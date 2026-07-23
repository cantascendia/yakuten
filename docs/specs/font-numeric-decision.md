# 数值字体（--font-hud）选型论证

日期：2026-07-23 ｜ 状态：**建议再换一次 —— Roboto Mono 实测是斜线零，没有修复 owner 的诉求**
验证方法：从 Google Fonts 实际下载各家族 latin woff2，用 fontTools 解析 `0` 字形轮廓并渲染成图逐一目检
（图存 scratchpad/fonts/specimen.png、finalists.png）。所有度量为 OS/2 表实测值，非文献转抄。

## 0. TL;DR

owner 不满 JetBrains Mono 的点零（dotted zero），本次已换成 Roboto Mono。但**实测 Roboto Mono 的零是
斜线零（slashed zero）**——`0` 字形 3 轮廓、内含贯穿斜杠，700 字重下肉眼明显（与 Wikipedia
"Slashed zero" 词条一致，实证确信度：已确认）。sakura-theme.css:155 注释「干净椭圆零」不成立。
若目标是「素椭圆零」，正确答案是 **Chivo Mono**（实测素零 + 同为 0.600em 字宽零回流风险 + 还省 6.5KB）。

## 1. 候选对比（zero 字形一列全部为实测轮廓+渲染目检，确信度=已确认，除非另注）

| 家族 | 零字形 | 字重 | Google Fonts | 许可 | x-height/em¹ | 0 宽/em | tnum | 判定 |
|---|---|---|---|---|---|---|---|---|
| Roboto Mono（现用） | **斜线零** | vf 100-700 | ✅ | Apache 2.0 | .528 | .600 | 等宽即表格 | ❌ 违背诉求本身 |
| JetBrains Mono（原用） | 点零 | vf 100-800 | ✅ | OFL | .550 | .600 | 同上 | ❌ owner 已否 |
| Noto Sans Mono | 斜线零 | vf 100-900 | ✅ | OFL | .536 | .600 | 同上 | ❌ |
| IBM Plex Mono | 点零（zero 特性=改斜线，无素零档） | 静态 100-700 | ✅ | OFL | .516 | .600 | 同上 | ❌ |
| DM Mono | 内部装饰（轮廓判为斜线，确信度中高） | 300/400/500 | ✅ | OFL | .496 | — | — | ❌ **无 700**，直接出局 |
| Space Mono | 大方点零 | 400/700 | ✅ | OFL | .496 | .612 | 同上 | ❌ 且无 500 |
| 系统栈 ui-monospace | 不可控：SF Mono/Menlo/Consolas=斜线、Cascadia=点（Wikipedia）；Android Roboto Mono=斜线（实测） | — | — | — | 因平台而异 | — | — | ❌ 主流平台默认全是装饰零 |
| **Chivo Mono（推荐）** | **素椭圆零** | vf 100-900+italic | ✅ | OFL | .511 | **.600** | ✅ | ✅ |
| Azeret Mono（备选） | 素椭圆零 | vf 100-900 | ✅ | OFL | .544（最贴 SC） | .650 | ✅ | ⚠️ 宽 8%，DOI 溢出风险 |
| Plus Jakarta Sans（零成本备选） | 素椭圆零 | vf 200-800（已加载） | ✅ | OFL | .536 | 比例宽 | ✅ | ⚠️ 失去 mono 观感 |

¹ 混排基准 Noto Sans SC latin 实测：x-height .543 / cap .733 / 数字高 .764。另筛并淘汰（均实测）：
Source Code Pro·Cousine·Overpass Mono·Spline Sans Mono=点零；Red Hat Mono·Fragment Mono·Geist Mono·PT Mono·Martian Mono=斜线零；Reddit Mono=点零。

## 2. 使用场景（grep `--font-hud`，26 个消费者文件）

剂量数值/E2 目标区间（DrugDetail/InjectTool）、血检区间与输入（BloodChecker）、日期与年份（Refs）、
DOI 字符串（DocScreen×6、RefsScreen）、引用角标 `[n]`（Primitives:683）、Q/D 序号、热线号码（Urgent）、
统计大数（HomeScreen N=4296）。需求画像：**数字零歧义 + tabular 可对齐 + 与中文行内不突兀**。
多处已设 `font-variant-numeric: tabular-nums`（Primitives:408、DrugDetail:52 等），等宽字体天然满足。
注意 RefsScreen:120 记录过 JetBrains 下 DOI 无断词点在 375px 溢出 38px 的事故——**字宽是布局风险参数**，
0.600em 之外的候选（Azeret 0.650）会加剧此风险；Chivo 与现字面宽完全一致，换字零回流。

## 3. 中文语境专项

- Noto Sans SC 自己的数字是**素零**（实测 2 轮廓）。正文数字素零、HUD 数字带斜线/点 → 同页两种零，
  视觉自相矛盾；owner 的反馈本质是「装饰零在中文阅读语境里像杂质」。（实测+推断，确信度高）
- 斜线零对本站尤其糟：医疗数值「50-100」里被划一道，易读成「作废/删除」记号，也与 Ø、8 添乱；
  点零则像表盘字。装饰零的价值（区分 0/O）只在代码场景成立，本站 HUD 场景 O 极少出现。（论证，确信度中高）
- 全角/半角混排：--font-hud 只接住 ASCII，汉字/全角标点回落 SC。数字高度差：SC .764 vs
  JetBrains .750（-2%）/ Roboto .731（-4%）/ Chivo .706（-7.6%）。Chivo 数字略小半号，混在中文行内
  更收敛，贴手账气质；若嫌小可对 .yk 数字场景微调 font-size，不建议全局 hack。（实测，确信度高）
- 「50-100 pg/mL」渲染目检（finalists.png）：Chivo 500/700 连字符、斜杠、单位小写均干净无歧义。

## 4. 加载成本（Google Fonts latin 子集 woff2，HEAD 实测字节）

| 文件 | 字节 | 说明 |
|---|---|---|
| Roboto Mono vf（500+700 同一文件） | 32,796 | 现状 sakura 页必下 |
| JetBrains Mono vf | 31,432 | 仍在 @import；sakura 下已无渲染者→浏览器不下载 |
| **Chivo Mono vf** | **26,336** | 替换后 sakura 页必下，**净省 6,460B（-20%）** |
| Azeret Mono vf / Plus Jakarta vf | 26,164 / 27,348 | 备选参考；PJS 已在载（增量 0） |

**b32 引用查证**：sakura-theme.css:157 注释称「JetBrains 保留在 @import 供 b32 按名引用」——**查证为假**。
blood-b32.css 全文无 JetBrains，数字用 `--b32-font-num: "Plus Jakarta Sans"`（:93-94，实测该字体
tnum=✅）。JetBrains 真正的残余消费者是**经典模式**代码块（global.css:72 --font-code 首名 +
starlight-override.css:53），以及 BloodTestRange/SplashNav 两处永不触发的 var() 兜底字面量。
处置：JetBrains 可继续留在 @import（经典模式代码块保真，sakura 用户零流量代价——无渲染即无下载），
但**注释必须改写**为真实理由；若愿接受经典代码块回落 Cascadia/Consolas，移除再省 ~0.5KB CSS。
另注：大陆用户若 fonts.googleapis 不可达，一切候选都回落系统 monospace（大陆 Windows≈Consolas=斜线零）
——这是全站字体架构共有的既存风险（SPEC 已录），不影响本次选型排序。

## 5. 结论与给 owner 的建议

**推荐：把 --font-hud 从 Roboto Mono 换成 Chivo Mono（wght 500;700），并修正 155-158 行注释。**

> 给 owner 的白话：这次换 Roboto Mono 其实没换对——我把字体文件拆开验了，Roboto Mono 的 0 中间有一道
> 斜杠，和你不喜欢的 JetBrains 那个点是同类装饰，只是形状不同，粗体下照样扎眼。全 Google Fonts 的主流
> 等宽体我实测筛了 16 个，零里面完全干净、又有 500/700 字重的等宽体基本只有 Chivo Mono（备选 Azeret
> Mono 更宽，会加重 DOI 溢出老毛病）。Chivo Mono 和现在的字一样宽（不会引起任何布局变化）、文件还小
> 20%、数字略小巧更贴手账风。建议直接换它；如果你其实不在意「等宽感」，零成本方案是用已经在载的
> Plus Jakarta Sans + tabular-nums（血检手账 b32 的数字就是它）。换完请你在 preview 里亲眼看一次
> 「50-100 pg/mL · 2026-07-23」再定稿。

落地 diff（另行实施）：sakura-theme.css:15 @import 中 `Roboto+Mono:wght@500;700` → `Chivo+Mono:wght@500;700`；
:158/:832 `--font-hud: "Chivo Mono", monospace`；:155-157 注释改为真实依据（本文档）。
v2/colors_and_type.css 为生产门控路由（404），可随 v2 下次同步再改，不阻塞。

## 6. 验证记录（可复现）

- 字形：curl 拉取 css2 → 下载 latin woff2 → fontTools RecordingPen 数轮廓 + matplotlib 填充渲染目检。
  素零=2 轮廓；点零=3 轮廓且第三块小而方；斜线零=3 轮廓且内含贯穿元素/双半腔。脚本存
  scratchpad/fonts/{glyphcheck,classify,render2}.py。
- 交叉源：Wikipedia "Slashed zero"（SF Mono/Menlo/Consolas=斜线、Plex/Source Code Pro/Cascadia=点）、
  JetBrains/JetBrainsMono#8（默认点零）、IBM/plex#248（默认非斜线）、Google Fonts 各 specimen 页（字重表）。
- 度量：OS/2 sxHeight/sCapHeight、hmtx advance、BoundsPen 数字包围盒；字节为 fonts.gstatic HEAD Content-Length。
